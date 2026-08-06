import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { checkPermission } from '../../auth/middlewares/checkPermission.js';
import { validate } from '../../auth/middlewares/validate.js';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../../auth/constants/permissions.constants.js';
import { listUsers, getUser, toggleBlock, toggleActive } from '../controllers/admin.controller.js';
import { listUsersSchema, userIdParamSchema, toggleBlockSchema, toggleActiveSchema } from '../validators/admin.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.READ), validate(listUsersSchema), listUsers);
router.get('/:id', checkPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.READ), validate(userIdParamSchema), getUser);
router.patch('/:id/block', checkPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.BLOCK), validate(toggleBlockSchema), toggleBlock);
router.patch(
  '/:id/deactivate',
  checkPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.UPDATE),
  validate(toggleActiveSchema),
  toggleActive
);

export default router;
