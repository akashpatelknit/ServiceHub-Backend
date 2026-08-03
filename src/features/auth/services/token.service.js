import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../../../config/config.js';
import { ApiError } from '../../../utils/index.js';
import { TOKEN_TYPES } from '../constants/token.constants.js';

const SECRETS = {
  [TOKEN_TYPES.ACCESS]: config.ACCESS_TOKEN.SECRET,
  [TOKEN_TYPES.REFRESH]: config.REFRESH_TOKEN.SECRET,
};

const EXPIRIES = {
  [TOKEN_TYPES.ACCESS]: config.ACCESS_TOKEN.EXPIRY,
  [TOKEN_TYPES.REFRESH]: config.REFRESH_TOKEN.EXPIRY,
};

const issue = (actor, identity, type) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: actor._id.toString(), identity, type, jti }, SECRETS[type], {
    expiresIn: EXPIRIES[type],
  });
  return { token, jti };
};

const verify = (token, type) => {
  let decoded;
  try {
    decoded = jwt.verify(token, SECRETS[type]);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? `${type} token expired` : `Invalid ${type} token`;
    throw new ApiError(401, message);
  }

  if (decoded.type !== type) {
    throw new ApiError(401, `Invalid ${type} token`);
  }

  return decoded;
};

export const TokenService = {
  issueTokenPair(actor, identity) {
    const access = issue(actor, identity, TOKEN_TYPES.ACCESS);
    const refresh = issue(actor, identity, TOKEN_TYPES.REFRESH);

    return {
      accessToken: access.token,
      accessTokenJti: access.jti,
      refreshToken: refresh.token,
      refreshTokenJti: refresh.jti,
    };
  },

  verifyAccessToken(token) {
    return verify(token, TOKEN_TYPES.ACCESS);
  },

  verifyRefreshToken(token) {
    return verify(token, TOKEN_TYPES.REFRESH);
  },

  /** Verify + reissue in one step. Callers still own checking the refresh token against actor state (e.g. matches last-issued jti) before trusting this. */
  rotate(refreshToken, actor, identity) {
    this.verifyRefreshToken(refreshToken);
    return this.issueTokenPair(actor, identity);
  },

  getRemainingTtlSeconds(decoded) {
    if (!decoded?.exp) return 0;
    return Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
  },
};
