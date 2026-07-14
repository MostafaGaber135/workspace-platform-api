/**
 * Canonical email normalization used across the system.
 *
 * Every user-creation and lookup path derives `User.normalizedEmail` from raw
 * input with this function, and the unique constraint on `normalizedEmail`
 * guarantees no two accounts can differ only by case or surrounding whitespace.
 * The original-cased address is retained separately in `User.email` for display.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
