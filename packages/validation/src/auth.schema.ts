import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './password-policy';

/**
 * Email schema: trimmed and RFC-shaped, with the original case PRESERVED so it
 * can be stored as the display address (`User.email`). Case-insensitive
 * uniqueness is enforced separately on `User.normalizedEmail`, which callers
 * derive via `normalizeEmail()`. Keeping display and normalized forms distinct
 * avoids the two columns being identical.
 */
export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

/**
 * Password schema enforcing the PRD §12.2 policy (min length 12). Content is
 * never trimmed or transformed — passwords are treated as opaque secrets.
 */
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);

/**
 * Credentials payload for future sign-in / sign-up flows. Defined now as part
 * of the auth foundation; no endpoint consumes it in Phase 1.
 */
export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
