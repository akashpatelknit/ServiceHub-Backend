import crypto from 'crypto';
import razorpay from '../../../config/razorpay.config.js';
import config from '../../../config/config.js';
import { PaymentProvider } from './PaymentProvider.js';

export class RazorpayAdapter extends PaymentProvider {
  async createOrder({ amount, currency = 'INR', receipt, notes }) {
    // Razorpay expects the amount in the smallest currency unit (paise for INR).
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes,
    });
    return { gatewayOrderId: order.id };
  }

  // Verifies against the raw request bytes, not a re-serialized parsed body. The
  // legacy razorpayWebhook handler (src/controllers/payment/payment.controller.js)
  // signs JSON.stringify(req.body), which isn't guaranteed to match Razorpay's
  // original byte-for-byte payload (key order, whitespace) and can silently break
  // verification — this adapter requires the caller to pass the untouched raw buffer.
  verifyWebhookSignature(rawBody, signature) {
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return expected === signature;
  }

  // Client-side checkout.js success callback signature — a *different* scheme from
  // the webhook's (keyed on RAZORPAY_SECRET, the order/payment ids joined with "|",
  // not RAZORPAY_WEBHOOK_SECRET over the raw body). This is a UX convenience path
  // only; the webhook remains the source of truth for actually marking a payment paid.
  verifyPaymentSignature(gatewayOrderId, gatewayPaymentId, signature) {
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', config.RAZORPAY_SECRET)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');
    return expected === signature;
  }

  async fetchPayment(gatewayPaymentId) {
    return razorpay.payments.fetch(gatewayPaymentId);
  }

  async refund(gatewayPaymentId, amount) {
    return razorpay.payments.refund(gatewayPaymentId, amount ? { amount: Math.round(amount * 100) } : undefined);
  }
}
