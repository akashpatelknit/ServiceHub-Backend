// No authenticated routes of its own — customer-facing list/detail/cancel and the
// generic admin list/detail/status-update live in `cart` (queries the shared
// CustomerOrder base model, delegates transitions back here). The only HTTP surface
// owned here is the Shiprocket webhook, mounted specially in app.js (raw body).
export { ProductOrder } from './models/productOrder.model.js';
export { ProductOrderService } from './services/productOrder.service.js';
export {
  PRODUCT_ORDER_STATUSES,
  PRODUCT_ORDER_TRANSITIONS,
  PRODUCT_ORDER_MODEL_NAME,
} from './constants/orderStatus.constants.js';
export { default as productOrderWebhookRoutes } from './routes/webhook.routes.js';
