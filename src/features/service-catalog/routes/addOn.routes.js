import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { AddOnController } from '../controllers/addOn.controller.js';
import {
  createAddOnSchema,
  updateAddOnSchema,
  addOnIdParamSchema,
  listAddOnsSchema,
} from '../validators/addOn.validation.js';

const router = Router();

// Public — customers browse add-ons contextually under a service/service group.
router.get('/', validate(listAddOnsSchema), AddOnController.list);
router.get('/:addOnId', validate(addOnIdParamSchema), AddOnController.getById);

// Admin only — no vendor request/approval for add-ons.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createAddOnSchema), AddOnController.create);
router.patch('/:addOnId', validate(updateAddOnSchema), AddOnController.update);
router.delete('/:addOnId', validate(addOnIdParamSchema), AddOnController.remove);

export default router;
