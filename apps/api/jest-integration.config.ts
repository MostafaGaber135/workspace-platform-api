import type { Config } from 'jest';

/**
 * Database integration test configuration.
 *
 * Runs `*.integration-spec.ts` suites that connect to a real PostgreSQL via
 * Prisma. Requires `DATABASE_URL` to point at a database with migrations
 * applied (`prisma migrate deploy`). These tests fail when the database is
 * unavailable — that is intentional.
 */
const config: Config = {
  displayName: 'api:integration',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.integration-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  clearMocks: true,
  testTimeout: 30_000,
};

export default config;
