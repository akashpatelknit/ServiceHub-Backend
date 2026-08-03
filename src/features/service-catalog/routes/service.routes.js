import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { ServiceController } from '../controllers/service.controller.js';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
  listServicesSchema,
} from '../validators/service.validation.js';

const router = Router();

// Public — customers and vendors browse the catalog.
router.get('/', validate(listServicesSchema), ServiceController.list);
router.get('/:serviceId', validate(serviceIdParamSchema), ServiceController.getById);

// Admin only — create/edit/delete. Price is fixed and set only here.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createServiceSchema), ServiceController.create);
router.patch('/:serviceId', validate(updateServiceSchema), ServiceController.update);
router.delete('/:serviceId', validate(serviceIdParamSchema), ServiceController.remove);

export default router;
