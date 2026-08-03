import { Router } from 'express';
import authRoutes from './auth.routes.js';
import kycRoutes from './kyc.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/vendor/kyc', kycRoutes);
router.use('/admin', adminRoutes);

export default router;
