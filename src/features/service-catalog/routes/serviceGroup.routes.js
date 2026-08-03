import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { ServiceGroupController } from '../controllers/serviceGroup.controller.js';
import {
  createServiceGroupSchema,
  updateServiceGroupSchema,
  serviceGroupIdParamSchema,
  listServiceGroupsSchema,
} from '../validators/serviceGroup.validation.js';

const router = Router();

// Public — customers and vendors browse the catalog.
router.get('/', validate(listServiceGroupsSchema), ServiceGroupController.list);
router.get('/:serviceGroupId', validate(serviceGroupIdParamSchema), ServiceGroupController.getById);

// Admin only — create/edit/delete.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createServiceGroupSchema), ServiceGroupController.create);
router.patch('/:serviceGroupId', validate(updateServiceGroupSchema), ServiceGroupController.update);
router.delete('/:serviceGroupId', validate(serviceGroupIdParamSchema), ServiceGroupController.remove);

export default router;
