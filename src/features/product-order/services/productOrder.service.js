import { ProductOrder } from '../models/productOrder.model.js';
import { CustomerOrder, assertValidTransition } from '../../order-core/index.js';
import { PRODUCT_ORDER_STATUSES, PRODUCT_ORDER_TRANSITIONS, SHIPROCKET_STATUS_MAP } from '../constants/orderStatus.constants.js';
import { ShiprocketAdapter } from './shipping/ShiprocketAdapter.js';
import { ApiError } from '../../../utils/index.js';

const shippingProvider = new ShiprocketAdapter();

export const ProductOrderService = {
  // Called from cart/services/checkout.service.js inside the checkout transaction —
  // never invoked directly over HTTP. `items`/`addressSnapshot`/`totalAmount` are
  // already-snapshotted by the caller; this just persists them under a fresh order number.
  async createFromCheckout({ user, items, addressSnapshot, totalAmount, paymentId }, session) {
    const orderNumber = await CustomerOrder.generateOrderNumber('PRD');

    const [order] = await ProductOrder.create(
      [
        {
          orderNumber,
          user,
          paymentId,
          totalAmount,
          addressSnapshot,
          items,
          status: PRODUCT_ORDER_STATUSES.PENDING,
          statusHistory: [{ status: PRODUCT_ORDER_STATUSES.PENDING, changedAt: new Date(), changedByModel: 'User', changedBy: user }],
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
    assertValidTransition(PRODUCT_ORDER_TRANSITIONS, order.status, toStatus);
    order.status = toStatus;
    order.statusHistory.push({
      status: toStatus,
      changedAt: new Date(),
      changedBy: actor.id || null,
      changedByModel: actor.model || 'System',
    });

    // Packing is the natural point to hand the order to the carrier — order logic
    // only ever talks to the ShippingProvider interface, never Shiprocket directly.
    if (toStatus === PRODUCT_ORDER_STATUSES.PACKED) {
      const shipment = await shippingProvider.createShipment(order);
      order.trackingId = shipment.trackingId;
      order.awbNumber = shipment.awbNumber;
      order.courierName = shipment.courierName;
      order.shippingStatus = 'shipment-created';
    }

    await order.save();
    return order;
  },

  async cancel(order, actor) {
    return this.transitionStatus(order, PRODUCT_ORDER_STATUSES.CANCELLED, actor);
  },

  // Invoked by cart's PaymentEvents handler once the Razorpay webhook confirms capture.
  async markPaid(order) {
    order.paymentStatus = 'paid';
    if (order.status === PRODUCT_ORDER_STATUSES.PENDING) {
      return this.transitionStatus(order, PRODUCT_ORDER_STATUSES.CONFIRMED, { model: 'System' });
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

  // Called by the Shiprocket webhook controller — maps their status vocabulary onto
  // our shippingStatus enum and appends a statusHistory entry. Best-effort mapping;
  // see SHIPROCKET_STATUS_MAP for the caveat about unconfirmed payload shape.
  async handleShipmentStatusUpdate({ trackingId, rawStatus }) {
    const order = await ProductOrder.findOne({ trackingId });
    if (!order) throw new ApiError(404, `No product order found for tracking id ${trackingId}`);

    const shippingStatus = SHIPROCKET_STATUS_MAP[rawStatus] || 'pending';
    order.shippingStatus = shippingStatus;
    order.statusHistory.push({ status: `shipping:${shippingStatus}`, changedAt: new Date(), changedByModel: 'System' });

    if (shippingStatus === 'delivered' && order.status === PRODUCT_ORDER_STATUSES.SHIPPED) {
      order.status = PRODUCT_ORDER_STATUSES.DELIVERED;
      order.statusHistory.push({ status: PRODUCT_ORDER_STATUSES.DELIVERED, changedAt: new Date(), changedByModel: 'System' });
    } else if (shippingStatus === 'picked-up' && order.status === PRODUCT_ORDER_STATUSES.PACKED) {
      order.status = PRODUCT_ORDER_STATUSES.SHIPPED;
      order.statusHistory.push({ status: PRODUCT_ORDER_STATUSES.SHIPPED, changedAt: new Date(), changedByModel: 'System' });
    }

    await order.save();
    return order;
  },
};
