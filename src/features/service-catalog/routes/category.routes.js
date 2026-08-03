import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { CategoryController } from '../controllers/category.controller.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesSchema,
} from '../validators/category.validation.js';

const router = Router();

// Public — customers and vendors browse the catalog.
router.get('/', validate(listCategoriesSchema), CategoryController.list);
router.get('/:categoryId', validate(categoryIdParamSchema), CategoryController.getById);

// Admin only — create/edit/delete.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createCategorySchema), CategoryController.create);
router.patch('/:categoryId', validate(updateCategorySchema), CategoryController.update);
router.delete('/:categoryId', validate(categoryIdParamSchema), CategoryController.remove);

export default router;
