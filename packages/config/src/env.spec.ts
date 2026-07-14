import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadConfig } from './env';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/developeros',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CORS_ORIGINS: 'http://localhost:3000, https://app.developeros.dev',
} as NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('parses a valid environment into typed config', () => {
    const config = loadConfig(validEnv);
    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(4000);
    expect(config.isTest).toBe(true);
    expect(config.isProduction).toBe(false);
    expect(config.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://app.developeros.dev']);
  });

  it('applies defaults for optional variables', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://localhost:5432/db',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    } as NodeJS.ProcessEnv);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('throws EnvValidationError when required variables are missing', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(EnvValidationError);
  });

  it('rejects a non-PostgreSQL database url', () => {
    expect(() =>
      loadConfig({ ...validEnv, DATABASE_URL: 'mysql://localhost/db' } as NodeJS.ProcessEnv),
    ).toThrow(EnvValidationError);
  });

  it('rejects short JWT secrets', () => {
    expect(() =>
      loadConfig({ ...validEnv, JWT_ACCESS_SECRET: 'too-short' } as NodeJS.ProcessEnv),
    ).toThrow(EnvValidationError);
  });

  it('rejects identical access and refresh secrets', () => {
    const secret = 'c'.repeat(32);
    expect(() =>
      loadConfig({
        ...validEnv,
        JWT_ACCESS_SECRET: secret,
        JWT_REFRESH_SECRET: secret,
      } as NodeJS.ProcessEnv),
    ).toThrow(/different from JWT_ACCESS_SECRET/);
  });

  it('aggregates multiple issues into one error', () => {
    try {
      loadConfig({ JWT_ACCESS_SECRET: 'short' } as NodeJS.ProcessEnv);
      expect.unreachable('loadConfig should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const issues = (error as EnvValidationError).issues;
      expect(Object.keys(issues).length).toBeGreaterThanOrEqual(2);
    }
  });

  describe('PORT validation', () => {
    it('accepts the boundary values 1 and 65535', () => {
      expect(loadConfig({ ...validEnv, PORT: '1' } as NodeJS.ProcessEnv).PORT).toBe(1);
      expect(loadConfig({ ...validEnv, PORT: '65535' } as NodeJS.ProcessEnv).PORT).toBe(65535);
    });

    it('rejects 0 and out-of-range ports', () => {
      expect(() => loadConfig({ ...validEnv, PORT: '0' } as NodeJS.ProcessEnv)).toThrow(
        EnvValidationError,
      );
      expect(() => loadConfig({ ...validEnv, PORT: '65536' } as NodeJS.ProcessEnv)).toThrow(
        EnvValidationError,
      );
    });

    it('rejects non-integer and non-numeric ports', () => {
      expect(() => loadConfig({ ...validEnv, PORT: '80.5' } as NodeJS.ProcessEnv)).toThrow(
        EnvValidationError,
      );
      expect(() => loadConfig({ ...validEnv, PORT: 'abc' } as NodeJS.ProcessEnv)).toThrow(
        EnvValidationError,
      );
    });
  });

  describe('CORS origin validation', () => {
    it('accepts http and https origins with ports', () => {
      const config = loadConfig({
        ...validEnv,
        CORS_ORIGINS: 'http://localhost:3000,https://example.com',
      } as NodeJS.ProcessEnv);
      expect(config.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://example.com']);
    });

    it('rejects an origin that includes a path', () => {
      expect(() =>
        loadConfig({
          ...validEnv,
          CORS_ORIGINS: 'http://localhost:3000/app',
        } as NodeJS.ProcessEnv),
      ).toThrow(EnvValidationError);
    });

    it('rejects a non-http(s) scheme', () => {
      expect(() =>
        loadConfig({ ...validEnv, CORS_ORIGINS: 'ftp://example.com' } as NodeJS.ProcessEnv),
      ).toThrow(EnvValidationError);
    });

    it('rejects a malformed origin', () => {
      expect(() =>
        loadConfig({ ...validEnv, CORS_ORIGINS: 'not-a-url' } as NodeJS.ProcessEnv),
      ).toThrow(EnvValidationError);
    });
  });
});
