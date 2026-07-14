import { describe, expect, it } from 'vitest';
import { credentialsSchema, emailSchema, passwordSchema } from './auth.schema';
import { PASSWORD_MIN_LENGTH } from './password-policy';

describe('emailSchema', () => {
  it('trims whitespace but preserves the original case for display', () => {
    expect(emailSchema.parse('  User@Example.COM  ')).toBe('User@Example.COM');
  });

  it('rejects malformed emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a password at the minimum length', () => {
    const value = 'a'.repeat(PASSWORD_MIN_LENGTH);
    expect(passwordSchema.parse(value)).toBe(value);
  });

  it('rejects a password shorter than the minimum length', () => {
    const value = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });

  it('does not trim password content', () => {
    const value = `  ${'x'.repeat(PASSWORD_MIN_LENGTH)}  `;
    expect(passwordSchema.parse(value)).toBe(value);
  });
});

describe('credentialsSchema', () => {
  it('parses a valid credential pair, preserving email case', () => {
    const parsed = credentialsSchema.parse({
      email: 'Dana@Example.com',
      password: 'correct horse battery',
    });
    expect(parsed.email).toBe('Dana@Example.com');
    expect(parsed.password).toBe('correct horse battery');
  });

  it('reports field errors for invalid input', () => {
    const result = credentialsSchema.safeParse({ email: 'bad', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain('email');
      expect(fields).toContain('password');
    }
  });
});
