import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { checkPermission } from '../middlewares/checkPermission.js';
import { validate } from '../middlewares/validate.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../constants/permissions.constants.js';
import { AdminController } from '../controllers/admin.controller.js';
import {
  assignAdminSubRoleSchema,
  approveKycSchema,
  rejectKycSchema,
  adminListKycSchema,
  adminGetKycSchema,
} from '../validators/admin.validation.js';

const router = Router();

router.use(authenticate);

router.patch(
  '/:adminId/sub-role',
  checkPermission(PERMISSION_RESOURCES.ADMINS, PERMISSION_ACTIONS.UPDATE),
  validate(assignAdminSubRoleSchema),
  AdminController.assignSubRole
);

router.get(
  '/kyc',
  checkPermission(PERMISSION_RESOURCES.KYC, PERMISSION_ACTIONS.READ),
  validate(adminListKycSchema),
  AdminController.listKyc
);

router.get(
  '/kyc/:vendorId',
  checkPermission(PERMISSION_RESOURCES.KYC, PERMISSION_ACTIONS.READ),
  validate(adminGetKycSchema),
  AdminController.getKyc
);

router.post(
  '/kyc/:vendorId/approve',
  checkPermission(PERMISSION_RESOURCES.KYC, PERMISSION_ACTIONS.APPROVE),
  validate(approveKycSchema),
  AdminController.approveKyc
);

router.post(
  '/kyc/:vendorId/reject',
  checkPermission(PERMISSION_RESOURCES.KYC, PERMISSION_ACTIONS.REJECT),
  validate(rejectKycSchema),
  AdminController.rejectKyc
);

export default router;
