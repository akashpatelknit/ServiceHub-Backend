import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { checkPermission } from '../../auth/middlewares/checkPermission.js';
import { validate } from '../../auth/middlewares/validate.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../../auth/constants/permissions.constants.js';
import { AdminPaymentController } from '../controllers/adminPayment.controller.js';
import { adminListPaymentsSchema, adminPaymentIdParamSchema, refundPaymentSchema } from '../validators/payment.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.READ), validate(adminListPaymentsSchema), AdminPaymentController.list);
router.get('/:id', checkPermission(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.READ), validate(adminPaymentIdParamSchema), AdminPaymentController.getById);
// A real financial operation — see PaymentService.initiateRefund, which calls the
// actual Razorpay refund API before anything here is considered successful.
router.post(
  '/:id/refund',
  checkPermission(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.UPDATE),
  validate(refundPaymentSchema),
  AdminPaymentController.refund
);

export default router;
