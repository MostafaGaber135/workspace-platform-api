/**
 * Injection token for the {@link PasswordHasher} implementation.
 */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/**
 * Abstraction over password hashing so the concrete algorithm can be swapped
 * without touching callers (Architecture Addendum §12.2 permits argon2/bcrypt).
 * The MVP binds this to an argon2 implementation.
 */
export interface PasswordHasher {
  /**
   * Hashes a plaintext password into a self-describing hash string (algorithm,
   * parameters, salt, and digest are all encoded within the returned value).
   */
  hash(plainText: string): Promise<string>;

  /**
   * Verifies a plaintext password against a previously produced hash. Returns
   * `false` for a mismatch or a malformed hash; never throws for bad input.
   */
  verify(hash: string, plainText: string): Promise<boolean>;
}
