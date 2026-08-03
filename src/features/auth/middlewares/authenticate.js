import { ApiError, asyncHandler } from '../../../utils/index.js';
import { TokenService } from '../services/token.service.js';
import { BlacklistService } from '../services/blacklist.service.js';
import { CoreAccessor } from '../services/core.accessor.js';

/** Verifies the access JWT, rejects blacklisted/revoked tokens, and loads the actor. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.accessToken || req.headers?.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new ApiError(401, 'Access token missing');
  }

  const decoded = TokenService.verifyAccessToken(token);

  if (await BlacklistService.isBlacklisted(decoded.jti)) {
    throw new ApiError(401, 'Access token has been revoked');
  }

  const actor = await CoreAccessor.getActorById(decoded.identity, decoded.sub);
  if (!actor) {
    throw new ApiError(401, 'Invalid access token');
  }

  if (actor.isBlocked) {
    throw new ApiError(403, 'Account is blocked');
  }

  req.user = actor;
  req.identity = decoded.identity;
  req.tokenJti = decoded.jti;
  req.tokenExp = decoded.exp;

  next();
});

/** Gates a route to one or more top-level identities, e.g. requireIdentity(IDENTITIES.VENDOR). */
export const requireIdentity =
  (...identities) =>
  (req, _res, next) => {
    if (!identities.includes(req.identity)) {
      return next(new ApiError(403, `Requires identity: ${identities.join(' or ')}`));
    }
    next();
  };
