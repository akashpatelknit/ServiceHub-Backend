import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { ProductController } from '../controllers/product.controller.js';
import { createProductSchema, updateProductSchema, productIdParamSchema, listProductsSchema } from '../validators/product.validation.js';

const router = Router();

// Public — customers and the cart/checkout flow browse the catalog. Product
// categories live at their own dedicated router (../productCategory.routes.js),
// mounted at /categories ahead of this router's `/` — see routes/index.js.
router.get('/', validate(listProductsSchema), ProductController.list);
router.get('/:productId', validate(productIdParamSchema), ProductController.getById);

// Admin only — create/edit/delete.
router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/', validate(createProductSchema), ProductController.create);
router.patch('/:productId', validate(updateProductSchema), ProductController.update);
router.delete('/:productId', validate(productIdParamSchema), ProductController.remove);

export default router;
