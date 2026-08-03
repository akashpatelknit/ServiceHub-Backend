import express from 'express';
const router = express.Router();

import { bannerController } from '../controllers/banner/banner.controller.js';
import { authenticate as authMiddleware } from '../features/auth/middlewares/authenticate.js';

router.route('/active').get(bannerController.getActiveBanners);
router.route('/').get(bannerController.getAllBanners);

router.route('/').post(authMiddleware(['admin']), bannerController.createBanner);
router.route('/:id').put(authMiddleware(['admin']), bannerController.updateBanner);
router.route('/:id').delete(authMiddleware(['admin']), bannerController.deleteBanner);

router.route('/:id').get(bannerController.getBannerById);

export default router;
