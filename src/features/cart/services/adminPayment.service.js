import { Payment, PaymentService } from '../../payment/index.js';
import { CustomerOrder } from '../../order-core/index.js';
import { User } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';

// `payment` deliberately doesn't know what a CustomerOrder or User is (see its own
// module comments) — this lives in `cart` instead, the module that already owns the
// cross-cutting admin order view, since resolving "which customer, which orders" for
// a payment means reaching into both CustomerOrder and User.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One Payment can back two orders (service + product from the same checkout) — see
// order-core/models/customerOrder.model.js — so this is a bulk reverse-lookup by
// paymentId, not a populate.
const attachLinkedOrders = async (payments) => {
  const paymentIds = payments.map((p) => p._id);
  const orders = await CustomerOrder.find({ paymentId: { $in: paymentIds } }).populate(
    'user',
    'firstName lastName email phoneNumber'
  );

  const ordersByPayment = new Map();
  for (const order of orders) {
    const key = order.paymentId.toString();
    if (!ordersByPayment.has(key)) ordersByPayment.set(key, []);
    ordersByPayment.get(key).push(order);
  }

  return payments.map((payment) => {
    const linkedOrders = ordersByPayment.get(payment._id.toString()) || [];
    return {
      ...payment.toObject(),
      customer: linkedOrders[0]?.user || null,
      linkedOrders: linkedOrders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        itemCount: order.items?.length || 0,
        totalAmount: order.totalAmount,
      })),
    };
  });
};

export const AdminPaymentService = {
  async list({ page, limit, status, dateFrom, dateTo, search }) {
    const filter = {};
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

      const matchingOrders = await CustomerOrder.find({
        $or: [{ orderNumber: { $regex: safeSearch, $options: 'i' } }, { user: { $in: matchingUsers.map((u) => u._id) } }],
      }).select('paymentId');

      filter.$or = [
        { gatewayOrderId: { $regex: safeSearch, $options: 'i' } },
        { gatewayPaymentId: { $regex: safeSearch, $options: 'i' } },
        { _id: { $in: matchingOrders.map((o) => o.paymentId).filter(Boolean) } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return { items: await attachLinkedOrders(payments), total, page, limit };
  },

  async getById(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new ApiError(404, 'Payment not found');
    const [hydrated] = await attachLinkedOrders([payment]);
    return hydrated;
  },

  // Thin pass-through to the real refund logic in features/payment — this module adds
  // no financial behavior of its own, just the admin-facing HTTP surface + actor id.
  async refund(paymentId, { amount, reason }, adminId) {
    return PaymentService.initiateRefund(paymentId, { amount, reason, initiatedBy: adminId });
  },
};
