import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { VendorServiceController } from '../controllers/vendorService.controller.js';
import {
  requestServiceSchema,
  listMyVendorServicesSchema,
  listVendorServicesSchema,
  listAvailableServicesSchema,
  vendorServiceIdParamSchema,
  rejectVendorServiceSchema,
} from '../validators/vendorService.validation.js';

const router = Router();

router.use(authenticate);

// Vendor — browse the catalog, request a service, view/withdraw own requests.
router.get(
  '/available',
  requireIdentity(IDENTITIES.VENDOR),
  validate(listAvailableServicesSchema),
  VendorServiceController.listAvailable
);
router.post('/', requireIdentity(IDENTITIES.VENDOR), validate(requestServiceSchema), VendorServiceController.request);
router.get(
  '/me',
  requireIdentity(IDENTITIES.VENDOR),
  validate(listMyVendorServicesSchema),
  VendorServiceController.listMine
);
router.delete(
  '/:vendorServiceId',
  requireIdentity(IDENTITIES.VENDOR),
  validate(vendorServiceIdParamSchema),
  VendorServiceController.withdraw
);

// Admin — view requests (optionally filtered by status, e.g. ?status=pending), approve/reject.
router.get('/', requireIdentity(IDENTITIES.ADMIN), validate(listVendorServicesSchema), VendorServiceController.list);
router.patch(
  '/:vendorServiceId/approve',
  requireIdentity(IDENTITIES.ADMIN),
  validate(vendorServiceIdParamSchema),
  VendorServiceController.approve
);
router.patch(
  '/:vendorServiceId/reject',
  requireIdentity(IDENTITIES.ADMIN),
  validate(rejectVendorServiceSchema),
  VendorServiceController.reject
);

export default router;
