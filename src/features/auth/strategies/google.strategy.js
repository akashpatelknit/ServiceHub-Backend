import { ApiError } from '../../../utils/index.js';
import { AuthStrategy } from './auth.strategy.js';

/** Skeleton — not wired to Google OAuth yet. */
export class GoogleStrategy extends AuthStrategy {
  async validate(_credentials) {
    throw new ApiError(501, 'Google login is not available yet');
  }

  async authenticate(_credentials, _context) {
    throw new ApiError(501, 'Google login is not available yet');
  }
}
