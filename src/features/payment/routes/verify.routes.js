import { Router } from 'express';
import { authenticate } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { VerifyController } from '../controllers/verify.controller.js';
import { verifyPaymentSchema } from '../validators/verify.validation.js';

// No requireIdentity() gate — payment stays purpose-agnostic, so this accepts any
// authenticated identity (today: customers via checkout; future purposeTypes may
// come from other identities). The Payment doc itself is what scopes ownership.
const router = Router();

router.use(authenticate);
router.post('/verify', validate(verifyPaymentSchema), VerifyController.verify);

export default router;
