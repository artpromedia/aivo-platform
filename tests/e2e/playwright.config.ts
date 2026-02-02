import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for AIVO Portal E2E Tests
 *
 * This configuration covers tests for all portal applications:
 * - Student Portal
 * - Teacher Portal
 * - Parent Portal
 * - Admin Portal
 * - District Portal
 * - Curriculum Builder
 * - Analytics Dashboard
 */

export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../../test-results/e2e-report' }],
    ['list'],
  ],
  outputDir: '../../test-results/e2e-output',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
