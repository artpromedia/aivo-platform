import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables
dotenvConfig({ path: path.resolve(__dirname, '.env.test') });

/**
 * Playwright Configuration for AIVO Learner App
 *
 * Comprehensive E2E testing setup with:
 * - Multi-browser support (Chrome, Firefox, Safari, Edge)
 * - Mobile device emulation
 * - Visual comparison testing
 * - Accessibility testing
 * - Video recording on failure
 * - Network interception
 * - Performance metrics collection
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Timeout per test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is left in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 4 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['list'],
    // Custom analytics reporter
    ['./reporters/analytics-reporter.ts'],
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL,

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'on-first-retry',

    // Default viewport
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Locale
    locale: 'en-US',

    // Timezone
    timezoneId: 'America/New_York',

    // Geolocation (for location-based features)
    geolocation: { latitude: 40.7128, longitude: -74.006 },

    // Permissions
    permissions: ['geolocation', 'notifications'],

    // Extra HTTP headers for test identification
    extraHTTPHeaders: {
      'x-test-id': 'playwright-e2e',
      'x-test-run': process.env.TEST_RUN_ID || 'local',
    },

    // Storage state for authenticated sessions
    storageState: undefined,
  },

  // Project configurations
  projects: [
    // =========================================================================
    // SETUP & TEARDOWN PROJECTS
    // =========================================================================
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },

    // =========================================================================
    // AUTHENTICATION SETUP
    // =========================================================================
    {
      name: 'auth-setup',
      testMatch: '**/auth.setup.ts',
    },

    // =========================================================================
    // DESKTOP BROWSERS
    // =========================================================================
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup', 'auth-setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup', 'auth-setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup', 'auth-setup'],
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
      dependencies: ['setup', 'auth-setup'],
    },

    // =========================================================================
    // MOBILE DEVICES
    // =========================================================================
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup', 'auth-setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
      dependencies: ['setup', 'auth-setup'],
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
      dependencies: ['setup', 'auth-setup'],
    },

    // =========================================================================
    // ACCESSIBILITY TESTING
    // =========================================================================
    {
      name: 'accessibility',
      testMatch: '**/*.a11y.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup', 'auth-setup'],
    },

    // =========================================================================
    // VISUAL REGRESSION TESTING
    // =========================================================================
    {
      name: 'visual',
      testMatch: '**/*.visual.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup', 'auth-setup'],
    },

    // =========================================================================
    // PERFORMANCE TESTING
    // =========================================================================
    {
      name: 'performance',
      testMatch: '**/*.perf.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
      dependencies: ['setup', 'auth-setup'],
    },

    // =========================================================================
    // API TESTING
    // =========================================================================
    {
      name: 'api',
      testMatch: '**/*.api.spec.ts',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:4000/api',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration (for local development)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        stdout: 'pipe',
        stderr: 'pipe',
      },

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Snapshot directory
  snapshotDir: '__snapshots__',

  // Preserve output on failure only
  preserveOutput: 'failures-only',

  // Metadata for reporting
  metadata: {
    project: 'aivo-learner',
    environment: process.env.TEST_ENV || 'local',
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown',
  },
});
