/**
 * Global Integration Test Setup
 *
 * This file runs before all integration tests to set up the test environment.
 */

import { beforeAll, afterAll } from 'vitest';

// Global setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  // Wait for database to be ready (if using real database)
  if (process.env.DATABASE_URL) {
    console.log('Waiting for database connection...');
    // Add database connection check here if needed
  }

  console.log('Integration test environment initialized');
});

// Global teardown
afterAll(async () => {
  // Cleanup any global resources
  console.log('Integration test environment cleaned up');
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
