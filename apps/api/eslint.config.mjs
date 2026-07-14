import baseConfig from '../../eslint.config.mjs';

/**
 * API ESLint configuration.
 *
 * Extends the shared root config but disables `consistent-type-imports`:
 * NestJS relies on runtime value imports of injectable classes to emit
 * constructor-injection metadata (`emitDecoratorMetadata`). Forcing type-only
 * imports would erase those references and break dependency injection at
 * runtime, so the rule is turned off for the entire API.
 */
export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
