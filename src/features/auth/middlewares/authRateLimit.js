import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ApiError } from '../../../utils/index.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Keyed by IP + the identifier being attempted, not IP alone — so one bad actor
// hammering many accounts from one IP is throttled per-account, not just globally.
const identifierFrom = (req) => req.body?.identifier || req.body?.email || req.body?.phoneNumber || 'unknown';

/** kind is just a label so signup/login/forgotPassword don't share the same counter. */
export const authRateLimit = (kind) =>
  rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${kind}:${ipKeyGenerator(req.ip)}:${identifierFrom(req)}`,
    handler: (req, res, next) => {
      next(new ApiError(429, 'Too many attempts. Please try again later.'));
    },
  });
