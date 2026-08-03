import { Router } from 'express';
import categoryRoutes from './category.routes.js';
import subcategoryRoutes from './subcategory.routes.js';
import serviceGroupRoutes from './serviceGroup.routes.js';
import serviceRoutes from './service.routes.js';
import addOnRoutes from './addOn.routes.js';
import vendorServiceRoutes from './vendorService.routes.js';
import mediaRoutes from './media.routes.js';

const router = Router();

router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/service-groups', serviceGroupRoutes);
router.use('/services', serviceRoutes);
router.use('/add-ons', addOnRoutes);
router.use('/vendor-services', vendorServiceRoutes);
router.use('/media', mediaRoutes);

export default router;
