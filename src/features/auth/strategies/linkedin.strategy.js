import { ApiError } from '../../../utils/index.js';
import { AuthStrategy } from './auth.strategy.js';

/** Skeleton — not wired to LinkedIn OAuth yet. */
export class LinkedinStrategy extends AuthStrategy {
  async validate(_credentials) {
    throw new ApiError(501, 'LinkedIn login is not available yet');
  }

  async authenticate(_credentials, _context) {
    throw new ApiError(501, 'LinkedIn login is not available yet');
  }
}
