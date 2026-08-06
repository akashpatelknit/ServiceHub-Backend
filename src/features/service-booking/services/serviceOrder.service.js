import { ServiceOrder } from '../models/serviceOrder.model.js';
import { CustomerOrder, assertValidTransition } from '../../order-core/index.js';
import { SERVICE_ORDER_STATUSES, SERVICE_ORDER_TRANSITIONS } from '../constants/orderStatus.constants.js';
import { Vendor } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';

export const ServiceOrderService = {
  // Called from cart/services/checkout.service.js inside the checkout transaction —
  // never invoked directly over HTTP. `items`/`addressSnapshot`/`totalAmount` are
  // already-snapshotted by the caller; this just persists them under a fresh order number.
  async createFromCheckout({ user, items, scheduledDate, scheduledSlot, addressSnapshot, totalAmount, paymentId }, session) {
    const orderNumber = await CustomerOrder.generateOrderNumber('SRV');

    const [order] = await ServiceOrder.create(
      [
        {
          orderNumber,
          user,
          paymentId,
          totalAmount,
          addressSnapshot,
          items,
          scheduledDate,
          scheduledSlot,
          status: SERVICE_ORDER_STATUSES.PENDING,
          statusHistory: [{ status: SERVICE_ORDER_STATUSES.PENDING, changedAt: new Date(), changedByModel: 'User', changedBy: user }],
        },
      ],
      { session }
    );

    return order;
  },

  // Single choke point for every status change — customer cancel, admin status PATCH,
  // and the payment-webhook auto-confirm all funnel through this so the transition
  // rules in orderStatus.constants.js are enforced no matter who's calling.
  async transitionStatus(order, toStatus, actor = {}) {
    assertValidTransition(SERVICE_ORDER_TRANSITIONS, order.status, toStatus);
    order.status = toStatus;
    order.statusHistory.push({
      status: toStatus,
      changedAt: new Date(),
      changedBy: actor.id || null,
      changedByModel: actor.model || 'System',
    });
    await order.save();
    return order;
  },

  async cancel(order, actor) {
    return this.transitionStatus(order, SERVICE_ORDER_STATUSES.CANCELLED, actor);
  },

  // Invoked by cart's PaymentEvents handler once the Razorpay webhook confirms capture.
  async markPaid(order) {
    order.paymentStatus = 'paid';
    if (order.status === SERVICE_ORDER_STATUSES.PENDING) {
      return this.transitionStatus(order, SERVICE_ORDER_STATUSES.CONFIRMED, { model: 'System' });
    }
    await order.save();
    return order;
  },

  async markPaymentFailed(order) {
    order.paymentStatus = 'failed';
    await order.save();
    return order;
  },

  // Invoked by cart's PaymentEvents handler once a refund is confirmed. Only flips
  // paymentStatus — refunding doesn't auto-cancel the order itself, that stays a
  // separate admin/customer decision via the normal status-transition flow.
  async markRefunded(order) {
    order.paymentStatus = 'refunded';
    await order.save();
    return order;
  },

  async assignVendor(orderId, vendorId, adminId) {
    const order = await ServiceOrder.findById(orderId);
    if (!order) throw new ApiError(404, 'Service order not found');

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    order.assignedVendor = vendorId;
    return this.transitionStatus(order, SERVICE_ORDER_STATUSES.ASSIGNED, { id: adminId, model: 'Admin' });
  },
};
