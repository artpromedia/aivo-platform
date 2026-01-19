import sharedConfig from '../../eslint.config.mjs';

export default [
  ...sharedConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Disable rules that require strictNullChecks (this package extends tsconfig.compat.json)
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Downgrade various rules to warnings for this service
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-redeclare': 'off', // TypeScript const + type pattern
    },
  },
];
