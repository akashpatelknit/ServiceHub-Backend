import { Router } from 'express';
import { User, Vendor, Admin } from '../../../core/models/index.js';
import { IDENTITIES } from '../constants/roles.constants.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { authRateLimit } from '../middlewares/authRateLimit.js';
import {
  signupSchema,
  userSignupSchema,
  loginSchema,
  userLoginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validation.js';

const buildAuthRouter = ({ Model, identity, allowSignup, signupSchema: signupSchemaOverride, loginSchema: loginSchemaOverride }) => {
  const router = Router();
  const controller = createAuthController({ Model, identity });

  if (allowSignup) {
    router.post('/signup', authRateLimit('signup'), validate(signupSchemaOverride ?? signupSchema), controller.signup);
  }

  router.post('/login', authRateLimit('login'), validate(loginSchemaOverride ?? loginSchema), controller.login);
  router.post('/refresh', validate(refreshTokenSchema), controller.refresh);
  router.get('/me', authenticate, controller.me);
  router.post('/logout', authenticate, validate(logoutSchema), controller.logout);
  router.post('/forgot-password', authRateLimit('forgotPassword'), validate(forgotPasswordSchema), controller.forgotPassword);
  router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
  router.patch('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);

  return router;
};

const router = Router();

// Admins are provisioned by another admin (see admin.routes.js), not via public signup.
router.use(
  '/user',
  buildAuthRouter({
    Model: User,
    identity: IDENTITIES.USER,
    allowSignup: true,
    signupSchema: userSignupSchema,
    loginSchema: userLoginSchema,
  })
);
router.use('/vendor', buildAuthRouter({ Model: Vendor, identity: IDENTITIES.VENDOR, allowSignup: true }));
router.use('/admin', buildAuthRouter({ Model: Admin, identity: IDENTITIES.ADMIN, allowSignup: false }));

export default router;
