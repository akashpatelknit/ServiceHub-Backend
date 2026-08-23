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

// Refresh tokens rotate on every use (one active token per user). Without a grace
// window, two near-simultaneous refreshes for the same actor — a second open tab, a
// retried request, a stale pre-login attempt resolving late — race: the first
// rotates the stored token out from under the second, which then gets rejected as a
// mismatch and force-logs the user out even though nothing was actually wrong. This
// window lets the immediately-previous token still redeem successfully for a few
// seconds after rotation, without weakening rotation for anything older.
export const REFRESH_TOKEN_GRACE_MS = 30 * 1000;
