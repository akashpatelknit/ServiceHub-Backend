import { Router } from 'express';
import cartRoutes from './cart.routes.js';
import checkoutRoutes from './checkout.routes.js';
import orderRoutes from './order.routes.js';
import adminOrderRoutes from './adminOrder.routes.js';
import adminPaymentRoutes from './adminPayment.routes.js';

const router = Router();

router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/admin/orders', adminOrderRoutes);
// Payments reconciled as one transaction across both order types — see
// adminPayment.service.js for why this lives here rather than in features/payment.
router.use('/admin/payments', adminPaymentRoutes);

export default router;
