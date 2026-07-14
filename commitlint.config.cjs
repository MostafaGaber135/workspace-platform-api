/**
 * Commitlint configuration.
 *
 * Enforces the Conventional Commits specification on every commit message,
 * validated by the Husky `commit-msg` hook. This keeps the git history
 * machine-readable for future changelog/versioning automation.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', ['sentence-case', 'lower-case']],
    'header-max-length': [2, 'always', 100],
  },
};
