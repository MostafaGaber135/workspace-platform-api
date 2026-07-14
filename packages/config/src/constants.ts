/**
 * Cross-cutting, non-secret application constants.
 *
 * These are compile-time values shared by the auth foundation and elsewhere.
 * Secrets and environment-specific values are NOT here — they come from the
 * validated environment (see {@link ./env}).
 */

/** Access token lifetime, in seconds (15 minutes). Short-lived by design. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Refresh token lifetime, in seconds (7 days). */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** JWT issuer claim value identifying tokens minted by this API. */
export const JWT_ISSUER = 'developeros-api';

/** JWT audience claim value identifying the intended token consumer. */
export const JWT_AUDIENCE = 'developeros-web';
