import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();
  const password = 'correct horse battery staple';

  it('produces a hash that differs from the plaintext', async () => {
    const hash = await hasher.hash(password);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('produces distinct hashes for the same input (random salt)', async () => {
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);
    expect(first).not.toBe(second);
  });

  it('verifies a correct password', async () => {
    const hash = await hasher.hash(password);
    await expect(hasher.verify(hash, password)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hasher.hash(password);
    await expect(hasher.verify(hash, 'wrong password entirely')).resolves.toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(hasher.verify('not-a-valid-hash', password)).resolves.toBe(false);
  });
});
