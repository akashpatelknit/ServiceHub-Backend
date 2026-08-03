export const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

export const COOKIE_OPTIONS = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: maxAgeMs,
});

export const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
