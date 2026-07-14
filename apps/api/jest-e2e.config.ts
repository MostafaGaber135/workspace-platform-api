import type { Config } from 'jest';

/**
 * End-to-end / integration test configuration.
 *
 * Boots the Nest application in-memory (via @nestjs/testing) and exercises HTTP
 * endpoints with supertest. Phase 1 covers the health endpoint, which has no
 * database dependency, so these tests run without a live PostgreSQL instance.
 */
const config: Config = {
  displayName: 'api:e2e',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  clearMocks: true,
};

export default config;
