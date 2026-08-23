import { Router } from 'express';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/admin/vendors', adminRoutes);

export default router;
