import express from 'express';
import { uploadMultiple, uploadSingle } from '../middlewares/multer.middleware.js';
import { imageController } from '../controllers/image/image.controller.js';
import { authenticate, requireIdentity } from '../features/auth/middlewares/authenticate.js';
import { IDENTITIES } from '../features/auth/constants/roles.constants.js';
import { uploadMultipleImages, uploadSingleImage } from '../services/image/SimpleImageService.js';

const router = express.Router();
const requireAnyIdentity = requireIdentity(IDENTITIES.ADMIN, IDENTITIES.USER, IDENTITIES.VENDOR);

router.post('/upload/single', authenticate, requireAnyIdentity, uploadSingle.single('image'), uploadSingleImage);
router.post('/upload/multiple', authenticate, requireAnyIdentity, uploadMultiple.array('images', 10), uploadMultipleImages);
router.post('/signed-url', authenticate, requireAnyIdentity, imageController.getSignedUploadUrl);

export default router;
