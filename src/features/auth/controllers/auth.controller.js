import { StatusCodes } from 'http-status-codes';
import { ApiResponse, ApiError, asyncHandler } from '../../../utils/index.js';
import { AuthStrategyRegistry } from '../strategies/strategy.registry.js';
import { TokenService } from '../services/token.service.js';
import { BlacklistService } from '../services/blacklist.service.js';
import { AUTH_PROVIDERS } from '../constants/providers.constants.js';
import { IDENTITIES } from '../constants/roles.constants.js';
import { ADMIN_SUB_ROLE_PERMISSIONS } from '../constants/permissions.constants.js';
import { COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE_MAX_AGE_MS, REFRESH_TOKEN_COOKIE_MAX_AGE_MS } from '../constants/token.constants.js';

/**
 * Identity-agnostic — the same controller logic serves /auth/user, /auth/vendor,
 * and /auth/admin routes, each bound to its own Model + identity at mount time.
 * Provider dispatch happens entirely through AuthStrategyRegistry; nothing here
 * branches on `provider`.
 */
export const createAuthController = ({ Model, identity }) => {
  const issueAndPersist = async (actor) => {
    const { accessToken, refreshToken } = TokenService.issueTokenPair(actor, identity);
    actor.refreshToken = refreshToken;
    await actor.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  };

  const respondWithTokens = (res, status, tokens) =>
    res
      .status(status)
      .cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS(ACCESS_TOKEN_COOKIE_MAX_AGE_MS))
      .cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS(REFRESH_TOKEN_COOKIE_MAX_AGE_MS))
      .json(new ApiResponse(status, tokens, 'Success'));

  return {
    signup: asyncHandler(async (req, res) => {
      const { provider, ...data } = req.body;
      const strategy = AuthStrategyRegistry.resolve(provider);
      const actor = await strategy.register(data, { Model });
      const tokens = await issueAndPersist(actor);
      return respondWithTokens(res, StatusCodes.CREATED, tokens);
    }),

    login: asyncHandler(async (req, res) => {
      const { provider, ...credentials } = req.body;
      const strategy = AuthStrategyRegistry.resolve(provider);
      const actor = await strategy.authenticate(credentials, { Model });

      if (actor.isBlocked) {
        throw new ApiError(403, 'Account is blocked');
      }

      const tokens = await issueAndPersist(actor);
      return respondWithTokens(res, StatusCodes.OK, tokens);
    }),

    refresh: asyncHandler(async (req, res) => {
      const incoming = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!incoming) {
        throw new ApiError(401, 'Refresh token missing');
      }

      const decoded = TokenService.verifyRefreshToken(incoming);
      const actor = await Model.findById(decoded.sub).select('+refreshToken');

      if (!actor || actor.refreshToken !== incoming) {
        throw new ApiError(401, 'Refresh token mismatch — please login again');
      }

      const tokens = await issueAndPersist(actor);
      return respondWithTokens(res, StatusCodes.OK, tokens);
    }),

    // `authenticate` loads req.user without excluding `password` (it isn't select:false on
    // the schema), so re-fetch here rather than serializing req.user directly.
    me: asyncHandler(async (req, res) => {
      const actor = await Model.findById(req.user._id).select('-password');
      if (!actor) {
        throw new ApiError(404, 'Not found');
      }

      const payload = actor.toJSON();
      if (identity === IDENTITIES.ADMIN) {
        payload.permissions = ADMIN_SUB_ROLE_PERMISSIONS[actor.subRole] ?? {};
      }

      return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, payload, 'Success'));
    }),

    logout: asyncHandler(async (req, res) => {
      await BlacklistService.add(req.tokenJti, TokenService.getRemainingTtlSeconds({ exp: req.tokenExp }));
      await Model.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

      return res
        .status(StatusCodes.OK)
        .clearCookie('accessToken')
        .clearCookie('refreshToken')
        .json(new ApiResponse(StatusCodes.OK, null, 'Logged out successfully'));
    }),

    forgotPassword: asyncHandler(async (req, res) => {
      const strategy = AuthStrategyRegistry.resolve(AUTH_PROVIDERS.EMAIL);
      await strategy.forgotPassword(req.body.email, { Model });

      // Always 200 — don't reveal whether the email exists.
      return res
        .status(StatusCodes.OK)
        .json(new ApiResponse(StatusCodes.OK, null, 'If this email is registered, a reset link has been sent.'));
    }),

    resetPassword: asyncHandler(async (req, res) => {
      const strategy = AuthStrategyRegistry.resolve(AUTH_PROVIDERS.EMAIL);
      const actor = await strategy.resetPassword(req.body, { Model });
      const tokens = await issueAndPersist(actor);
      return respondWithTokens(res, StatusCodes.OK, tokens);
    }),

    changePassword: asyncHandler(async (req, res) => {
      const strategy = AuthStrategyRegistry.resolve(AUTH_PROVIDERS.EMAIL);
      await strategy.changePassword(req.body, req.user);

      return res
        .status(StatusCodes.OK)
        .clearCookie('accessToken')
        .clearCookie('refreshToken')
        .json(new ApiResponse(StatusCodes.OK, null, 'Password changed. Please login again.'));
    }),
  };
};
