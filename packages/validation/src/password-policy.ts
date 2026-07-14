/**
 * Password policy constants.
 *
 * Encodes the credential rules fixed by PRD §12.2 (Authentication Security):
 * a minimum length of 12 characters. A conservative maximum is enforced to
 * bound hashing cost and reject pathological inputs. These constants are the
 * single source of truth reused by both the client-side form schema and the
 * server-side validation schema so the two can never drift.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
