/**
 * lint-staged configuration.
 *
 * Runs on the Husky `pre-commit` hook against staged files only, so commits
 * stay fast. TypeScript files in api/packages are linted with the root ESLint
 * flat config; everything is formatted with Prettier. Web files are formatted
 * but linted by Next's own pipeline in CI, not here.
 */
module.exports = {
  '{apps/api,packages/*}/**/*.ts': [
    'eslint --fix --no-warn-ignored',
    'prettier --write',
  ],
  'apps/web/**/*.{ts,tsx}': ['prettier --write'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
};
