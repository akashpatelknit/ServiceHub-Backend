import express from 'express';
import { uploadMultiple, uploadSingle } from '../middlewares/multer.middleware.js';
import { imageController } from '../controllers/image/image.controller.js';
import { authenticate as authMiddleware } from '../features/auth/middlewares/authenticate.js';
import { uploadMultipleImages, uploadSingleImage } from '../services/image/SimpleImageService.js';
const router = express.Router();

router.route('/upload/single').post(uploadSingle.single('image'), uploadSingleImage);
router.route('/upload/multiple').post(uploadMultiple.array('images', 10), uploadMultipleImages);
router.post('/signed-url', authMiddleware(['admin', 'user', 'vendor']), imageController.getSignedUploadUrl);

export default router;
