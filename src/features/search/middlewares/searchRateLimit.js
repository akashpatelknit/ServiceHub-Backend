import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ApiError } from '../../../utils/index.js';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

// /search is public and unauthenticated, so it's an easy scraping/abuse target.
// Keyed by IP alone (unlike authRateLimit, there's no per-account identifier on a
// GET request to key against).
export const searchRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many search requests. Please try again later.'));
  },
});
