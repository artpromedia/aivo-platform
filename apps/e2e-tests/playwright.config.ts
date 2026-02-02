import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for AIVO Compliance E2E Tests
 *
 * Tests for regulatory compliance including:
 * - AI Safety (content filtering, prompt injection prevention)
 * - COPPA Compliance (parental consent, data collection limits)
 * - Data Privacy (encryption, PII masking, deletion)
 * - Age Verification (age gates, parental controls)
 *
 * @tags compliance, coppa, gdpr, ai-safety, audit
 */

export default defineConfig({
  testDir: './src/compliance',
  testMatch: '**/*.spec.ts',
  timeout: 120000, // Compliance tests may need longer timeouts
  expect: {
    timeout: 15000,
  },
  fullyParallel: false, // Run serially for compliance audit trail
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for audit consistency
  reporter: [
    ['html', { outputFolder: '../../test-results/compliance-report' }],
    ['json', { outputFile: '../../test-results/compliance-results.json' }],
    ['list'],
  ],
  outputDir: '../../test-results/compliance-output',
  use: {
    trace: 'on', // Always trace for compliance audit
    screenshot: 'on', // Screenshot all for compliance evidence
    video: 'on', // Video all for compliance audit
  },
  projects: [
    {
      name: 'compliance-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Metadata for compliance reporting
  metadata: {
    testSuite: 'AIVO Compliance Tests',
    complianceFrameworks: ['COPPA', 'GDPR', 'AI-Safety'],
    version: '1.0.0',
  },
});
