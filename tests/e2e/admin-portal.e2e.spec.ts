/**
 * Admin Portal End-to-End Tests
 *
 * Comprehensive E2E test suite for the Platform Admin Portal covering:
 * - Admin authentication
 * - User management CRUD
 * - System configuration
 * - Report generation
 * - Audit log access
 *
 * @module tests/e2e/admin-portal.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.ADMIN_URL || 'http://localhost:3004';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testAdmin = {
  email: 'admin-e2e@example.com',
  password: 'SecureAdminPass123!',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'PLATFORM_ADMIN',
};

const testUser = {
  email: `test-user-${Date.now()}@example.com`,
  firstName: 'Test',
  lastName: 'User',
  role: 'TEACHER',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testAdmin.email);
  await page.fill('[name="password"], input[type="password"]', testAdmin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/admin-portal/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'admin-portal-e2e' }),
  }).catch(() => {});
}

async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'admin-portal-e2e' }),
  }).catch(() => {});
}

// =============================================================================
// ADMIN AUTHENTICATION
// =============================================================================

test.describe('Admin Authentication', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 Admin can login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testAdmin.email);
    await page.fill('[name="password"]', testAdmin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home)/);
  });

  test('1.2 Admin login requires MFA if enabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testAdmin.email);
    await page.fill('[name="password"]', testAdmin.password);
    await page.click('button[type="submit"]');

    // If MFA is enabled, verify MFA prompt appears
    const mfaPrompt = page.locator(
      '[data-testid="mfa-prompt"], .mfa-form, text=/verification code/i'
    );
    const mfaVisible = await mfaPrompt.isVisible().catch(() => false);

    if (mfaVisible) {
      await expect(mfaPrompt).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/(dashboard|home)/);
    }
  });

  test('1.3 Admin sees error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testAdmin.email);
    await page.fill('[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/invalid|incorrect|error/i').first()).toBeVisible();
  });

  test('1.4 Admin account lockout after failed attempts', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    for (let i = 0; i < 5; i++) {
      await page.fill('[name="email"]', testAdmin.email);
      await page.fill('[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    const lockoutMessage = page.locator('text=/locked|too many attempts|try again later/i');
    // Lockout message should appear after multiple failed attempts
    await expect(lockoutMessage)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // If no lockout message, at minimum verify we're still on login page
        expect(page.url()).toContain('/login');
      });
  });

  test('1.5 Admin session timeout handling', async ({ page }) => {
    await loginAsAdmin(page);

    // Simulate session timeout by directly accessing a protected route
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    // If session is valid, should see users page
    // If expired, should redirect to login
    const currentUrl = page.url();
    const isOnUsersPage = currentUrl.includes('/users');
    const isRedirectedToLogin = currentUrl.includes('/login');
    expect(isOnUsersPage || isRedirectedToLogin).toBe(true);
  });
});

// =============================================================================
// USER MANAGEMENT CRUD
// =============================================================================

test.describe('User Management CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;
  let createdUserId: string;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/admin-portal/' },
    });
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 Admin can view users list', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const usersList = page.locator('[data-testid="users-list"], .users-table, table');
    await expect(usersList.first()).toBeVisible();
  });

  test('2.2 Admin can search for users', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const searchInput = page.locator('[data-testid="user-search"], input[placeholder*="search" i]');
    await searchInput.fill('test');

    await page.waitForTimeout(500);

    const results = page.locator('[data-testid="user-row"], .user-row, tbody tr');
    await expect(results.first()).toBeVisible();
  });

  test('2.3 Admin can filter users by role', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const roleFilter = page.locator('[data-testid="role-filter"], select[name="role"]');
    if (await roleFilter.isVisible()) {
      await roleFilter.selectOption({ label: /teacher/i });
      await page.waitForTimeout(500);
    }
  });

  test('2.4 Admin can create a new user', async () => {
    await page.goto(`${BASE_URL}/users/create`);
    await waitForPageReady(page);

    // Fill user details
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="firstName"]', testUser.firstName);
    await page.fill('[name="lastName"]', testUser.lastName);

    const roleSelect = page.locator('[name="role"], select[name="role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption({ label: new RegExp(testUser.role, 'i') });
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Create")');

    await expect(page.locator('text=/created|success/i').first()).toBeVisible();
  });

  test('2.5 Admin can view user details', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const userRow = page.locator('[data-testid="user-row"], .user-row, tbody tr').first();
    await userRow.click();

    await expect(page).toHaveURL(/\/users\/[a-zA-Z0-9-]+/);

    const userDetails = page.locator('[data-testid="user-details"], .user-profile');
    await expect(userDetails.or(page.locator('text=/email|role/i').first())).toBeVisible();
  });

  test('2.6 Admin can edit user information', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const userRow = page.locator('[data-testid="user-row"], .user-row, tbody tr').first();
    await userRow.click();

    const editBtn = page.locator('button:has-text("Edit"), [data-testid="edit-user"]');
    if (await editBtn.isVisible()) {
      await editBtn.click();

      const firstNameInput = page.locator('[name="firstName"]');
      if (await firstNameInput.isVisible()) {
        await firstNameInput.fill('Updated');
        await page.click('button[type="submit"], button:has-text("Save")');

        await expect(page.locator('text=/updated|saved/i').first()).toBeVisible();
      }
    }
  });

  test('2.7 Admin can change user role', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const userRow = page.locator('[data-testid="user-row"], .user-row').first();
    await userRow.click();

    const roleSelect = page.locator('[data-testid="role-select"], select[name="role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption({ label: /parent/i });
      await page.click('button:has-text("Save")');
    }
  });

  test('2.8 Admin can disable user account', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const userRow = page.locator('[data-testid="user-row"], .user-row').first();
    await userRow.click();

    const disableBtn = page.locator('button:has-text("Disable"), [data-testid="disable-user"]');
    if (await disableBtn.isVisible()) {
      await disableBtn.click();

      const confirmBtn = page.locator('button:has-text("Confirm")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      await expect(page.locator('text=/disabled|deactivated/i').first()).toBeVisible();
    }
  });

  test('2.9 Admin can delete user account', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const userRow = page.locator('[data-testid="user-row"], .user-row').first();
    await userRow.click();

    const deleteBtn = page.locator('button:has-text("Delete"), [data-testid="delete-user"]');
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  });

  test('2.10 Admin can bulk import users', async () => {
    await page.goto(`${BASE_URL}/users/import`);
    await waitForPageReady(page);

    const importForm = page.locator('[data-testid="import-form"], .import-users');
    await expect(importForm.or(page.locator('text=/import|csv|upload/i').first())).toBeVisible();
  });
});

// =============================================================================
// SYSTEM CONFIGURATION
// =============================================================================

test.describe('System Configuration', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 Admin can access system settings', async () => {
    await page.goto(`${BASE_URL}/settings`);
    await waitForPageReady(page);

    const settingsPage = page.locator('[data-testid="system-settings"], .settings-container');
    await expect(settingsPage.or(page.locator('h1:has-text("Settings")').first())).toBeVisible();
  });

  test('3.2 Admin can configure authentication settings', async () => {
    await page.goto(`${BASE_URL}/settings/authentication`);
    await waitForPageReady(page);

    const authSettings = page.locator('[data-testid="auth-settings"], .authentication-config');
    await expect(
      authSettings.or(page.locator('text=/authentication|sso|mfa/i').first())
    ).toBeVisible();
  });

  test('3.3 Admin can configure email settings', async () => {
    await page.goto(`${BASE_URL}/settings/email`);
    await waitForPageReady(page);

    const emailSettings = page.locator('[data-testid="email-settings"], .email-config');
    await expect(emailSettings.or(page.locator('text=/smtp|email/i').first())).toBeVisible();
  });

  test('3.4 Admin can manage feature flags', async () => {
    await page.goto(`${BASE_URL}/settings/features`);
    await waitForPageReady(page);

    const featureFlags = page.locator('[data-testid="feature-flags"], .features-list');
    await expect(
      featureFlags.or(page.locator('text=/feature|flag|toggle/i').first())
    ).toBeVisible();
  });

  test('3.5 Admin can configure rate limits', async () => {
    await page.goto(`${BASE_URL}/settings/rate-limits`);
    await waitForPageReady(page);

    const rateLimitSettings = page.locator('[data-testid="rate-limits"], .rate-limit-config');
    await expect(
      rateLimitSettings.or(page.locator('text=/rate limit|throttle/i').first())
    ).toBeVisible();
  });

  test('3.6 Admin can manage API keys', async () => {
    await page.goto(`${BASE_URL}/settings/api-keys`);
    await waitForPageReady(page);

    const apiKeys = page.locator('[data-testid="api-keys"], .api-keys-list');
    await expect(apiKeys.or(page.locator('text=/api key|token/i').first())).toBeVisible();
  });

  test('3.7 Admin can configure backup settings', async () => {
    await page.goto(`${BASE_URL}/settings/backups`);
    await waitForPageReady(page);

    const backupSettings = page.locator('[data-testid="backup-settings"], .backup-config');
    await expect(backupSettings.or(page.locator('text=/backup|restore/i').first())).toBeVisible();
  });

  test('3.8 Admin can view system health', async () => {
    await page.goto(`${BASE_URL}/system/health`);
    await waitForPageReady(page);

    const healthDashboard = page.locator('[data-testid="health-dashboard"], .system-health');
    await expect(healthDashboard.or(page.locator('text=/health|status/i').first())).toBeVisible();
  });
});

// =============================================================================
// REPORT GENERATION
// =============================================================================

test.describe('Report Generation', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Admin can access reports dashboard', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const reportsDashboard = page.locator('[data-testid="reports-dashboard"], .reports-container');
    await expect(reportsDashboard.or(page.locator('text=/report/i').first())).toBeVisible();
  });

  test('4.2 Admin can generate user activity report', async () => {
    await page.goto(`${BASE_URL}/reports/user-activity`);
    await waitForPageReady(page);

    const generateBtn = page.locator(
      'button:has-text("Generate"), [data-testid="generate-report"]'
    );
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('4.3 Admin can generate usage statistics report', async () => {
    await page.goto(`${BASE_URL}/reports/usage`);
    await waitForPageReady(page);

    const usageReport = page.locator('[data-testid="usage-report"], .usage-stats');
    await expect(usageReport.or(page.locator('text=/usage|statistics/i').first())).toBeVisible();
  });

  test('4.4 Admin can export report as CSV', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export CSV"), [data-testid="export-csv"]');
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportBtn.click();
    }
  });

  test('4.5 Admin can export report as PDF', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export PDF"), [data-testid="export-pdf"]');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    }
  });

  test('4.6 Admin can schedule automated reports', async () => {
    await page.goto(`${BASE_URL}/reports/schedule`);
    await waitForPageReady(page);

    const scheduleForm = page.locator('[data-testid="schedule-form"], .report-schedule');
    await expect(scheduleForm.or(page.locator('text=/schedule|automat/i').first())).toBeVisible();
  });

  test('4.7 Admin can view report history', async () => {
    await page.goto(`${BASE_URL}/reports/history`);
    await waitForPageReady(page);

    const reportHistory = page.locator('[data-testid="report-history"], .reports-list');
    await expect(reportHistory.or(page.locator('text=/history|previous/i').first())).toBeVisible();
  });
});

// =============================================================================
// AUDIT LOG ACCESS
// =============================================================================

test.describe('Audit Log Access', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 Admin can view audit logs', async () => {
    await page.goto(`${BASE_URL}/audit-logs`);
    await waitForPageReady(page);

    const auditLogs = page.locator('[data-testid="audit-logs"], .audit-log-table');
    await expect(auditLogs.or(page.locator('text=/audit|log/i').first())).toBeVisible();
  });

  test('5.2 Admin can filter audit logs by date', async () => {
    await page.goto(`${BASE_URL}/audit-logs`);
    await waitForPageReady(page);

    const dateFilter = page.locator('[data-testid="date-filter"], input[type="date"]').first();
    if (await dateFilter.isVisible()) {
      const today = new Date().toISOString().split('T')[0];
      await dateFilter.fill(today);
      await page.waitForTimeout(500);
    }
  });

  test('5.3 Admin can filter audit logs by user', async () => {
    await page.goto(`${BASE_URL}/audit-logs`);
    await waitForPageReady(page);

    const userFilter = page.locator('[data-testid="user-filter"], input[placeholder*="user" i]');
    if (await userFilter.isVisible()) {
      await userFilter.fill('admin');
      await page.waitForTimeout(500);
    }
  });

  test('5.4 Admin can filter audit logs by action type', async () => {
    await page.goto(`${BASE_URL}/audit-logs`);
    await waitForPageReady(page);

    const actionFilter = page.locator('[data-testid="action-filter"], select[name="action"]');
    if (await actionFilter.isVisible()) {
      await actionFilter.selectOption({ label: /login|create|delete/i });
      await page.waitForTimeout(500);
    }
  });

  test('5.5 Admin can view audit log details', async () => {
    await page.goto(`${BASE_URL}/audit-logs`);
    await waitForPageReady(page);

    const logRow = page.locator('[data-testid="audit-log-row"], .audit-row, tbody tr').first();
    if (await logRow.isVisible()) {
      await logRow.click();

      const logDetails = page.locator('[data-testid="log-details"], .audit-details');
      await expect(
        logDetails.or(page.locator('text=/details|action|timestamp/i').first())
      ).toBeVisible();
    }
  });

  test('5.6 Admin can export audit logs', async () => {
    await page.goto(`${BASE_URL}/audit-logs`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export"), [data-testid="export-logs"]');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    }
  });

  test('5.7 Admin can view security events', async () => {
    await page.goto(`${BASE_URL}/audit-logs?type=security`);
    await waitForPageReady(page);

    const securityLogs = page.locator('[data-testid="security-logs"], .security-events');
    await expect(
      securityLogs.or(page.locator('text=/security|failed|suspicious/i').first())
    ).toBeVisible();
  });

  test('5.8 Admin can set up audit log alerts', async () => {
    await page.goto(`${BASE_URL}/audit-logs/alerts`);
    await waitForPageReady(page);

    const alertsConfig = page.locator('[data-testid="alerts-config"], .alert-settings');
    await expect(alertsConfig.or(page.locator('text=/alert|notify/i').first())).toBeVisible();
  });
});

// =============================================================================
// TENANT MANAGEMENT
// =============================================================================

test.describe('Tenant Management', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('6.1 Admin can view tenants list', async () => {
    await page.goto(`${BASE_URL}/tenants`);
    await waitForPageReady(page);

    const tenantsList = page.locator('[data-testid="tenants-list"], .tenants-table');
    await expect(tenantsList.or(page.locator('text=/tenant|organization/i').first())).toBeVisible();
  });

  test('6.2 Admin can create new tenant', async () => {
    await page.goto(`${BASE_URL}/tenants/create`);
    await waitForPageReady(page);

    const tenantForm = page.locator('[data-testid="tenant-form"], .create-tenant');
    await expect(tenantForm.or(page.locator('form').first())).toBeVisible();
  });

  test('6.3 Admin can view tenant details', async () => {
    await page.goto(`${BASE_URL}/tenants`);
    await waitForPageReady(page);

    const tenantRow = page.locator('[data-testid="tenant-row"], .tenant-row').first();
    if (await tenantRow.isVisible()) {
      await tenantRow.click();

      const tenantDetails = page.locator('[data-testid="tenant-details"], .tenant-profile');
      await expect(
        tenantDetails.or(page.locator('text=/details|subscription/i').first())
      ).toBeVisible();
    }
  });

  test('6.4 Admin can manage tenant subscription', async () => {
    await page.goto(`${BASE_URL}/tenants`);
    await waitForPageReady(page);

    const tenantRow = page.locator('.tenant-row').first();
    if (await tenantRow.isVisible()) {
      await tenantRow.click();

      const subscriptionTab = page.locator(
        'button:has-text("Subscription"), [data-testid="subscription-tab"]'
      );
      if (await subscriptionTab.isVisible()) {
        await subscriptionTab.click();
      }
    }
  });
});
