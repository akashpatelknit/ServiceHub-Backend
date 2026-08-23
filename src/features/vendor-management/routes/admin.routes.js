import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { checkPermission } from '../../auth/middlewares/checkPermission.js';
import { validate } from '../../auth/middlewares/validate.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../../auth/constants/permissions.constants.js';
import { listVendors, getVendor, updateVendorStatus } from '../controllers/adminVendor.controller.js';
import { listVendorsSchema, vendorIdParamSchema, updateVendorStatusSchema } from '../validators/adminVendor.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission(PERMISSION_RESOURCES.VENDORS, PERMISSION_ACTIONS.READ), validate(listVendorsSchema), listVendors);
router.get('/:id', checkPermission(PERMISSION_RESOURCES.VENDORS, PERMISSION_ACTIONS.READ), validate(vendorIdParamSchema), getVendor);
router.patch(
  '/:id/status',
  checkPermission(PERMISSION_RESOURCES.VENDORS, PERMISSION_ACTIONS.UPDATE),
  validate(updateVendorStatusSchema),
  updateVendorStatus
);

export default router;
