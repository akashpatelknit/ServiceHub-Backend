import { Router } from 'express';
import productRoutes from './product.routes.js';
import productCategoryRoutes from './productCategory.routes.js';

const router = Router();

// /categories MUST be registered before the product router below — product.routes.js
// has a `GET /:productId` catch-all mounted at `/`, and Express tries router.use()
// mounts in registration order, so a `/categories` request would otherwise match
// `:productId` = "categories" first.
router.use('/categories', productCategoryRoutes);
router.use('/', productRoutes);

export default router;
