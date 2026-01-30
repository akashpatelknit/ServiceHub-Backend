import express from 'express';
const router = express.Router();

import userAuthRoutes from './user.routes.js';
import vendorAuthRoutes from './vendor.routes.js';
import adminAuthRoutes from './admin.routes.js';

router.use('/admin', adminAuthRoutes);
router.use('/vendor', vendorAuthRoutes);
router.use('/user', userAuthRoutes);

export default router;