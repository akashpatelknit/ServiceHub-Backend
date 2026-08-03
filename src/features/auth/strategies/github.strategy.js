import { ApiError } from '../../../utils/index.js';
import { AuthStrategy } from './auth.strategy.js';

/** Skeleton — not wired to GitHub OAuth yet. */
export class GithubStrategy extends AuthStrategy {
  async validate(_credentials) {
    throw new ApiError(501, 'GitHub login is not available yet');
  }

  async authenticate(_credentials, _context) {
    throw new ApiError(501, 'GitHub login is not available yet');
  }
}
