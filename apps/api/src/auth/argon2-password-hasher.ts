import { Injectable } from '@nestjs/common';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { type PasswordHasher } from './interfaces/password-hasher.interface';

/**
 * argon2id-based {@link PasswordHasher}.
 *
 * argon2id is a memory-hard, adaptive password hashing function and the current
 * best-practice choice for credential storage. `@node-rs/argon2` ships prebuilt
 * native bindings, so no compiler toolchain is required to install it.
 *
 * The produced hash string is self-describing — it encodes the algorithm,
 * parameters, and salt — so no separate salt column or parameter storage is
 * needed. Verification of a malformed hash resolves to `false` rather than
 * throwing, keeping the contract total for callers.
 */
@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return argon2Hash(plainText);
  }

  async verify(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2Verify(hash, plainText);
    } catch {
      return false;
    }
  }
}
