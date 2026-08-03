import { ApiError } from '../../../utils/index.js';

/**
 * Common contract every login strategy must satisfy so the registry can
 * dispatch on `provider` without controllers branching on identity type.
 */
export class AuthStrategy {
  async validate(_credentials) {
    throw new ApiError(501, `${this.constructor.name} must implement validate()`);
  }

  async authenticate(_credentials, _context) {
    throw new ApiError(501, `${this.constructor.name} must implement authenticate()`);
  }
}
