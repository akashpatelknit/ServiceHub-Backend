import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validate } from '../../auth/middlewares/validate.js';
import { VendorLeadController } from '../controllers/vendorLead.controller.js';
import { createVendorLeadSchema } from '../validators/vendorLead.validation.js';

const router = Router();

// Public, unauthenticated lead-capture form — same express-rate-limit approach as
// features/auth/middlewares/authRateLimit.js, just IP-keyed (no account identifier to
// key on here) since this is spam-prevention, not brute-force protection.
const vendorLeadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

router.post('/', vendorLeadRateLimit, validate(createVendorLeadSchema), VendorLeadController.create);

export default router;
