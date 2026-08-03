import { ApiError } from '../../../utils/index.js';
import { AuthStrategy } from './auth.strategy.js';

/** Skeleton — not wired to an OTP/SMS provider yet. */
export class MobileOtpStrategy extends AuthStrategy {
  async validate(_credentials) {
    throw new ApiError(501, 'Mobile OTP login is not available yet');
  }

  async authenticate(_credentials, _context) {
    throw new ApiError(501, 'Mobile OTP login is not available yet');
  }
}
