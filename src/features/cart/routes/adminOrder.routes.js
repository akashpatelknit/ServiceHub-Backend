import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { checkPermission } from '../../auth/middlewares/checkPermission.js';
import { validate } from '../../auth/middlewares/validate.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../../auth/constants/permissions.constants.js';
import { AdminOrderController } from '../controllers/adminOrder.controller.js';
import { adminListOrdersSchema, adminOrderIdParamSchema, orderStatusUpdateSchema } from '../validators/order.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission(PERMISSION_RESOURCES.ORDERS, PERMISSION_ACTIONS.READ), validate(adminListOrdersSchema), AdminOrderController.list);
router.get('/:id', checkPermission(PERMISSION_RESOURCES.ORDERS, PERMISSION_ACTIONS.READ), validate(adminOrderIdParamSchema), AdminOrderController.getById);
router.patch(
  '/:id/status',
  checkPermission(PERMISSION_RESOURCES.ORDERS, PERMISSION_ACTIONS.UPDATE),
  validate(orderStatusUpdateSchema),
  AdminOrderController.updateStatus
);

export default router;
