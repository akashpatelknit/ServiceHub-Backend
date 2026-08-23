import { ServiceOrder } from '../../features/service-booking/models/serviceOrder.model.js';
import { SERVICE_ORDER_STATUSES } from '../../features/service-booking/constants/orderStatus.constants.js';
import { User } from '../../core/models/index.js';
import { emailProvider } from '../../lib/email/index.js';
import { serviceReminderTemplate } from '../../lib/email/templates/serviceReminder.template.js';
import { logger } from '../../utils/index.js';

// No SMS channel is wired in for customer-facing sends today — smsService.js exists
// but is only used for OTP delivery, and SmsVendorNotificationAdapter only notifies
// vendors, not customers. Email-only until a customer SMS flow exists.
export async function reminderProcessor(job) {
  const { orderNumber } = job.data;

  const order = await ServiceOrder.findOne({ orderNumber });
  if (!order) {
    logger.warn('Reminder skipped — order not found', { jobId: job.id, orderNumber });
    return { skipped: true, reason: 'order-not-found' };
  }

  // Belt-and-suspenders: cancellation is expected to call queues.reminder.remove() to
  // pull this job before it ever fires. This re-check covers the case where that
  // removal didn't happen (job already picked up by a worker, removal call failed, etc).
  if (order.status === SERVICE_ORDER_STATUSES.CANCELLED) {
    logger.info('Reminder skipped — order was cancelled', { jobId: job.id, orderNumber });
    return { skipped: true, reason: 'order-cancelled' };
  }

  const user = await User.findById(order.user).select('firstName email').lean();
  if (!user?.email) {
    logger.warn('Reminder skipped — no email on file', { jobId: job.id, orderNumber });
    return { skipped: true, reason: 'no-email' };
  }

  const { subject, html, text } = serviceReminderTemplate({
    customerName: user.firstName,
    orderNumber: order.orderNumber,
    serviceNames: order.items.map((item) => item.serviceNameSnapshot).join(', '),
    scheduledDateLabel: order.scheduledDate.toDateString(),
    scheduledSlot: order.scheduledSlot,
  });

  const result = await emailProvider.send({ to: user.email, subject, html, text });
  if (!result.success) {
    throw new Error(`Reminder email send failed: ${result.reason}`);
  }

  return { messageId: result.messageId };
}
