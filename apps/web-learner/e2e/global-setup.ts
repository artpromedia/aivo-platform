import { chromium, FullConfig } from '@playwright/test';
import { TestDataFactory } from './utils/test-data-factory';

/**
 * Global Setup for Playwright Tests
 *
 * Runs once before all tests:
 * - Initialize test data factory
 * - Create shared test users
 * - Verify API availability
 * - Set up authentication state
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
  const apiURL = process.env.E2E_API_URL || 'http://localhost:4000/api';

  // Initialize test data factory
  await TestDataFactory.initialize();

  // Launch browser for health check
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Verify frontend is accessible
    console.log(`📡 Checking frontend availability at ${baseURL}...`);
    const frontendResponse = await page.goto(baseURL, { timeout: 30000 });
    if (!frontendResponse?.ok()) {
      throw new Error(`Frontend not available: ${frontendResponse?.status()}`);
    }
    console.log('✅ Frontend is available');

    // Verify API is accessible
    console.log(`📡 Checking API availability at ${apiURL}...`);
    const apiResponse = await page.request.get(`${apiURL}/health`);
    if (!apiResponse.ok()) {
      throw new Error(`API not available: ${apiResponse.status()}`);
    }
    console.log('✅ API is available');

    // Create shared test users for parallel tests
    console.log('👤 Creating shared test users...');
    const sharedUsers = await createSharedTestUsers();

    // Store shared data for tests
    process.env.SHARED_TEST_USERS = JSON.stringify(sharedUsers);

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function createSharedTestUsers() {
  const users = {
    student: await TestDataFactory.createUser({
      role: 'student',
      verified: true,
      email: `test-student-${Date.now()}@test.aivo.edu`,
    }),
    teacher: await TestDataFactory.createUser({
      role: 'teacher',
      verified: true,
      email: `test-teacher-${Date.now()}@test.aivo.edu`,
    }),
    parent: await TestDataFactory.createUser({
      role: 'parent',
      verified: true,
      email: `test-parent-${Date.now()}@test.aivo.edu`,
    }),
    admin: await TestDataFactory.createUser({
      role: 'admin',
      verified: true,
      email: `test-admin-${Date.now()}@test.aivo.edu`,
    }),
  };

  return users;
}

export default globalSetup;
