import { CustomerOrder } from '../../order-core/index.js';
import { ServiceOrderService, SERVICE_ORDER_TRANSITIONS } from '../../service-booking/index.js';
import { ProductOrderService, PRODUCT_ORDER_TRANSITIONS } from '../../product-order/index.js';
import { User } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';

const delegateFor = (order) => (order.orderType === 'service' ? ServiceOrderService : ProductOrderService);
const transitionsFor = (order) => (order.orderType === 'service' ? SERVICE_ORDER_TRANSITIONS : PRODUCT_ORDER_TRANSITIONS);

// Attached to every order the admin API returns so the frontend never has to
// duplicate the transition state machine — it just renders whatever's in this list
// (empty array means terminal status, e.g. completed/cancelled/delivered/returned).
const withAllowedNextStatuses = (order) => ({
  ...order.toObject(),
  allowedNextStatuses: transitionsFor(order)[order.status] || [],
});

// $regex is built from admin-supplied free text — escape regex metacharacters so an
// unbalanced paren/bracket can't 500 the endpoint (and isn't a ReDoS surface).
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const AdminOrderService = {
  async list({ page, limit, type, status, dateFrom, dateTo, search }) {
    const filter = {};
    if (type) filter.orderType = type;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = dateFrom;
      if (dateTo) filter.createdAt.$lte = dateTo;
    }

    if (search) {
      const safeSearch = escapeRegExp(search);
      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: safeSearch, $options: 'i' } },
          { lastName: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [{ orderNumber: { $regex: safeSearch, $options: 'i' } }, { user: { $in: matchingUsers.map((u) => u._id) } }];
    }

    // `assignedVendor` only exists on the ServiceOrder discriminator schema — Mongoose
    // populate no-ops on ProductOrder docs in the same result set rather than erroring.
    const [items, total] = await Promise.all([
      CustomerOrder.find(filter)
        .populate('user', 'firstName lastName email phoneNumber')
        .populate('assignedVendor', 'firstName lastName phoneNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CustomerOrder.countDocuments(filter),
    ]);

    return { items: items.map(withAllowedNextStatuses), total, page, limit };
  },

  async getById(orderId) {
    // statusHistory.changedBy is a dynamic refPath (User/Vendor/Admin per entry,
    // null for System-attributed entries) — Mongoose resolves the right model per
    // subdocument automatically. Only populated on the single-order fetch, not
    // list(), since the list table never renders the timeline.
    const order = await CustomerOrder.findById(orderId)
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('assignedVendor', 'firstName lastName phoneNumber')
      .populate('statusHistory.changedBy', 'firstName lastName email');
    if (!order) throw new ApiError(404, 'Order not found');
    return withAllowedNextStatuses(order);
  },

  async updateStatus(orderId, status, adminId) {
    const order = await CustomerOrder.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    return delegateFor(order).transitionStatus(order, status, { id: adminId, model: 'Admin' });
  },
};
