import { Payment } from '../models/payment.model.js';
import { RazorpayAdapter } from '../providers/RazorpayAdapter.js';
import { PaymentEvents } from './paymentEvents.registry.js';
import { ApiError, logger } from '../../../utils/index.js';
import config from '../../../config/config.js';

const provider = new RazorpayAdapter();

export const PaymentService = {
  async createIntent({ purposeType, purposeId = null, amount, receipt, notes, idempotencyKey = null }) {
    // Duplicate-submission guard (double-tapped checkout, retry-on-timeout, etc.) —
    // gatewayOrderId's unique constraint only catches this AFTER two separate
    // Razorpay orders already exist; this stops the second createOrder call entirely.
    if (idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey });
      if (existing) {
        return {
          payment: existing,
          gatewayOrderId: existing.gatewayOrderId,
          keyId: config.RAZORPAY_KEY_ID,
          amount: existing.amount,
          currency: existing.currency,
        };
      }
    }

    const { gatewayOrderId } = await provider.createOrder({ amount, receipt, notes });

    let payment;
    try {
      payment = await Payment.create({
        purposeType,
        purposeId,
        amount,
        gatewayOrderId,
        // Omitted entirely (not set to null) when absent — the field is `sparse`,
        // and a sparse unique index still indexes explicit nulls, so writing
        // `idempotencyKey: null` on every non-checkout Payment would collide on
        // that shared null the moment a second one was created.
        ...(idempotencyKey ? { idempotencyKey } : {}),
      });
    } catch (err) {
      // Lost the race: another concurrent request with the same idempotencyKey
      // inserted first and the unique index rejected this one. Fall back to
      // returning the record that won instead of surfacing a raw duplicate-key
      // error — the orphaned Razorpay order created just above is harmless (never
      // gets paid, costs nothing), same as the existing orphan case in
      // checkout.service.js.
      if (idempotencyKey && err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
        const winner = await Payment.findOne({ idempotencyKey });
        if (winner) {
          return {
            payment: winner,
            gatewayOrderId: winner.gatewayOrderId,
            keyId: config.RAZORPAY_KEY_ID,
            amount: winner.amount,
            currency: winner.currency,
          };
        }
      }
      throw err;
    }

    return { payment, gatewayOrderId, keyId: config.RAZORPAY_KEY_ID, amount, currency: 'INR' };
  },

  // Idempotent — Razorpay retries webhook delivery on any non-2xx/timeout response,
  // so the same event can legitimately arrive more than once for the same payment.
  // `rawBody` must be the untouched request buffer (see routes/webhook.routes.js).
  async handleWebhookEvent(rawBody, signature) {
    const signatureValid = provider.verifyWebhookSignature(rawBody, signature);
    if (!signatureValid) {
      throw new ApiError(400, 'Invalid webhook signature');
    }

    const body = JSON.parse(rawBody.toString('utf8'));
    const { event, payload } = body;
    const paymentEntity = payload?.payment?.entity;
    if (!paymentEntity?.order_id) {
      throw new ApiError(400, 'Malformed webhook payload');
    }

    const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
    if (!payment) {
      throw new ApiError(404, `No payment found for gateway order ${paymentEntity.order_id}`);
    }

    const attemptEntry = { event, signatureValid };
    const fieldUpdates = {
      gatewayPaymentId: paymentEntity.id,
      gatewaySignature: signature,
      method: paymentEntity.method || payment.method,
    };

    if (event === 'payment.captured' || event === 'payment.failed') {
      const nextStatus = event === 'payment.captured' ? 'paid' : 'failed';

      // Atomic check-and-set: the "still non-terminal?" check and the write to
      // 'paid'/'failed' happen as ONE indivisible DB operation. Two concurrent
      // deliveries (or this webhook racing verifyPayment below) can no longer both
      // observe "not yet terminal" and both proceed — only whichever call the DB
      // applies first actually flips the status; the loser gets `null` back.
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $nin: ['paid', 'failed'] } },
        { $set: { status: nextStatus, ...fieldUpdates }, $push: { attempts: attemptEntry } },
        { new: true }
      );

      if (!updated) {
        // We already loaded `payment` above by _id, so a null result here means we
        // lost the race (someone else finalized it first) — not a missing document.
        // Still record this delivery attempt for audit visibility even though the
        // status write itself is a no-op; a separate $push since the conditional
        // update above didn't apply.
        const logged = await Payment.findByIdAndUpdate(payment._id, { $push: { attempts: attemptEntry } }, { new: true });
        if (!logged) {
          logger.error(`Webhook event "${event}" for payment ${payment._id} could not be logged — payment no longer exists`);
        }
        return logged || payment;
      }

      // Only the call that actually won the atomic update reaches here, so onPaid/
      // onFailed fires exactly once per real payment event.
      if (nextStatus === 'paid') {
        await PaymentEvents.dispatchPaid(updated.purposeType, updated);
      } else {
        await PaymentEvents.dispatchFailed(updated.purposeType, updated);
      }

      return updated;
    }

    // Unrecognized/irrelevant event type (e.g. order.paid, refund.*) — logged via
    // the attempts array but not acted on until a handler is needed for it. No
    // status transition here, so there's no terminal-state race to guard against.
    const updated = await Payment.findByIdAndUpdate(
      payment._id,
      { $set: fieldUpdates, $push: { attempts: attemptEntry } },
      { new: true }
    );
    return updated || payment;
  },

  // Client-side checkout.js success callback, sent here for instant UX feedback.
  // The webhook above remains the source of truth (server-to-server, can't be
  // spoofed the way a client callback can) — both paths independently transition
  // status='paid' and are idempotent against each other, whichever arrives first.
  async verifyPayment({ gatewayOrderId, gatewayPaymentId, gatewaySignature }) {
    const payment = await Payment.findOne({ gatewayOrderId });
    if (!payment) {
      throw new ApiError(404, `No payment found for gateway order ${gatewayOrderId}`);
    }

    // Already terminal (via webhook or a prior verify call) — cheap no-op so a
    // duplicate/retried verify call skips signature verification entirely. This
    // read is just an optimization, not the race guard: if we lose a race between
    // this check and another call's write, the atomic update below still catches it.
    if (payment.status === 'paid' || payment.status === 'failed') {
      return payment;
    }

    const signatureValid = provider.verifyPaymentSignature(gatewayOrderId, gatewayPaymentId, gatewaySignature);
    if (!signatureValid) {
      throw new ApiError(400, 'Invalid payment signature');
    }

    // Atomic check-and-set — same race as the webhook path above: two concurrent
    // verify calls, or this racing the webhook, could otherwise both pass the
    // terminal check above before either had saved, and both dispatch onPaid.
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $nin: ['paid', 'failed'] } },
      { $set: { status: 'paid', gatewayPaymentId, gatewaySignature } },
      { new: true }
    );

    if (!updated) {
      // Lost the race — the webhook (or a concurrent verify call) already
      // finalized this payment; whichever call won already dispatched onPaid.
      return await Payment.findById(payment._id);
    }

    await PaymentEvents.dispatchPaid(updated.purposeType, updated);

    return updated;
  },

  // `amount` omitted means a full refund of whatever's still refundable. `initiatedBy`
  // is the admin's _id, recorded on the refund entry for audit purposes.
  //
  // Status note: any successful refund — full or partial — moves `payment.status`
  // straight to 'refunded' (matching the original implementation here), rather than
  // staying 'paid' until the full amount is refunded. That means a ₹50 partial refund
  // on a ₹5000 payment marks the whole payment (and both linked orders' paymentStatus,
  // via PaymentEvents.dispatchRefunded) as "Refunded" even though ₹4950 was actually
  // kept. Left as-is rather than silently changed; flagging it here since it's a real
  // product decision — worth revisiting if partial refunds become common.
  async initiateRefund(paymentId, { amount, reason, initiatedBy } = {}) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }
    if (payment.status !== 'paid') {
      throw new ApiError(409, `Cannot refund a payment with status "${payment.status}"`);
    }

    const alreadyRefunded = payment.refunds.filter((r) => r.status === 'processed').reduce((sum, r) => sum + r.amount, 0);
    const remaining = payment.amount - alreadyRefunded;
    const refundAmount = amount ?? remaining;

    if (refundAmount <= 0 || refundAmount > remaining) {
      throw new ApiError(400, `Refund amount must be between ₹1 and the remaining refundable balance of ₹${remaining}`);
    }

    logger.info(`Refund initiated for payment ${payment._id}: ₹${refundAmount} — ${reason || '(no reason given)'}`);

    // Real gateway call — this is what actually moves money, not just a status flip.
    // Its response carries Razorpay's own refund id, persisted below for audit/support.
    const gatewayRefund = await provider.refund(payment.gatewayPaymentId, refundAmount);

    payment.refunds.push({
      amount: refundAmount,
      reason: reason || null,
      status: 'processed',
      gatewayRefundId: gatewayRefund?.id || null,
      initiatedBy: initiatedBy || null,
    });
    payment.status = 'refunded';
    await payment.save();
    await PaymentEvents.dispatchRefunded(payment.purposeType, payment);

    return payment;
  },
};
