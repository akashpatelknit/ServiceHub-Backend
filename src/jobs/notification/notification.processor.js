import { AdminEvents } from '../../lib/realtime/adminEvents.js';
import { createNotification } from '../../controllers/notification/utils/createNotification.js';
import { logger } from '../../utils/index.js';

// Two distinct delivery paths, both needed: AdminEvents.emitNewBooking is the
// transient "toast + Live section" push for admins connected right now (lost on
// refresh — it's in-memory client state, not persisted). createNotification persists
// a Notification doc so it also shows up in the drawer's main paginated list
// (GET /notification, notification.controller.js#getAllNotifications) for any admin,
// online or not, past or future. Kept independent (own try/catch) so a failure in
// one — createNotification is picky about its inputs; see the userType comment
// below — can never silently swallow the other. No idempotency handling: a
// duplicate admin notification is harmless, so this stays deliberately dumb.
export async function notificationProcessor(job) {
  const { type, payload } = job.data;

  if (type === 'booking:new') {
    const serviceNames = Array.isArray(payload.serviceNames) ? payload.serviceNames.join(', ') : payload.serviceNames;

    try {
      await createNotification({
        title: 'New Booking Received',
        description: `${payload.customerName || 'A customer'} booked ${serviceNames} — ₹${payload.amount}.`,
        // createNotification only accepts 'vendor' | 'user' | 'admin' — anything else
        // (including the schema's own 'all' default) throws. This is admin-facing.
        userType: 'admin',
        category: 'booking',
        link: `/bookings/${payload.orderId}`,
      });
    } catch (error) {
      logger.error('Failed to persist booking notification', { orderId: payload.orderId, error: error.message });
    }

    AdminEvents.emitNewBooking(payload);
    return;
  }

  throw new Error(`Unknown notification type "${type}"`);
}
