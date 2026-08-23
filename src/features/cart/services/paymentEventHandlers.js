import { PaymentEvents } from '../../payment/index.js';
import { CustomerOrder } from '../../order-core/index.js';
import { ServiceOrderService, calculateDelayUntilReminder } from '../../service-booking/index.js';
import { ProductOrderService } from '../../product-order/index.js';
import { User } from '../../../core/models/index.js';
import { queues } from '../../../lib/queue/queues.js';
import { logger } from '../../../utils/index.js';

const delegateFor = (order) => (order.orderType === 'service' ? ServiceOrderService : ProductOrderService);

const itemsLabelFor = (order) =>
  order.orderType === 'service'
    ? order.items.map((item) => item.serviceNameSnapshot).join(', ')
    : order.items.map((item) => `${item.productNameSnapshot} x${item.quantity}`).join(', ');

// Best-effort — payment is already captured and orders already marked paid by the time
// this runs, so a failed enqueue must never surface as an error here. Queueing (instead
// of calling emailProvider.send directly) means a transient failure gets BullMQ's retry
// policy instead of being silently dropped.
async function enqueueOrderConfirmationEmail(orders, user) {
  if (orders.length === 0 || !user?.email) return;

  await queues.email.add('send-confirmation', {
    to: user.email,
    template: 'confirmation',
    templateData: {
      customerName: user.firstName,
      orders: orders.map((order) => ({ orderNumber: order.orderNumber, itemsLabel: itemsLabelFor(order), amount: order.totalAmount })),
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    },
    // Sibling of templateData, not part of it — keeps templateData matching
    // orderConfirmationTemplate's input shape exactly. Only service orders carry
    // confirmationEmailSentAt, so this only lists those (see email.processor.js).
    serviceOrderNumbers: orders.filter((order) => order.orderType === 'service').map((order) => order.orderNumber),
  });
}

// Invoice/notification/reminder are service-order-specific concepts today —
// ServiceOrder owns invoiceUrl/reminderJobId, product orders have no equivalent yet —
// so this only loops over the service orders in the batch. Independent of whether the
// customer has an email on file (unlike the confirmation email above): invoice
// generation and the admin notification don't depend on it, and the reminder job
// itself no-ops at send time if there's no email (see reminder.processor.js).
async function enqueueServiceOrderJobs(orders, user) {
  const serviceOrders = orders.filter((order) => order.orderType === 'service');

  for (const order of serviceOrders) {
    await queues.invoice.add('generate-invoice', { orderNumber: order.orderNumber });

    await queues.notification.add('booking-new', {
      type: 'booking:new',
      payload: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: user?.firstName,
        // Array, not itemsLabelFor's joined string — the frontend's bookingNew
        // template does its own `.join(', ')` (see AdminNotifications.jsx).
        serviceNames: order.items.map((item) => item.serviceNameSnapshot),
        amount: order.totalAmount,
        createdAt: order.createdAt,
      },
    });

    const delay = calculateDelayUntilReminder(order.scheduledDate, order.scheduledSlot);
    if (delay !== null) {
      const job = await queues.reminder.add('send-reminder', { orderNumber: order.orderNumber }, { delay });
      order.reminderJobId = job.id;
      await order.save();
    }
  }
}

// Side-effect module — importing it (see cart/index.js) registers this handler with
// `payment` exactly once at server startup. `payment` never imports `cart` back; this
// is the only place that connects "a Razorpay payment got captured" to "mark the
// matching order(s) confirmed". One Payment can back two order docs (service +
// product from the same checkout), which is why this resolves by shared paymentId
// rather than a single purposeId — see order-core/models/customerOrder.model.js.
PaymentEvents.register('CustomerOrder', {
  async onPaid(payment) {
    const orders = await CustomerOrder.find({ paymentId: payment._id });
    await Promise.all(orders.map((order) => delegateFor(order).markPaid(order)));

    if (orders.length === 0) return;

    const user = await User.findById(orders[0].user).select('email firstName').lean();

    try {
      await enqueueOrderConfirmationEmail(orders, user);
    } catch (error) {
      logger.error('Order confirmation email enqueue threw unexpectedly', { paymentId: payment._id, error: error.message });
    }

    try {
      await enqueueServiceOrderJobs(orders, user);
    } catch (error) {
      logger.error('Service-order job enqueue threw unexpectedly', { paymentId: payment._id, error: error.message });
    }
  },

  async onFailed(payment) {
    const orders = await CustomerOrder.find({ paymentId: payment._id });
    await Promise.all(orders.map((order) => delegateFor(order).markPaymentFailed(order)));
  },

  async onRefunded(payment) {
    const orders = await CustomerOrder.find({ paymentId: payment._id });
    await Promise.all(orders.map((order) => delegateFor(order).markRefunded(order)));
  },
});
