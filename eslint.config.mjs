// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Root ESLint flat configuration.
 *
 * Applies to TypeScript sources in `packages/*`. `apps/web` uses Next.js' own
 * lint pipeline; `apps/api` composes this config and relaxes one rule (see its
 * local `eslint.config.mjs`). `prettier` is applied last to disable stylistic
 * rules that would fight the formatter.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'apps/web/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // NestJS (apps/api) relies on runtime value imports of injectable classes so
    // TypeScript emits constructor-injection metadata (`emitDecoratorMetadata`).
    // `consistent-type-imports` would rewrite those to type-only imports and
    // break dependency injection at runtime. It MUST be disabled here in the
    // ROOT config too, because the Husky/lint-staged pre-commit hook runs
    // `eslint --fix` from the repo root (this config) — a per-app config file is
    // not loaded in that context (flat config does not cascade).
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  prettier,
);
