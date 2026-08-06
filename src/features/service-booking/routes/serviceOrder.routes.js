import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { checkPermission } from '../../auth/middlewares/checkPermission.js';
import { validate } from '../../auth/middlewares/validate.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../../auth/constants/permissions.constants.js';
import { ServiceOrderController } from '../controllers/serviceOrder.controller.js';
import { assignVendorSchema } from '../validators/serviceOrder.validation.js';

// This module's only HTTP surface — customer-facing list/detail/cancel and the
// generic admin list/detail/status-update all live in `cart`, which queries the
// shared CustomerOrder base model directly and delegates transitions back here.
const router = Router();

router.use(authenticate);

router.post(
  '/:id/assign-vendor',
  checkPermission(PERMISSION_RESOURCES.ORDERS, PERMISSION_ACTIONS.UPDATE),
  validate(assignVendorSchema),
  ServiceOrderController.assignVendor
);

export default router;
