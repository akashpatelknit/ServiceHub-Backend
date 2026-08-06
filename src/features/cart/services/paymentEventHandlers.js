import { PaymentEvents } from '../../payment/index.js';
import { CustomerOrder } from '../../order-core/index.js';
import { ServiceOrderService } from '../../service-booking/index.js';
import { ProductOrderService } from '../../product-order/index.js';

const delegateFor = (order) => (order.orderType === 'service' ? ServiceOrderService : ProductOrderService);

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
