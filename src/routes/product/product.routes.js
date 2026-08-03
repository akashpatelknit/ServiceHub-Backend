import express from 'express';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import {
  getAllProductList,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct,
  uploadProductImages,
  getProductPricing,
} from '../../controllers/product/product.controller.js';
import {
  getAllOrders,
  getOrderById,
  getUserOrders,
  getVendorOrders,
  updateOrderStatus,
} from '../../controllers/payment/order.controller.js';
import { uploadMultiple } from '../../middlewares/multer.middleware.js';

const router = express.Router();

router.route('/products').get(authMiddleware(['admin', 'vendor', 'user']), getAllProductList);
router.route('/products/pricing/:productId').get(authMiddleware(['admin', 'vendor', 'user']), getProductPricing);
router.route('/product/add').post(authMiddleware(['admin']), addProduct);
router.route('/products/:productId/images').post(uploadMultiple.array('images', 10), uploadProductImages);
router.route('/products/:id').get(authMiddleware(['admin', 'vendor', 'user']), getProductById);
router.route('/products/:id').put(authMiddleware(['admin']), editProduct);
router.route('/products/:id').delete(authMiddleware(['admin']), deleteProduct);

// order routes
// In your routes file:
router.get('/orders', authMiddleware(['admin']), getAllOrders);
router.get('/orders/vendor', authMiddleware(['vendor', 'admin']), getVendorOrders);
router.get('/orders/user', authMiddleware(['admin', 'user']), getUserOrders);
router.get('/orders/vendor/:vendorId', authMiddleware(['admin']), getVendorOrders);
router.get('/orders/:orderId', authMiddleware(['vendor', 'admin']), getOrderById);
router.put('/orders/:orderId', authMiddleware(['vendor', 'admin']), updateOrderStatus);

export default router;
