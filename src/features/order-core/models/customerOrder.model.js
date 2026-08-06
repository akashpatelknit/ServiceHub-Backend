import mongoose, { Schema } from 'mongoose';
import Counter from '../../../models/counter.model.js';
import { MODEL_NAMES } from '../constants/modelNames.constants.js';

const addressSnapshotSchema = new Schema(
  {
    fullAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    geolocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    label: { type: String },
  },
  { _id: false }
);

// Base schema shared by ServiceOrder and ProductOrder (Mongoose discriminators,
// keyed on `orderType`). Snapshots — never live refs — protect existing orders from
// later Service/Product/Address changes; see service-booking/product-order for the
// discriminator schemas that extend this with type-specific fields.
const customerOrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    // Both orders created from one checkout (service + product together) share the
    // same paymentId so they reconcile as one customer-facing transaction — see
    // features/payment. Not a hard ref target since one Payment can back two orders.
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    totalAmount: { type: Number, required: true, min: 0 },
    addressSnapshot: { type: addressSnapshotSchema, required: true },
  },
  { timestamps: true, discriminatorKey: 'orderType' }
);

customerOrderSchema.index({ paymentId: 1 });
customerOrderSchema.index({ user: 1, createdAt: -1 });

// Prefix differs by order type (SH-SRV-000123 / SH-PRD-000123) for easy visual
// identification in the admin panel. Same Counter-sequence idiom as the legacy
// Booking/Order models (src/models/counter.model.js), keyed per-prefix so service and
// product numbering run independently.
customerOrderSchema.statics.generateOrderNumber = async function (prefix) {
  const counter = await Counter.findOneAndUpdate(
    { name: `customer-order-${prefix.toLowerCase()}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `SH-${prefix}-${counter.seq.toString().padStart(6, '0')}`;
};

export const CustomerOrder = mongoose.model(MODEL_NAMES.CUSTOMER_ORDER, customerOrderSchema);
