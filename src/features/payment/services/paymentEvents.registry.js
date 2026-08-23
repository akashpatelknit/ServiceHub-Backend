// In-process pub/sub decoupling `payment` from whatever it's paying for. Features
// that create a Payment (cart's checkout, and any future purpose — wallet top-ups,
// memberships, ...) register a handler keyed by the same `purposeType` string they
// pass to PaymentService.createIntent(). This module never imports them back.
import { AdminEvents } from '../../../lib/realtime/adminEvents.js';

const handlers = new Map();

export const PaymentEvents = {
  register(purposeType, handler) {
    handlers.set(purposeType, handler);
  },

  // The admin live-notification emit lives here rather than in each dispatch
  // call site, so every purposeType gets it for free without callers having to
  // remember to wire it in separately.
  async dispatchPaid(purposeType, payment) {
    const handler = handlers.get(purposeType);
    if (handler?.onPaid) await handler.onPaid(payment);
    AdminEvents.emitPaymentEvent(payment, 'paid');
  },

  async dispatchFailed(purposeType, payment) {
    const handler = handlers.get(purposeType);
    if (handler?.onFailed) await handler.onFailed(payment);
    AdminEvents.emitPaymentEvent(payment, 'failed');
  },

  async dispatchRefunded(purposeType, payment) {
    const handler = handlers.get(purposeType);
    if (handler?.onRefunded) await handler.onRefunded(payment);
    AdminEvents.emitPaymentEvent(payment, 'refunded');
  },
};
