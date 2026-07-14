import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  REFRESH_TOKEN_TTL_SECONDS,
  type AppConfig,
} from '@developeros/config';
import { APP_CONFIG } from '../config/app-config.module';
import {
  type JwtPayload,
  type SignedToken,
  type TokenService,
  type TokenSubject,
  type TokenType,
} from './interfaces/token-service.interface';

/**
 * `jsonwebtoken`-backed {@link TokenService}.
 *
 * Access and refresh tokens are signed with separate secrets (validated at
 * startup to differ) and carry `iss`/`aud` claims plus an internal `type` claim
 * so the two token kinds can never be interchanged. Verification failures are
 * surfaced as {@link UnauthorizedException}, which the global exception filter
 * maps to a `401 UNAUTHORIZED` response.
 */
@Injectable()
export class JwtTokenService implements TokenService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  signAccessToken(subject: TokenSubject): SignedToken {
    return this.sign(subject, 'access', this.config.JWT_ACCESS_SECRET, ACCESS_TOKEN_TTL_SECONDS);
  }

  signRefreshToken(subject: TokenSubject): SignedToken {
    return this.sign(subject, 'refresh', this.config.JWT_REFRESH_SECRET, REFRESH_TOKEN_TTL_SECONDS);
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.verify(token, this.config.JWT_ACCESS_SECRET, 'access');
  }

  verifyRefreshToken(token: string): JwtPayload {
    return this.verify(token, this.config.JWT_REFRESH_SECRET, 'refresh');
  }

  private sign(
    subject: TokenSubject,
    type: TokenType,
    secret: string,
    expiresInSeconds: number,
  ): SignedToken {
    const payload: JwtPayload = { sub: subject.id, email: subject.email, type };
    const token = jwt.sign(payload, secret, {
      expiresIn: expiresInSeconds,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return { token, expiresInSeconds };
  }

  private verify(token: string, secret: string, expectedType: TokenType): JwtPayload {
    let decoded: unknown;
    try {
      decoded = jwt.verify(token, secret, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!this.isJwtPayload(decoded)) {
      throw new UnauthorizedException('Malformed token payload');
    }

    if (decoded.type !== expectedType) {
      throw new UnauthorizedException('Unexpected token type');
    }

    return { sub: decoded.sub, email: decoded.email, type: decoded.type };
  }

  private isJwtPayload(value: unknown): value is JwtPayload {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.sub === 'string' &&
      typeof candidate.email === 'string' &&
      (candidate.type === 'access' || candidate.type === 'refresh')
    );
  }
}
