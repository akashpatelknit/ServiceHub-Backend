import { Router } from 'express';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import {
  applyCoupon,
  createCoupon,
  couponUsage,
  getAvailableService,
  getAllCoupons,
  deleteCoupon,
  addApplicableItems,
  getCouponsForProduct,
  updateCoupon,
  getCouponsForService,
} from '../../controllers/coupon/coupon.controller.js';

const router = Router();

router
  .route('/coupons')
  .post(authMiddleware(['admin']), createCoupon)
  .put(authMiddleware(['admin']), updateCoupon);
router.route('/coupons/assign').post(authMiddleware(['admin']), addApplicableItems);
router.route('/apply-coupon').post(authMiddleware(['user', 'vendor']), applyCoupon);
router.route('/coupons/:id').patch(authMiddleware(['admin', 'user', 'vendor']), couponUsage);

router.route('/coupons/all').get(authMiddleware(['admin', 'user', 'vendor']), getAllCoupons);
router.route('/coupon/services').get(authMiddleware(['admin', 'user', 'vendor']), getAvailableService);

router.route('/coupons/product/:productId').get(authMiddleware(['admin', 'user', 'vendor']), getCouponsForProduct);
router
  .route('/coupons/service/:serviceTemplateId')
  .get(authMiddleware(['admin', 'user', 'vendor']), getCouponsForService);
  
router.route('/coupons/:id').delete(authMiddleware(['admin']), deleteCoupon);

export default router;
