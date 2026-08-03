import { Router } from 'express';
import { authenticate, requireIdentity } from '../../auth/middlewares/authenticate.js';
import { validate } from '../../auth/middlewares/validate.js';
import { IDENTITIES } from '../../auth/constants/roles.constants.js';
import { MediaController } from '../controllers/media.controller.js';
import { presignedUploadUrlSchema } from '../validators/media.validation.js';

const router = Router();

router.use(authenticate, requireIdentity(IDENTITIES.ADMIN));

router.post('/presigned-url', validate(presignedUploadUrlSchema), MediaController.getPresignedUploadUrl);

export default router;
