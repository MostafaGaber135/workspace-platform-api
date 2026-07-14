import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('lower-cases and trims', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('collapses case-variant addresses to the same value', () => {
    expect(normalizeEmail('Ada@Example.com')).toBe(normalizeEmail('ADA@EXAMPLE.COM'));
  });

  it('is idempotent', () => {
    const once = normalizeEmail('Mixed@Case.com');
    expect(normalizeEmail(once)).toBe(once);
  });
});
