import { Router } from 'express';
import profileRoutes from './profile.routes.js';
import addressRoutes from './address.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/users', profileRoutes);
router.use('/users', addressRoutes);
router.use('/admin/users', adminRoutes);

export default router;
