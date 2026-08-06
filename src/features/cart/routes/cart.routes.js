import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { CartController } from '../controllers/cart.controller.js';
import { addCartItemSchema, updateCartItemSchema, cartItemIdParamSchema } from '../validators/cart.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.USER));

router.get('/', CartController.getCart);
router.delete('/', CartController.clearCart);
router.post('/items', validate(addCartItemSchema), CartController.addItem);
router.patch('/items/:itemId', validate(updateCartItemSchema), CartController.updateItem);
router.delete('/items/:itemId', validate(cartItemIdParamSchema), CartController.removeItem);

export default router;
