/**
 * Vitest Configuration for Integration Tests
 *
 * Specialized configuration for running comprehensive integration tests
 * across all microservices with proper isolation and reporting.
 *
 * @module tests/integration/vitest.config
 */

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['**/*.integration.test.ts', '**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Global test utilities
    globals: true,

    // Node environment for service tests
    environment: 'node',

    // Timeouts for integration tests (services take time to respond)
    testTimeout: 60000, // 60 seconds per test
    hookTimeout: 120000, // 2 minutes for setup/teardown

    // Run serially to avoid conflicts between test suites
    sequence: {
      shuffle: false,
    },

    // Single fork to share database connections and avoid race conditions
    pool: 'forks',
    // @ts-expect-error - poolOptions exists in newer Vitest versions
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Setup files
    setupFiles: ['./setup/global-setup.ts'],
    globalSetup: './setup/start-services.ts',

    // Coverage (disabled by default, enable with --coverage flag)
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './reports/coverage',
      include: ['../../services/**/src/**/*.ts', '../../libs/**/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
    },

    // Reporter configuration
    reporters: [
      'verbose',
      'html',
      ['junit', { outputFile: './reports/integration-results.xml' }],
    ],
    outputFile: {
      html: './reports/integration-report.html',
    },

    // Environment variables
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    },

    // Dependency optimization
    deps: {
      interopDefault: true,
    },
  },

  // Path resolution for monorepo imports
  resolve: {
    alias: {
      '@aivo/ts-types': path.resolve(__dirname, '../../libs/ts-types/src'),
      '@aivo/ts-utils': path.resolve(__dirname, '../../libs/ts-utils/src'),
      '@aivo/ts-rbac': path.resolve(__dirname, '../../libs/ts-rbac/src'),
      '@aivo/ts-shared': path.resolve(__dirname, '../../libs/ts-shared/src'),
      '@aivo/events': path.resolve(__dirname, '../../libs/events/src'),
      '@integration': path.resolve(__dirname, '.'),
    },
  },
});
