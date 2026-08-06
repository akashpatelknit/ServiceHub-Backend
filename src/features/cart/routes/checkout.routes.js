import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { checkoutSchema } from '../validators/checkout.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.USER));

router.post('/', validate(checkoutSchema), CheckoutController.checkout);

export default router;
