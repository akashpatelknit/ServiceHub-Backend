import { ServiceOrder } from '../models/serviceOrder.model.js';
import { CustomerOrder, assertValidTransition } from '../../order-core/index.js';
import { SERVICE_ORDER_STATUSES, SERVICE_ORDER_TRANSITIONS } from '../constants/orderStatus.constants.js';
import { Vendor } from '../../../core/models/index.js';
import { ApiError, logger } from '../../../utils/index.js';
import { VendorCandidateService } from './vendorCandidate.service.js';
import { SmsVendorNotificationAdapter } from '../providers/SmsVendorNotificationAdapter.js';
import { queues } from '../../../lib/queue/queues.js';

const notificationProvider = new SmsVendorNotificationAdapter();

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

    // Primary safeguard against a reminder firing for a since-cancelled booking —
    // reminder.processor.js re-checks order.status at send time as a second,
    // belt-and-suspenders layer in case this removal doesn't happen (e.g. the job
    // already left the delayed set and is being processed right now).
    if (toStatus === SERVICE_ORDER_STATUSES.CANCELLED && order.reminderJobId) {
      try {
        await queues.reminder.remove(order.reminderJobId);
      } catch (error) {
        logger.error('Failed to remove pending reminder job on cancel', {
          orderId: order._id,
          reminderJobId: order.reminderJobId,
          error: error.message,
        });
      }
      order.reminderJobId = null;
    }

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

    // Re-checked here rather than trusting the admin UI's candidate list, which may be
    // stale by the time this request lands (vendor went offline/blocked/lost KYC since).
    await VendorCandidateService.assertVendorEligible(order, vendorId);

    order.assignedVendor = vendorId;
    const updatedOrder = await this.transitionStatus(order, SERVICE_ORDER_STATUSES.ASSIGNED, { id: adminId, model: 'Admin' });

    // Best-effort: the assignment is already committed, so a notification failure
    // shouldn't fail this request or roll back the assignment.
    const jobInfo = {
      serviceNames: order.items.map((item) => item.serviceNameSnapshot).join(', '),
      scheduledDateLabel: order.scheduledDate.toDateString(),
      scheduledSlot: order.scheduledSlot,
      // Area/pincode only — never the full address or customer contact, until a
      // vendor app with an accept flow exists.
      areaLabel: `${order.addressSnapshot.city} ${order.addressSnapshot.pincode}`,
    };

    try {
      await notificationProvider.notifyAssignment(vendor, jobInfo);
    } catch (error) {
      logger.error('Vendor assignment SMS threw unexpectedly', { orderId, vendorId, error: error.message });
    }

    if (vendor.email) {
      try {
        await queues.email.add('send-vendor-assignment', {
          to: vendor.email,
          template: 'vendorAssignment',
          templateData: { vendorName: vendor.fullName, orderNumber: order.orderNumber, ...jobInfo },
        });
      } catch (error) {
        logger.error('Vendor assignment email enqueue threw unexpectedly', { orderId, vendorId, error: error.message });
      }
    }

    return updatedOrder;
  },
};
