// In-process pub/sub decoupling `payment` from whatever it's paying for. Features
// that create a Payment (cart's checkout, and any future purpose — wallet top-ups,
// memberships, ...) register a handler keyed by the same `purposeType` string they
// pass to PaymentService.createIntent(). This module never imports them back.
const handlers = new Map();

export const PaymentEvents = {
  register(purposeType, handler) {
    handlers.set(purposeType, handler);
  },

  async dispatchPaid(purposeType, payment) {
    const handler = handlers.get(purposeType);
    if (handler?.onPaid) await handler.onPaid(payment);
  },

  async dispatchFailed(purposeType, payment) {
    const handler = handlers.get(purposeType);
    if (handler?.onFailed) await handler.onFailed(payment);
  },

  async dispatchRefunded(purposeType, payment) {
    const handler = handlers.get(purposeType);
    if (handler?.onRefunded) await handler.onRefunded(payment);
  },
};
