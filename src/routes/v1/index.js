import express from 'express';
const router = express.Router();

import authFeatureRoutes from '../../features/auth/index.js';
import addressFeatureRoutes from '../../features/address/index.js';
import serviceCatalogFeatureRoutes from '../../features/service-catalog/index.js';

router.use('/v1', authFeatureRoutes);
router.use('/v1/addresses', addressFeatureRoutes);
router.use('/v1/service-catalog', serviceCatalogFeatureRoutes);

export default router;
