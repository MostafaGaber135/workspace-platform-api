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
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        // TS2694 fires only against a non-generated/stale Prisma client, where the
        // generated `Prisma` namespace (incl. `InputJsonValue`) is absent. CI runs
        // `prisma generate` first, so the code type-checks there; the dedicated
        // `typecheck` gate still reports it. Ignoring only 2694 lets tests execute
        // without masking any other type error.
        diagnostics: { ignoreCodes: [2694] },
      },
    ],
  },
  clearMocks: true,
};

export default config;
