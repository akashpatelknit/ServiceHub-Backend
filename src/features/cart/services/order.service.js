import { CustomerOrder } from '../../order-core/index.js';
import { ServiceOrderService } from '../../service-booking/index.js';
import { ProductOrderService } from '../../product-order/index.js';
import { ApiError } from '../../../utils/index.js';

// Mongoose discriminators let `.find()`/`.findOne()` on the base model return the
// correctly-shaped subtype, so cross-type list/detail/cancel can query CustomerOrder
// directly instead of duplicating logic per order type. The discriminator value is
// pinned to literal 'service'/'product' (see the model files), stored in the
// `orderType` field (base schema's discriminatorKey), so it can be filtered directly.
const delegateFor = (order) => (order.orderType === 'service' ? ServiceOrderService : ProductOrderService);

export const OrderService = {
  async list(userId, { page, limit, type }) {
    const filter = { user: userId };
    if (type) filter.orderType = type;

    const [items, total] = await Promise.all([
      CustomerOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CustomerOrder.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  },

  async getByOrderNumber(userId, orderNumber) {
    const order = await CustomerOrder.findOne({ orderNumber, user: userId });
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  },

  async cancel(userId, orderNumber) {
    const order = await this.getByOrderNumber(userId, orderNumber);
    return delegateFor(order).cancel(order, { id: userId, model: 'User' });
  },
};
