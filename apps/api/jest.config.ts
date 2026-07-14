import type { Config } from 'jest';

/**
 * Unit test configuration.
 *
 * Runs `*.spec.ts` files located alongside their sources under `src`. Uses
 * ts-jest with the API's decorator-aware tsconfig so NestJS providers compile
 * correctly. Workspace packages are resolved from their built `dist` output,
 * which Turbo guarantees is present via the `^build` dependency on the `test`
 * task.
 */
const config: Config = {
  displayName: 'api:unit',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  clearMocks: true,
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!main.ts'],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
