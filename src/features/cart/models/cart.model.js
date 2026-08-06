import mongoose, { Schema } from 'mongoose';

// `refId` intentionally has no `ref`/`refPath` — `itemType` holds 'service'/'product',
// which don't match the actual registered model names (CatalogService/Product), so
// resolution happens manually in cart.service.js instead of via Mongoose populate.
const cartItemSchema = new Schema({
  itemType: { type: String, enum: ['service', 'product'], required: true },
  refId: { type: Schema.Types.ObjectId, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  // Services only — validated against the referenced service in cart.service.js.
  selectedAddons: { type: [Schema.Types.ObjectId], ref: 'CatalogAddOn', default: [] },
  addedAt: { type: Date, default: Date.now },
});

// One active cart per user (findOrCreate pattern in cart.service.js) — cart is never
// a snapshot, GET /cart always re-reads live Service/Product data for display.
const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Cart = mongoose.model('Cart', cartSchema);
