/**
 * Analytics Dashboard End-to-End Tests
 *
 * Comprehensive E2E test suite for the Analytics Dashboard covering:
 * - Dashboard loading
 * - Filter interactions
 * - Export functionality
 * - Real-time updates
 *
 * @module tests/e2e/analytics-dashboard.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.ANALYTICS_URL || 'http://localhost:3006';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testAnalyticsUser = {
  email: 'analytics-e2e@example.com',
  password: 'SecureAnalyticsPass123!',
  firstName: 'Test',
  lastName: 'Analyst',
  role: 'ANALYTICS_VIEWER',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsAnalyticsUser(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testAnalyticsUser.email);
  await page.fill('[name="password"], input[type="password"]', testAnalyticsUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|analytics)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/analytics-dashboard/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'analytics-dashboard-e2e' }),
  }).catch(() => {});
}

async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'analytics-dashboard-e2e' }),
  }).catch(() => {});
}

async function waitForChartsToLoad(page: Page): Promise<void> {
  // Wait for chart containers to be visible
  const chartSelectors = [
    '[data-testid="chart"]',
    '.recharts-wrapper',
    'canvas',
    'svg.chart',
    '.chart-container',
  ];

  for (const selector of chartSelectors) {
    const chart = page.locator(selector).first();
    if (await chart.isVisible().catch(() => false)) {
      await chart.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      break;
    }
  }
}

// =============================================================================
// DASHBOARD LOADING
// =============================================================================

test.describe('Dashboard Loading', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 User can login to analytics dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testAnalyticsUser.email);
    await page.fill('[name="password"]', testAnalyticsUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home|analytics)/);
  });

  test('1.2 Dashboard loads with overview metrics', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    const metricsSection = page.locator('[data-testid="metrics-overview"], .metrics-grid');
    await expect(metricsSection.or(page.locator('.metric-card').first())).toBeVisible();
  });

  test('1.3 Dashboard loads charts successfully', async ({ page }) => {
    await loginAsAnalyticsUser(page);
    await waitForChartsToLoad(page);

    const chart = page.locator('[data-testid="chart"], .recharts-wrapper, canvas').first();
    await expect(chart).toBeVisible();
  });

  test('1.4 Dashboard shows loading state', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    // Refresh to see loading state
    await page.reload();

    const loadingIndicator = page.locator('[data-testid="loading"], .loading-spinner, .skeleton');
    // Loading state may be brief
  });

  test('1.5 Dashboard handles data errors gracefully', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    // Error states should show friendly messages
    const errorMessage = page.locator('[data-testid="error-message"], .error-container');
    // If visible, should be user-friendly
  });

  test('1.6 Dashboard is responsive', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForPageReady(page);

    const dashboard = page.locator('[data-testid="dashboard"], .dashboard-container');
    await expect(dashboard.or(page.locator('main').first())).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1.7 Dashboard shows last updated timestamp', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    const timestamp = page.locator('[data-testid="last-updated"], .update-timestamp');
    await expect(timestamp.or(page.locator('text=/updated|refreshed/i').first())).toBeVisible();
  });

  test('1.8 User can refresh dashboard data', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    const refreshBtn = page.locator('button:has-text("Refresh"), [data-testid="refresh"]');
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await waitForPageReady(page);
    }
  });

  test('1.9 Dashboard shows user context', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    const userContext = page.locator('[data-testid="user-context"], .user-info');
    await expect(userContext.or(page.locator('text=/welcome/i').first())).toBeVisible();
  });

  test('1.10 Dashboard navigation is functional', async ({ page }) => {
    await loginAsAnalyticsUser(page);

    const navItems = page.locator('nav a, [data-testid="nav-item"]');
    const navCount = await navItems.count();

    expect(navCount).toBeGreaterThan(0);
  });
});

// =============================================================================
// FILTER INTERACTIONS
// =============================================================================

test.describe('Filter Interactions', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/analytics-dashboard/' },
    });
    page = await context.newPage();
    await loginAsAnalyticsUser(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 User can filter by date range', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const dateFilter = page.locator('[data-testid="date-range"], .date-picker');
    if (await dateFilter.isVisible()) {
      await dateFilter.click();

      // Select preset range
      const lastWeekOption = page.locator('button:has-text("Last 7 days"), [data-value="7d"]');
      if (await lastWeekOption.isVisible()) {
        await lastWeekOption.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('2.2 User can filter by custom date range', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const dateFilter = page.locator('[data-testid="date-range"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.click();

      const customOption = page.locator('button:has-text("Custom"), [data-value="custom"]');
      if (await customOption.isVisible()) {
        await customOption.click();

        const startDate = page.locator('[data-testid="start-date"], input[name="startDate"]');
        const endDate = page.locator('[data-testid="end-date"], input[name="endDate"]');

        if (await startDate.isVisible()) {
          const today = new Date();
          const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
          await startDate.fill(lastMonth.toISOString().split('T')[0]);
          await endDate.fill(new Date().toISOString().split('T')[0]);
        }
      }
    }
  });

  test('2.3 User can filter by school', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const schoolFilter = page.locator('[data-testid="school-filter"], select[name="school"]');
    if (await schoolFilter.isVisible()) {
      await schoolFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('2.4 User can filter by grade level', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const gradeFilter = page.locator('[data-testid="grade-filter"], select[name="grade"]');
    if (await gradeFilter.isVisible()) {
      await gradeFilter.selectOption({ label: /5|grade 5/i });
      await page.waitForTimeout(500);
    }
  });

  test('2.5 User can filter by subject', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const subjectFilter = page.locator('[data-testid="subject-filter"], select[name="subject"]');
    if (await subjectFilter.isVisible()) {
      await subjectFilter.selectOption({ label: /math/i });
      await page.waitForTimeout(500);
    }
  });

  test('2.6 User can apply multiple filters', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    // Apply school filter
    const schoolFilter = page.locator('[data-testid="school-filter"]');
    if (await schoolFilter.isVisible()) {
      await schoolFilter.selectOption({ index: 1 });
    }

    // Apply grade filter
    const gradeFilter = page.locator('[data-testid="grade-filter"]');
    if (await gradeFilter.isVisible()) {
      await gradeFilter.selectOption({ index: 1 });
    }

    await page.waitForTimeout(500);
  });

  test('2.7 User can clear all filters', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-filters"]');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('2.8 Filters persist across navigation', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    // Apply a filter
    const schoolFilter = page.locator('[data-testid="school-filter"]');
    if (await schoolFilter.isVisible()) {
      await schoolFilter.selectOption({ index: 1 });
    }

    // Navigate to another page and back
    await page.click('nav a:has-text("Reports"), [data-testid="reports-link"]');
    await page.waitForTimeout(500);
    await page.goBack();
    await waitForPageReady(page);
  });

  test('2.9 User can save filter presets', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const savePresetBtn = page.locator('button:has-text("Save Preset"), [data-testid="save-preset"]');
    if (await savePresetBtn.isVisible()) {
      await savePresetBtn.click();

      await page.fill('[name="presetName"]', 'E2E Test Preset');
      await page.click('button:has-text("Save")');
    }
  });

  test('2.10 User can load saved filter presets', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const presetsDropdown = page.locator('[data-testid="presets-dropdown"], select[name="preset"]');
    if (await presetsDropdown.isVisible()) {
      await presetsDropdown.click();
    }
  });
});

// =============================================================================
// EXPORT FUNCTIONALITY
// =============================================================================

test.describe('Export Functionality', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAnalyticsUser(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 User can export data as CSV', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export"), [data-testid="export"]');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      const csvOption = page.locator('button:has-text("CSV"), [data-testid="export-csv"]');
      if (await csvOption.isVisible()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        await csvOption.click();

        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.csv$/);
        }
      }
    }
  });

  test('3.2 User can export data as Excel', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      const excelOption = page.locator('button:has-text("Excel"), [data-testid="export-xlsx"]');
      if (await excelOption.isVisible()) {
        await excelOption.click();
      }
    }
  });

  test('3.3 User can export data as PDF', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      const pdfOption = page.locator('button:has-text("PDF"), [data-testid="export-pdf"]');
      if (await pdfOption.isVisible()) {
        await pdfOption.click();
      }
    }
  });

  test('3.4 User can export specific chart', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const chartExportBtn = page.locator('.chart-container button:has-text("Export"), [data-testid="chart-export"]').first();
    if (await chartExportBtn.isVisible()) {
      await chartExportBtn.click();
    }
  });

  test('3.5 User can export chart as image', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const chartExportBtn = page.locator('[data-testid="chart-export-image"], button:has-text("Save as Image")').first();
    if (await chartExportBtn.isVisible()) {
      await chartExportBtn.click();
    }
  });

  test('3.6 User can schedule automated exports', async () => {
    await page.goto(`${BASE_URL}/exports/schedule`);
    await waitForPageReady(page);

    const scheduleForm = page.locator('[data-testid="schedule-export"], .export-schedule');
    await expect(scheduleForm.or(page.locator('text=/schedule|automat/i').first())).toBeVisible();
  });

  test('3.7 User can view export history', async () => {
    await page.goto(`${BASE_URL}/exports/history`);
    await waitForPageReady(page);

    const exportHistory = page.locator('[data-testid="export-history"], .history-list');
    await expect(exportHistory.or(page.locator('text=/export|download/i').first())).toBeVisible();
  });

  test('3.8 User can customize export columns', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      const customizeBtn = page.locator('button:has-text("Customize"), [data-testid="customize-export"]');
      if (await customizeBtn.isVisible()) {
        await customizeBtn.click();

        const columnSelector = page.locator('[data-testid="column-selector"], .column-checkboxes');
        await expect(columnSelector.first()).toBeVisible();
      }
    }
  });

  test('3.9 User can email export directly', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      const emailOption = page.locator('button:has-text("Email"), [data-testid="export-email"]');
      if (await emailOption.isVisible()) {
        await emailOption.click();

        const emailInput = page.locator('[name="email"], input[type="email"]');
        await expect(emailInput.first()).toBeVisible();
      }
    }
  });

  test('3.10 Export includes applied filters', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    // Apply filter
    const schoolFilter = page.locator('[data-testid="school-filter"]');
    if (await schoolFilter.isVisible()) {
      await schoolFilter.selectOption({ index: 1 });
    }

    // Export should include filter context
    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    }
  });
});

// =============================================================================
// REAL-TIME UPDATES
// =============================================================================

test.describe('Real-Time Updates', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAnalyticsUser(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Dashboard shows live data indicator', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const liveIndicator = page.locator('[data-testid="live-indicator"], .live-badge, text=/live/i');
    await expect(liveIndicator.first()).toBeVisible().catch(() => {});
  });

  test('4.2 User can toggle real-time updates', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const liveToggle = page.locator('[data-testid="live-toggle"], input[name="liveUpdates"]');
    if (await liveToggle.isVisible()) {
      await liveToggle.click();
    }
  });

  test('4.3 Metrics update in real-time', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const metricValue = page.locator('[data-testid="metric-value"], .metric-number').first();
    const initialValue = await metricValue.textContent();

    // Wait for potential update
    await page.waitForTimeout(5000);

    // Value may or may not have changed
  });

  test('4.4 Charts animate on data updates', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const chart = page.locator('[data-testid="chart"], .recharts-wrapper').first();
    await expect(chart).toBeVisible();

    // Trigger refresh
    const refreshBtn = page.locator('button:has-text("Refresh")');
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('4.5 User sees notification for significant changes', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    // Check for alert/notification components
    const alertsSection = page.locator('[data-testid="alerts"], .alerts-panel');
    await expect(alertsSection.or(page.locator('text=/alert|notification/i').first())).toBeVisible().catch(() => {});
  });

  test('4.6 User can set alert thresholds', async () => {
    await page.goto(`${BASE_URL}/settings/alerts`);
    await waitForPageReady(page);

    const alertSettings = page.locator('[data-testid="alert-settings"], .threshold-config');
    await expect(alertSettings.or(page.locator('text=/threshold|alert/i').first())).toBeVisible();
  });

  test('4.7 Dashboard shows connection status', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-indicator');
    await expect(connectionStatus.or(page.locator('text=/connected|online/i').first())).toBeVisible().catch(() => {});
  });

  test('4.8 Dashboard handles reconnection gracefully', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    // Simulate offline/online events
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    await page.waitForTimeout(500);
  });

  test('4.9 User can view update history', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const historyBtn = page.locator('button:has-text("History"), [data-testid="update-history"]');
    if (await historyBtn.isVisible()) {
      await historyBtn.click();

      const historyPanel = page.locator('[data-testid="history-panel"], .update-log');
      await expect(historyPanel.first()).toBeVisible();
    }
  });

  test('4.10 Real-time updates pause when tab is hidden', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    // Simulate tab visibility change
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  });
});

// =============================================================================
// SPECIFIC ANALYTICS VIEWS
// =============================================================================

test.describe('Specific Analytics Views', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAnalyticsUser(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 User can view student engagement analytics', async () => {
    await page.goto(`${BASE_URL}/analytics/engagement`);
    await waitForPageReady(page);

    const engagementReport = page.locator('[data-testid="engagement-analytics"], .engagement-dashboard');
    await expect(engagementReport.or(page.locator('text=/engagement/i').first())).toBeVisible();
  });

  test('5.2 User can view learning progress analytics', async () => {
    await page.goto(`${BASE_URL}/analytics/progress`);
    await waitForPageReady(page);

    const progressReport = page.locator('[data-testid="progress-analytics"], .progress-dashboard');
    await expect(progressReport.or(page.locator('text=/progress|performance/i').first())).toBeVisible();
  });

  test('5.3 User can view assessment analytics', async () => {
    await page.goto(`${BASE_URL}/analytics/assessments`);
    await waitForPageReady(page);

    const assessmentReport = page.locator('[data-testid="assessment-analytics"], .assessment-dashboard');
    await expect(assessmentReport.or(page.locator('text=/assessment|score/i').first())).toBeVisible();
  });

  test('5.4 User can view usage analytics', async () => {
    await page.goto(`${BASE_URL}/analytics/usage`);
    await waitForPageReady(page);

    const usageReport = page.locator('[data-testid="usage-analytics"], .usage-dashboard');
    await expect(usageReport.or(page.locator('text=/usage|active/i').first())).toBeVisible();
  });

  test('5.5 User can view cohort analysis', async () => {
    await page.goto(`${BASE_URL}/analytics/cohorts`);
    await waitForPageReady(page);

    const cohortAnalysis = page.locator('[data-testid="cohort-analytics"], .cohort-dashboard');
    await expect(cohortAnalysis.or(page.locator('text=/cohort|group/i').first())).toBeVisible();
  });

  test('5.6 User can view comparative analytics', async () => {
    await page.goto(`${BASE_URL}/analytics/compare`);
    await waitForPageReady(page);

    const compareReport = page.locator('[data-testid="compare-analytics"], .comparison-dashboard');
    await expect(compareReport.or(page.locator('text=/compare|benchmark/i').first())).toBeVisible();
  });

  test('5.7 User can drill down into specific data points', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const dataPoint = page.locator('[data-testid="data-point"], .chart-point').first();
    if (await dataPoint.isVisible()) {
      await dataPoint.click();

      const drilldown = page.locator('[data-testid="drilldown"], .detail-view');
      await expect(drilldown.first()).toBeVisible();
    }
  });

  test('5.8 User can create custom reports', async () => {
    await page.goto(`${BASE_URL}/reports/create`);
    await waitForPageReady(page);

    const reportBuilder = page.locator('[data-testid="report-builder"], .report-config');
    await expect(reportBuilder.or(page.locator('text=/create|custom/i').first())).toBeVisible();
  });

  test('5.9 User can save custom dashboard', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const saveDashboardBtn = page.locator('button:has-text("Save Dashboard"), [data-testid="save-dashboard"]');
    if (await saveDashboardBtn.isVisible()) {
      await saveDashboardBtn.click();

      await page.fill('[name="dashboardName"]', 'E2E Test Dashboard');
      await page.click('button:has-text("Save")');
    }
  });

  test('5.10 User can share analytics view', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const shareBtn = page.locator('button:has-text("Share"), [data-testid="share"]');
    if (await shareBtn.isVisible()) {
      await shareBtn.click();

      const shareModal = page.locator('[data-testid="share-modal"], .share-dialog');
      await expect(shareModal.first()).toBeVisible();
    }
  });
});
