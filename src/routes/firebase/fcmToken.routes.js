import express from 'express';
import { registerFcmToken, removeFcmToken } from '../../controllers/firebase/fcmToken.controller.js';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

const router = express.Router();

router.route('/vendor/fcm-register').post(authMiddleware(['vendor', 'admin']), registerFcmToken);
router.route('/user/fcm-register').post(authMiddleware(['user', 'admin']), registerFcmToken);
router.route('/fcm/admin/register').post(authMiddleware(['vendor', 'admin']), registerFcmToken);

router.route('/fcm').delete(removeFcmToken);

export default router;
