import { Router } from 'express';
import serviceOrderRoutes from './serviceOrder.routes.js';

const router = Router();

router.use('/admin/service-orders', serviceOrderRoutes);

export default router;
