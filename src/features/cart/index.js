// Registers this module's PaymentEvents handler ('CustomerOrder') as a side effect of
// import — must happen before any Razorpay webhook can be processed. Safe to import
// once here since ES modules are cached/singleton.
import './services/paymentEventHandlers.js';

export { default } from './routes/index.js';
export { Cart } from './models/cart.model.js';
