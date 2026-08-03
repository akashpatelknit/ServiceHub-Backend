import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { SubcategoryController } from '../controllers/subcategory.controller.js';
import {
  createSubcategorySchema,
  updateSubcategorySchema,
  subcategoryIdParamSchema,
  listSubcategoriesSchema,
} from '../validators/subcategory.validation.js';

const router = Router();

// Public — customers and vendors browse the catalog.
router.get('/', validate(listSubcategoriesSchema), SubcategoryController.list);
router.get('/:subcategoryId', validate(subcategoryIdParamSchema), SubcategoryController.getById);

// Admin only — create/edit/delete.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createSubcategorySchema), SubcategoryController.create);
router.patch('/:subcategoryId', validate(updateSubcategorySchema), SubcategoryController.update);
router.delete('/:subcategoryId', validate(subcategoryIdParamSchema), SubcategoryController.remove);

export default router;
