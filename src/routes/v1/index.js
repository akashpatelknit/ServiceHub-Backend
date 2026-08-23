import express from 'express';
const router = express.Router();

import authFeatureRoutes from '../../features/auth/index.js';
import addressFeatureRoutes from '../../features/address/index.js';
import serviceCatalogFeatureRoutes from '../../features/service-catalog/index.js';
import customerFeatureRoutes from '../../features/customer/index.js';
import cartFeatureRoutes from '../../features/cart/index.js';
import serviceBookingRoutes from '../../features/service-booking/routes/index.js';
import productCatalogFeatureRoutes from '../../features/product-catalog/index.js';
import { paymentRoutes } from '../../features/payment/index.js';
import searchFeatureRoutes from '../../features/search/index.js';
import vendorLeadFeatureRoutes from '../../features/vendor-leads/index.js';
import { dashboardRoutes } from '../../features/dashboard/index.js';
import vendorManagementFeatureRoutes from '../../features/vendor-management/index.js';
import notificationRoutes from '../notification.routes.js';
import imageRoutes from '../image.routes.js';

router.use('/v1', authFeatureRoutes);
router.use('/v1/addresses', addressFeatureRoutes);
router.use('/v1/service-catalog', serviceCatalogFeatureRoutes);
router.use('/v1', customerFeatureRoutes);
// cart owns /v1/cart, /v1/checkout, /v1/orders, /v1/admin/orders (cross-type).
router.use('/v1', cartFeatureRoutes);
// service-booking owns only /v1/admin/service-orders/:id/assign-vendor — everything
// else cross-type lives in cart. product-order has no authenticated routes at all
// (its only HTTP surface, the Shiprocket webhook, is mounted directly in app.js).
router.use('/v1', serviceBookingRoutes);
// product-catalog owns /v1/products (Product CRUD) and /v1/products/categories
// (ProductCategory CRUD, its own dedicated category system).
router.use('/v1/products', productCatalogFeatureRoutes);
// payment owns /v1/payments/verify — the client-side instant-feedback path. The
// webhook (source of truth) is mounted separately in app.js, outside this router.
router.use('/v1/payments', paymentRoutes);
// Public interest-registration form for the not-yet-built vendor onboarding flow —
// see features/vendor-leads for why this is a standalone Lead model, not a real Vendor.
router.use('/v1/vendor-leads', vendorLeadFeatureRoutes);
router.use('/v1/search', searchFeatureRoutes);
router.use('/v1/admin/dashboard', dashboardRoutes);
router.use('/v1', vendorManagementFeatureRoutes);
router.use('/v1', notificationRoutes);
router.use('/v1/images', imageRoutes);

export default router;
