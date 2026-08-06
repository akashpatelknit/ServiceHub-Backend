import { Payment } from '../models/payment.model.js';
import { RazorpayAdapter } from '../providers/RazorpayAdapter.js';
import { PaymentEvents } from './paymentEvents.registry.js';
import { ApiError, logger } from '../../../utils/index.js';
import config from '../../../config/config.js';

const provider = new RazorpayAdapter();

export const PaymentService = {
  async createIntent({ purposeType, purposeId = null, amount, receipt, notes }) {
    const { gatewayOrderId } = await provider.createOrder({ amount, receipt, notes });

    const payment = await Payment.create({
      purposeType,
      purposeId,
      amount,
      gatewayOrderId,
    });

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

    // Already terminal — ack without reprocessing so a retried delivery can't
    // double-fire order confirmation/cancellation side effects.
    if (payment.status === 'paid' || payment.status === 'failed') {
      payment.attempts.push({ event, signatureValid });
      await payment.save();
      return payment;
    }

    payment.attempts.push({ event, signatureValid });
    payment.gatewayPaymentId = paymentEntity.id;
    payment.gatewaySignature = signature;
    payment.method = paymentEntity.method || payment.method;

    if (event === 'payment.captured') {
      payment.status = 'paid';
      await payment.save();
      await PaymentEvents.dispatchPaid(payment.purposeType, payment);
    } else if (event === 'payment.failed') {
      payment.status = 'failed';
      await payment.save();
      await PaymentEvents.dispatchFailed(payment.purposeType, payment);
    } else {
      // Unrecognized/irrelevant event type (e.g. order.paid, refund.*) — logged via
      // the attempts array above but not acted on until a handler is needed for it.
      await payment.save();
    }

    return payment;
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

    // Already terminal (via webhook or a prior verify call) — no-op, mirrors the
    // webhook handler's idempotency so a duplicate/retried verify call can't
    // double-fire onPaid/onFailed side effects.
    if (payment.status === 'paid' || payment.status === 'failed') {
      return payment;
    }

    const signatureValid = provider.verifyPaymentSignature(gatewayOrderId, gatewayPaymentId, gatewaySignature);
    if (!signatureValid) {
      throw new ApiError(400, 'Invalid payment signature');
    }

    payment.status = 'paid';
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature;
    await payment.save();
    await PaymentEvents.dispatchPaid(payment.purposeType, payment);

    return payment;
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
