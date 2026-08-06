import { Router } from 'express';
import searchRoutes from './search.routes.js';

const router = Router();

router.use('/', searchRoutes);

export default router;
