import sharedConfig from '../../eslint.config.mjs';

export default [
  ...sharedConfig,
  {
    rules: {
      // Disable no-undef for TypeScript files - TypeScript already handles this
      'no-undef': 'off',
      // Disable unnecessary type conversion rule - these are explicit conversions
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      // These rules require strictNullChecks which is disabled in tsconfig.compat.json
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      // Disable no-unnecessary-type-assertion - conflicts with type inference in non-strict mode
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      // Downgrade use-unknown-in-catch-callback-variable to warning
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
      // Downgrade no-base-to-string to warning
      '@typescript-eslint/no-base-to-string': 'warn',
    },
  },
];
