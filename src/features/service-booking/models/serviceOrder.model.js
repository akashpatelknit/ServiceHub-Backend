import { Schema } from 'mongoose';
import { CustomerOrder } from '../../order-core/index.js';
import { SERVICE_ORDER_MODEL_NAME, SERVICE_ORDER_STATUSES } from '../constants/orderStatus.constants.js';

const addonSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const serviceOrderItemSchema = new Schema(
  {
    // Reference kept for analytics/filtering only — display always reads the
    // snapshot fields below, never re-populates this.
    serviceId: { type: Schema.Types.ObjectId, ref: 'CatalogService', required: true },
    serviceNameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    durationSnapshot: { type: Number, required: true, min: 1 },
    addonsSnapshot: { type: [addonSnapshotSchema], default: [] },
  },
  { _id: false }
);

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, refPath: 'statusHistory.changedByModel' },
    changedByModel: { type: String, enum: ['User', 'Vendor', 'Admin', 'System'] },
  },
  { _id: false }
);

const serviceOrderSchema = new Schema({
  items: {
    type: [serviceOrderItemSchema],
    required: true,
    validate: [(v) => v.length > 0, 'At least one item is required'],
  },
  scheduledDate: { type: Date, required: true },
  scheduledSlot: { type: String, required: true },
  assignedVendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
  status: {
    type: String,
    enum: Object.values(SERVICE_ORDER_STATUSES),
    default: SERVICE_ORDER_STATUSES.PENDING,
  },
  statusHistory: { type: [statusHistoryEntrySchema], default: [] },
});

// Third arg pins the discriminatorKey (`orderType`) value to 'service' — matching the
// spec's `orderType: 'service' | 'product'` — independent of the model name, which
// has to be `ServiceOrder` (not `Service`/`Order`) to dodge legacy collisions.
export const ServiceOrder = CustomerOrder.discriminator(SERVICE_ORDER_MODEL_NAME, serviceOrderSchema, 'service');
