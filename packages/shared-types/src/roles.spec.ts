import { describe, expect, it } from 'vitest';
import { Role, isRole } from './roles';

describe('Role', () => {
  it('exposes OWNER and MEMBER as string constants', () => {
    expect(Role.OWNER).toBe('OWNER');
    expect(Role.MEMBER).toBe('MEMBER');
  });
});

describe('isRole', () => {
  it('returns true for known roles', () => {
    expect(isRole('OWNER')).toBe(true);
    expect(isRole('MEMBER')).toBe(true);
  });

  it('returns false for unknown values', () => {
    expect(isRole('ADMIN')).toBe(false);
    expect(isRole('')).toBe(false);
    expect(isRole('owner')).toBe(false);
  });
});
