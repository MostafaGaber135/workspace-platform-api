/**
 * Injection token for the {@link TokenService} implementation.
 */
export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

/**
 * Discriminates the two kinds of JWT this system mints. The type is embedded in
 * the token payload and checked on verification so a refresh token can never be
 * accepted where an access token is required, and vice versa.
 */
export type TokenType = 'access' | 'refresh';

/**
 * The decoded, validated claims carried by a DeveloperOS JWT. This is an
 * API-internal type and is deliberately not shared with the web client.
 */
export interface JwtPayload {
  /** Subject — the user's id. */
  sub: string;
  /** The user's email, duplicated for convenience. */
  email: string;
  /** Token kind used to prevent cross-use of access/refresh tokens. */
  type: TokenType;
}

/**
 * The identity a token is minted for.
 */
export interface TokenSubject {
  id: string;
  email: string;
}

/**
 * A signed token plus its lifetime, so callers can communicate expiry to
 * clients without re-decoding the token.
 */
export interface SignedToken {
  token: string;
  expiresInSeconds: number;
}

/**
 * Abstraction over JWT signing/verification. Keeping this behind an interface
 * lets the signing strategy evolve (key rotation, alternate libraries) without
 * changing consumers.
 */
export interface TokenService {
  signAccessToken(subject: TokenSubject): SignedToken;
  signRefreshToken(subject: TokenSubject): SignedToken;
  /** Verifies an access token, throwing if invalid, expired, or wrong type. */
  verifyAccessToken(token: string): JwtPayload;
  /** Verifies a refresh token, throwing if invalid, expired, or wrong type. */
  verifyRefreshToken(token: string): JwtPayload;
}
