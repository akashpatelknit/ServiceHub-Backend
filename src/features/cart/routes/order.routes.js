import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { OrderController } from '../controllers/order.controller.js';
import { listOrdersSchema, orderNumberParamSchema } from '../validators/order.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.USER));

router.get('/', validate(listOrdersSchema), OrderController.list);
router.get('/:orderNumber', validate(orderNumberParamSchema), OrderController.getByOrderNumber);
router.post('/:orderNumber/cancel', validate(orderNumberParamSchema), OrderController.cancel);

export default router;
