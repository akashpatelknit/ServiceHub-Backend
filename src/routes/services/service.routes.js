import express from 'express';
import { authenticate as authMiddleware } from '../../features/auth/middlewares/authenticate.js';
import {
  createServiceTemplate,
  deleteServiceTemplate,
  getServiceTemplateById,
  getServiceTemplatesByCategory,
  updateServiceTemplate,
  requestServiceByVendor,
  getAllServiceRequests,
  getServiceTemplates,
  getRequestServiceByVendor,
  updateServiceRequest,
  requestSingleServiceByVendor,
} from '../../controllers/service/serviceTemplateController.js';

import {
  getAllVendorServices,
  getVendorServiceById,
  getServicesByVendor,
  updateVendorService,
  updateServiceStatus,
  toggleServiceAvailability,
  deleteVendorService,
  restoreVendorService,
  updateServicePricing,
  getServiceStatistics,
} from '../../controllers/service/service.controller.js';
import { serviceSearch } from '../../controllers/service/search.controller.js';

const router = express.Router();

router.route('/services/request').post(authMiddleware(['vendor', 'admin']), requestSingleServiceByVendor);
router.route('/services/request').get(authMiddleware(['admin']), getAllServiceRequests);
router.get('/services/request/vendor', authMiddleware(['admin', 'vendor']), getRequestServiceByVendor);
router.get('/services/request/vendor/:id', authMiddleware(['admin', 'vendor']), getRequestServiceByVendor);
router.route('/services/request/:id').put(authMiddleware(['admin', 'vendor']), updateServiceRequest);

// Other specific routes
router.route('/services/vendor/:vendorId').get(authMiddleware(['admin']), getServicesByVendor);
router.route('/services/vendor/:vendorId/statistics').get(authMiddleware(['vendor', 'admin']), getServiceStatistics);

// PARAMETERIZED ROUTES LAST (after all specific routes)

// Public routes
router.route('/services').get(getAllVendorServices);
router.route('/services/:id').get(getVendorServiceById);
router.route('/search-services').get(serviceSearch);

// Protected routes (requires authentication)
router
  .route('/services/:id')
  .put(authMiddleware(['vendor', 'admin']), updateVendorService)
  .delete(authMiddleware(['vendor', 'admin']), deleteVendorService);

router.route('/services/:id/restore').put(authMiddleware(['admin']), restoreVendorService);
router.route('/services/:id/availability').put(authMiddleware(['vendor', 'admin']), toggleServiceAvailability);
router.route('/services/:id/pricing').put(authMiddleware(['vendor', 'admin']), updateServicePricing);

// Admin only routes
router.route('/services/:id/status').put(authMiddleware(['admin']), updateServiceStatus);

// Service templates routes
router.route('/service-templates/category/:categoryId').get(getServiceTemplatesByCategory);
router.route('/service-templates').post(authMiddleware(['admin']), createServiceTemplate);
router.route('/service-templates').get(getServiceTemplates);
router.route('/service-templates/:id').put(authMiddleware(['admin', 'vendor']), updateServiceTemplate);
router.route('/service-templates/:id').delete(authMiddleware(['admin', 'vendor']), deleteServiceTemplate);
router.route('/service-templates/:id').get(authMiddleware(['admin', 'vendor', 'user']), getServiceTemplateById);

export default router;
