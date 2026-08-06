import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { getMe, updateMe, changeMyPassword } from '../controllers/profile.controller.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/profile.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.USER));

router.get('/me', getMe);
router.patch('/me', validate(updateProfileSchema), updateMe);
router.patch('/me/password', validate(changePasswordSchema), changeMyPassword);

export default router;
