import { Module } from '@nestjs/common';
import { Argon2PasswordHasher } from './argon2-password-hasher';
import { JwtTokenService } from './jwt-token.service';
import { PASSWORD_HASHER } from './interfaces/password-hasher.interface';
import { TOKEN_SERVICE } from './interfaces/token-service.interface';

/**
 * Authentication foundation module.
 *
 * Phase 1 provides only the building blocks required by later auth flows: a
 * password hasher and a token service, each bound to an interface token so
 * consumers depend on the abstraction rather than the implementation. There are
 * deliberately no controllers or endpoints yet — sign-in/sign-up flows arrive
 * in a later phase.
 */
@Module({
  providers: [
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [PASSWORD_HASHER, TOKEN_SERVICE],
})
export class AuthModule {}
