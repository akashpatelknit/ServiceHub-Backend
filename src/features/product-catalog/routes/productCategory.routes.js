import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { ProductCategoryController } from '../controllers/productCategory.controller.js';
import {
  createProductCategorySchema,
  updateProductCategorySchema,
  productCategoryIdParamSchema,
  listProductCategoriesSchema,
} from '../validators/productCategory.validation.js';

const router = Router();

// Public — customers and the admin product form's category picker.
router.get('/', validate(listProductCategoriesSchema), ProductCategoryController.list);
router.get('/:categoryId', validate(productCategoryIdParamSchema), ProductCategoryController.getById);

// Admin only — create/edit/delete.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createProductCategorySchema), ProductCategoryController.create);
router.patch('/:categoryId', validate(updateProductCategorySchema), ProductCategoryController.update);
router.delete('/:categoryId', validate(productCategoryIdParamSchema), ProductCategoryController.remove);

export default router;
