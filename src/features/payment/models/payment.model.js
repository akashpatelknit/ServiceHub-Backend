import mongoose, { Schema } from 'mongoose';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

const attemptSchema = new Schema(
  {
    event: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    signatureValid: { type: Boolean, required: true },
  },
  { _id: false }
);

// One entry per refund call — distinct from `attempts` above (that's a webhook
// signature audit log). Populated by PaymentService.initiateRefund once the real
// gateway refund call succeeds; never written to speculatively.
const refundSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, default: null },
    status: { type: String, enum: ['processed', 'failed'], default: 'processed' },
    gatewayRefundId: { type: String, default: null },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Generic across purposes — this module doesn't know what a "CustomerOrder" is.
// `purposeType` is a dispatch key consumed by PaymentEvents (see
// services/paymentEvents.registry.js); other features register themselves against it
// without payment ever importing them. `purposeId` is an optional convenience ref for
// the common single-document case; left null for checkout, where one Payment can back
// two order documents (service + product) resolved instead via their shared paymentId.
const paymentSchema = new Schema(
  {
    purposeType: { type: String, required: true, index: true },
    purposeId: { type: Schema.Types.ObjectId, refPath: 'purposeType', default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'refunded'],
      default: 'created',
    },
    gateway: { type: String, default: 'razorpay' },
    gatewayOrderId: { type: String, unique: true, sparse: true },
    // Client-supplied dedup key for order creation (e.g. one per checkout attempt),
    // distinct from gatewayOrderId's uniqueness — that only prevents two Payment docs
    // from pointing at the same Razorpay order *after* Razorpay has assigned two
    // different order ids; this stops the duplicate creation itself. Sparse so
    // requests that don't pass one (any purposeType other than checkout, for now)
    // aren't forced into a null-collision — see createIntent for why it's omitted
    // rather than set to null when absent.
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    gatewayPaymentId: { type: String, default: null },
    gatewaySignature: { type: String, default: null },
    method: { type: String, default: null },
    // Webhook audit trail + idempotency guard — Razorpay retries delivery on any
    // non-2xx response, so the same event can legitimately arrive more than once.
    attempts: { type: [attemptSchema], default: [] },
    refunds: { type: [refundSchema], default: [] },
  },
  { timestamps: true }
);

paymentSchema.index({ purposeType: 1, purposeId: 1 });

export const Payment = mongoose.model(MODEL_NAMES.PAYMENT, paymentSchema);
