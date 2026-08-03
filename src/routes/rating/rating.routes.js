import express from 'express';
const router = express.Router();

import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import {
  addRating,
  getBookingRating,
  getProductRating,
  getVendorRating,
} from '../../controllers/rating/rating.controller.js';

router.route('/rating').post(authMiddleware(['admin', 'user', 'vendor']), addRating);

router.route('/rating/product/:itemId').get(authMiddleware(['admin', 'vendor', 'user']), getProductRating);
router.route('/rating/vendor/:itemId').get(authMiddleware(['admin', 'vendor', 'user']), getVendorRating);
router.route('/rating/service-template/:itemId').get(authMiddleware(['admin', 'vendor', 'user']), getBookingRating);

export default router;
