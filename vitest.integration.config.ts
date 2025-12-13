import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests
 *
 * This configuration is specifically tuned for running tenant isolation
 * and other integration tests that require database and service setup.
 */
export default defineConfig({
  test: {
    // Only run integration tests
    include: ['tests/integration/**/*.test.ts'],

    // Exclude unit tests
    exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],

    // Global test setup
    globals: true,

    // Environment setup
    environment: 'node',

    // Increase timeout for integration tests (database setup, etc.)
    testTimeout: 30000,
    hookTimeout: 60000,

    // Run tests sequentially to avoid database conflicts
    sequence: {
      shuffle: false,
    },

    // Pool configuration for database tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in a single fork to share DB connection
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './reports/coverage',
      include: [
        'services/**/src/**/*.ts',
        'libs/**/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },

    // Reporter configuration
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './reports/integration-test-report.html',
    },

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    },

    // Setup files
    setupFiles: ['./tests/integration/setup.ts'],

    // Dependency optimization
    deps: {
      inline: [/@aivo\/.*/],
    },
  },

  // Path resolution
  resolve: {
    alias: {
      '@aivo/ts-types': path.resolve(__dirname, './libs/ts-types/src'),
      '@aivo/ts-utils': path.resolve(__dirname, './libs/ts-utils/src'),
      '@aivo/ts-rbac': path.resolve(__dirname, './libs/ts-rbac/src'),
    },
  },
});
