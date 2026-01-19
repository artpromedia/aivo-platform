import sharedConfig from '../../eslint.config.mjs';

export default [
  ...sharedConfig,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      globals: {
        React: 'readonly',
      },
    },
    rules: {
      // Disable rules that are too strict for this package
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/prefer-for-of': 'warn',
      // React is available via the jsx runtime
      'no-undef': 'off',
    },
  },
];
