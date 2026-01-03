import { FullConfig } from '@playwright/test';
import { TestDataFactory } from './utils/test-data-factory';

/**
 * Global Teardown for Playwright Tests
 *
 * Runs once after all tests:
 * - Cleanup test data
 * - Delete test users
 * - Generate test summary
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // Cleanup all test data created during tests
    console.log('🗑️ Cleaning up test data...');
    await TestDataFactory.cleanup();
    console.log('✅ Test data cleaned up');

    // Log test completion
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('⚠️ Teardown encountered errors:', error);
    // Don't throw - allow test results to be reported even if cleanup fails
  }
}

export default globalTeardown;
