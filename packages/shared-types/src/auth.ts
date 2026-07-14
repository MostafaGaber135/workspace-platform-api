/**
 * Public authentication token pair returned to a client after a successful
 * credential exchange.
 *
 * This is the *transport* shape only — it deliberately contains no server-side
 * secrets or signing details. The API-internal JWT payload and signing
 * interfaces live in `apps/api` (auth foundation), not in shared types, so the
 * server's cryptographic contract never leaks into the client bundle.
 */
export interface AuthTokens {
  /** Short-lived access token (JWT). */
  accessToken: string;
  /** Longer-lived refresh token (JWT). */
  refreshToken: string;
  /** Access token lifetime in whole seconds. */
  accessTokenExpiresIn: number;
}

/**
 * Minimal public representation of the authenticated principal, safe to send to
 * the client. Never includes the password hash or other sensitive fields.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
