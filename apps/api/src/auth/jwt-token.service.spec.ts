import { UnauthorizedException } from '@nestjs/common';
import { type AppConfig } from '@developeros/config';
import { JwtTokenService } from './jwt-token.service';

function buildConfig(): AppConfig {
  return {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://localhost:5432/developeros',
    JWT_ACCESS_SECRET: 'access-secret-access-secret-1234567890',
    JWT_REFRESH_SECRET: 'refresh-secret-refresh-secret-0987654321',
    CORS_ORIGINS: ['http://localhost:3000'],
    isProduction: false,
    isDevelopment: false,
    isTest: true,
  };
}

describe('JwtTokenService', () => {
  const subject = { id: 'user_123', email: 'dana@example.com' };
  let service: JwtTokenService;

  beforeEach(() => {
    service = new JwtTokenService(buildConfig());
  });

  it('signs an access token that verifies back to the subject', () => {
    const { token, expiresInSeconds } = service.signAccessToken(subject);
    expect(token).toBeTruthy();
    expect(expiresInSeconds).toBeGreaterThan(0);

    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe(subject.id);
    expect(payload.email).toBe(subject.email);
    expect(payload.type).toBe('access');
  });

  it('signs a refresh token that verifies back to the subject', () => {
    const { token } = service.signRefreshToken(subject);
    const payload = service.verifyRefreshToken(token);
    expect(payload.sub).toBe(subject.id);
    expect(payload.type).toBe('refresh');
  });

  it('rejects an access token when verified as a refresh token', () => {
    const { token } = service.signAccessToken(subject);
    expect(() => service.verifyRefreshToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects a refresh token when verified as an access token', () => {
    const { token } = service.signRefreshToken(subject);
    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different secret', () => {
    const other = new JwtTokenService({
      ...buildConfig(),
      JWT_ACCESS_SECRET: 'a-totally-different-access-secret-value-xyz',
    });
    const { token } = other.signAccessToken(subject);
    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects a garbage token', () => {
    expect(() => service.verifyAccessToken('garbage.token.value')).toThrow(UnauthorizedException);
  });
});
