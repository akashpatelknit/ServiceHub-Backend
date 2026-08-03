import express from 'express';
import { getUserById, getCurrentUserProfile, updateProfile } from '../../controllers/customer/user.controller.js';

import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';

const router = express.Router();

router.get('/profile', authMiddleware(['user', 'admin']), getCurrentUserProfile);
router.put('/profile', authMiddleware(['user', 'admin']), updateProfile);

router.get('/:id', authMiddleware(['user', 'admin']), getUserById);

export default router;
