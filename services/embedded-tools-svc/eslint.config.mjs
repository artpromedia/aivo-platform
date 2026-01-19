import sharedConfig from '../../eslint.config.mjs';

export default [
  ...sharedConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Disable rules that require strictNullChecks (this package extends tsconfig.compat.json)
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
];
