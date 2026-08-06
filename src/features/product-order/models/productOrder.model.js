import { Schema } from 'mongoose';
import { CustomerOrder } from '../../order-core/index.js';
import { PRODUCT_ORDER_MODEL_NAME, PRODUCT_ORDER_STATUSES, SHIPPING_STATUSES } from '../constants/orderStatus.constants.js';

const productOrderItemSchema = new Schema(
  {
    // Reference kept for analytics/filtering only — display always reads the
    // snapshot fields below, never re-populates this.
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productNameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
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

const productOrderSchema = new Schema({
  items: {
    type: [productOrderItemSchema],
    required: true,
    validate: [(v) => v.length > 0, 'At least one item is required'],
  },
  // Structure-only for now — see services/shipping/ShippingProvider.js. Never call a
  // carrier's API directly from order logic; go through the interface.
  shippingProvider: { type: String, default: 'shiprocket' },
  trackingId: { type: String, default: null },
  awbNumber: { type: String, default: null },
  courierName: { type: String, default: null },
  shippingStatus: { type: String, enum: SHIPPING_STATUSES, default: 'pending' },
  status: {
    type: String,
    enum: Object.values(PRODUCT_ORDER_STATUSES),
    default: PRODUCT_ORDER_STATUSES.PENDING,
  },
  statusHistory: { type: [statusHistoryEntrySchema], default: [] },
});

// Third arg pins the discriminatorKey (`orderType`) value to 'product' — see the
// matching comment in service-booking/models/serviceOrder.model.js.
export const ProductOrder = CustomerOrder.discriminator(PRODUCT_ORDER_MODEL_NAME, productOrderSchema, 'product');
