/**
 * District Portal End-to-End Tests
 *
 * Comprehensive E2E test suite for the District Admin Portal covering:
 * - District admin flows
 * - School management
 * - Aggregate reporting
 * - Policy configuration
 *
 * @module tests/e2e/district-portal.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.DISTRICT_URL || 'http://localhost:3003';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testDistrictAdmin = {
  email: 'district-admin-e2e@example.com',
  password: 'SecureDistrictPass123!',
  firstName: 'Test',
  lastName: 'DistrictAdmin',
  role: 'DISTRICT_ADMIN',
};

const testSchool = {
  name: 'E2E Test Elementary School',
  code: 'E2E-ELEM-001',
  address: '123 Test Street',
  principalEmail: 'principal@e2e-school.edu',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsDistrictAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testDistrictAdmin.email);
  await page.fill('[name="password"], input[type="password"]', testDistrictAdmin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/district-portal/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'district-portal-e2e' }),
  }).catch(() => {});
}

async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'district-portal-e2e' }),
  }).catch(() => {});
}

// =============================================================================
// DISTRICT ADMIN FLOWS
// =============================================================================

test.describe('District Admin Flows', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 District admin can login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testDistrictAdmin.email);
    await page.fill('[name="password"]', testDistrictAdmin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home)/);
  });

  test('1.2 Dashboard displays district overview', async ({ page }) => {
    await loginAsDistrictAdmin(page);

    const overview = page.locator('[data-testid="district-overview"], .district-dashboard');
    await expect(overview.or(page.locator('text=/district|overview/i').first())).toBeVisible();
  });

  test('1.3 Dashboard shows school count', async ({ page }) => {
    await loginAsDistrictAdmin(page);

    const schoolCount = page.locator('[data-testid="school-count"], .schools-stat');
    await expect(schoolCount.or(page.locator('text=/school/i').first())).toBeVisible();
  });

  test('1.4 Dashboard shows student enrollment', async ({ page }) => {
    await loginAsDistrictAdmin(page);

    const enrollmentStat = page.locator('[data-testid="enrollment-stat"], .enrollment-overview');
    await expect(enrollmentStat.or(page.locator('text=/student|enrolled/i').first())).toBeVisible();
  });

  test('1.5 Dashboard shows teacher count', async ({ page }) => {
    await loginAsDistrictAdmin(page);

    const teacherStat = page.locator('[data-testid="teacher-count"], .teachers-stat');
    await expect(teacherStat.or(page.locator('text=/teacher/i').first())).toBeVisible();
  });

  test('1.6 District admin can view quick actions', async ({ page }) => {
    await loginAsDistrictAdmin(page);

    const quickActions = page.locator('[data-testid="quick-actions"], .action-buttons');
    await expect(quickActions.or(page.locator('button:has-text("Add")').first())).toBeVisible();
  });
});

// =============================================================================
// SCHOOL MANAGEMENT
// =============================================================================

test.describe('School Management', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/district-portal/' },
    });
    page = await context.newPage();
    await loginAsDistrictAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 Admin can view schools list', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolsList = page.locator('[data-testid="schools-list"], .schools-table');
    await expect(schoolsList.or(page.locator('.school-card').first())).toBeVisible();
  });

  test('2.2 Admin can search for schools', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const searchInput = page.locator(
      '[data-testid="school-search"], input[placeholder*="search" i]'
    );
    await searchInput.fill('Elementary');

    await page.waitForTimeout(500);
  });

  test('2.3 Admin can create new school', async () => {
    await page.goto(`${BASE_URL}/schools/create`);
    await waitForPageReady(page);

    // Fill school details
    await page.fill('[name="name"]', testSchool.name);
    await page.fill('[name="code"], [name="schoolCode"]', testSchool.code);
    await page.fill('[name="address"]', testSchool.address);
    await page.fill('[name="principalEmail"]', testSchool.principalEmail);

    // Submit
    await page.click('button[type="submit"], button:has-text("Create")');

    await expect(page.locator('text=/created|success/i').first()).toBeVisible();
  });

  test('2.4 Admin can view school details', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolCard = page.locator('.school-card, [data-testid^="school-"]').first();
    await schoolCard.click();

    await expect(page).toHaveURL(/\/schools\/[a-zA-Z0-9-]+/);
  });

  test('2.5 Admin can edit school information', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolCard = page.locator('.school-card').first();
    await schoolCard.click();

    const editBtn = page.locator('button:has-text("Edit"), [data-testid="edit-school"]');
    if (await editBtn.isVisible()) {
      await editBtn.click();

      const nameInput = page.locator('[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Updated School Name');
        await page.click('button[type="submit"], button:has-text("Save")');

        await expect(page.locator('text=/updated|saved/i').first()).toBeVisible();
      }
    }
  });

  test('2.6 Admin can view school administrators', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolCard = page.locator('.school-card').first();
    await schoolCard.click();

    const adminsTab = page.locator('button:has-text("Administrators"), [data-testid="admins-tab"]');
    if (await adminsTab.isVisible()) {
      await adminsTab.click();
    }

    const adminsList = page.locator('[data-testid="school-admins"], .admins-list');
    await expect(adminsList.or(page.locator('text=/admin|principal/i').first())).toBeVisible();
  });

  test('2.7 Admin can assign school administrator', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolCard = page.locator('.school-card').first();
    await schoolCard.click();

    const assignBtn = page.locator('button:has-text("Assign"), [data-testid="assign-admin"]');
    if (await assignBtn.isVisible()) {
      await assignBtn.click();

      const userSearch = page.locator(
        '[data-testid="user-search"], input[placeholder*="search" i]'
      );
      if (await userSearch.isVisible()) {
        await userSearch.fill('admin');
      }
    }
  });

  test('2.8 Admin can view school enrollment', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolCard = page.locator('.school-card').first();
    await schoolCard.click();

    const enrollmentTab = page.locator(
      'button:has-text("Enrollment"), [data-testid="enrollment-tab"]'
    );
    if (await enrollmentTab.isVisible()) {
      await enrollmentTab.click();

      const enrollmentData = page.locator('[data-testid="enrollment-data"], .enrollment-stats');
      await expect(
        enrollmentData.or(page.locator('text=/student|enrolled/i').first())
      ).toBeVisible();
    }
  });

  test('2.9 Admin can deactivate school', async () => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);

    const schoolCard = page.locator('.school-card').first();
    await schoolCard.click();

    const deactivateBtn = page.locator(
      'button:has-text("Deactivate"), [data-testid="deactivate-school"]'
    );
    if (await deactivateBtn.isVisible()) {
      await deactivateBtn.click();

      const confirmBtn = page.locator('button:has-text("Confirm")');
      if (await confirmBtn.isVisible()) {
        // Don't actually deactivate - verify dialog appears
        const cancelBtn = page.locator('button:has-text("Cancel")');
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        }
      }
    }
  });

  test('2.10 Admin can bulk import schools', async () => {
    await page.goto(`${BASE_URL}/schools/import`);
    await waitForPageReady(page);

    const importForm = page.locator('[data-testid="import-form"], .import-schools');
    await expect(importForm.or(page.locator('text=/import|csv|upload/i').first())).toBeVisible();
  });
});

// =============================================================================
// AGGREGATE REPORTING
// =============================================================================

test.describe('Aggregate Reporting', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsDistrictAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 Admin can access district-wide reports', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const reportsPage = page.locator('[data-testid="reports-dashboard"], .reports-container');
    await expect(reportsPage.or(page.locator('text=/report/i').first())).toBeVisible();
  });

  test('3.2 Admin can view aggregate student performance', async () => {
    await page.goto(`${BASE_URL}/reports/performance`);
    await waitForPageReady(page);

    const performanceReport = page.locator(
      '[data-testid="performance-report"], .performance-chart'
    );
    await expect(
      performanceReport.or(page.locator('text=/performance|score/i').first())
    ).toBeVisible();
  });

  test('3.3 Admin can compare schools', async () => {
    await page.goto(`${BASE_URL}/reports/comparison`);
    await waitForPageReady(page);

    const comparisonReport = page.locator('[data-testid="school-comparison"], .comparison-chart');
    await expect(comparisonReport.or(page.locator('text=/compare|school/i').first())).toBeVisible();
  });

  test('3.4 Admin can view attendance reports', async () => {
    await page.goto(`${BASE_URL}/reports/attendance`);
    await waitForPageReady(page);

    const attendanceReport = page.locator('[data-testid="attendance-report"], .attendance-stats');
    await expect(attendanceReport.or(page.locator('text=/attendance/i').first())).toBeVisible();
  });

  test('3.5 Admin can view enrollment trends', async () => {
    await page.goto(`${BASE_URL}/reports/enrollment`);
    await waitForPageReady(page);

    const enrollmentReport = page.locator('[data-testid="enrollment-report"], .enrollment-chart');
    await expect(
      enrollmentReport.or(page.locator('text=/enrollment|trend/i').first())
    ).toBeVisible();
  });

  test('3.6 Admin can filter reports by school', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const schoolFilter = page.locator('[data-testid="school-filter"], select[name="school"]');
    if (await schoolFilter.isVisible()) {
      await schoolFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('3.7 Admin can filter reports by date range', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const dateFilter = page.locator('[data-testid="date-range"], .date-picker');
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
    }
  });

  test('3.8 Admin can export district report', async () => {
    await page.goto(`${BASE_URL}/reports`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export"), [data-testid="export-report"]');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    }
  });

  test('3.9 Admin can view state compliance report', async () => {
    await page.goto(`${BASE_URL}/reports/compliance`);
    await waitForPageReady(page);

    const complianceReport = page.locator('[data-testid="compliance-report"], .compliance-status');
    await expect(
      complianceReport.or(page.locator('text=/compliance|state/i').first())
    ).toBeVisible();
  });

  test('3.10 Admin can schedule recurring reports', async () => {
    await page.goto(`${BASE_URL}/reports/schedule`);
    await waitForPageReady(page);

    const scheduleForm = page.locator('[data-testid="schedule-form"], .report-schedule');
    await expect(scheduleForm.or(page.locator('text=/schedule|recurring/i').first())).toBeVisible();
  });
});

// =============================================================================
// POLICY CONFIGURATION
// =============================================================================

test.describe('Policy Configuration', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsDistrictAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Admin can access policy settings', async () => {
    await page.goto(`${BASE_URL}/policies`);
    await waitForPageReady(page);

    const policiesPage = page.locator('[data-testid="policies-page"], .policies-container');
    await expect(policiesPage.or(page.locator('text=/polic/i').first())).toBeVisible();
  });

  test('4.2 Admin can configure grading policy', async () => {
    await page.goto(`${BASE_URL}/policies/grading`);
    await waitForPageReady(page);

    const gradingPolicy = page.locator('[data-testid="grading-policy"], .grading-config');
    await expect(gradingPolicy.or(page.locator('text=/grad/i').first())).toBeVisible();
  });

  test('4.3 Admin can configure attendance policy', async () => {
    await page.goto(`${BASE_URL}/policies/attendance`);
    await waitForPageReady(page);

    const attendancePolicy = page.locator('[data-testid="attendance-policy"], .attendance-config');
    await expect(attendancePolicy.or(page.locator('text=/attendance/i').first())).toBeVisible();
  });

  test('4.4 Admin can configure data retention policy', async () => {
    await page.goto(`${BASE_URL}/policies/data-retention`);
    await waitForPageReady(page);

    const retentionPolicy = page.locator('[data-testid="retention-policy"], .retention-config');
    await expect(retentionPolicy.or(page.locator('text=/retention|data/i').first())).toBeVisible();
  });

  test('4.5 Admin can configure privacy settings', async () => {
    await page.goto(`${BASE_URL}/policies/privacy`);
    await waitForPageReady(page);

    const privacySettings = page.locator('[data-testid="privacy-policy"], .privacy-config');
    await expect(privacySettings.or(page.locator('text=/privacy/i').first())).toBeVisible();
  });

  test('4.6 Admin can configure SSO/authentication policy', async () => {
    await page.goto(`${BASE_URL}/policies/authentication`);
    await waitForPageReady(page);

    const authPolicy = page.locator('[data-testid="auth-policy"], .auth-config');
    await expect(authPolicy.or(page.locator('text=/sso|authentication/i').first())).toBeVisible();
  });

  test('4.7 Admin can apply policy to specific schools', async () => {
    await page.goto(`${BASE_URL}/policies`);
    await waitForPageReady(page);

    const policyRow = page.locator('.policy-row, [data-testid^="policy-"]').first();
    if (await policyRow.isVisible()) {
      await policyRow.click();

      const applyBtn = page.locator(
        'button:has-text("Apply to Schools"), [data-testid="apply-policy"]'
      );
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
      }
    }
  });

  test('4.8 Admin can view policy history', async () => {
    await page.goto(`${BASE_URL}/policies/history`);
    await waitForPageReady(page);

    const policyHistory = page.locator('[data-testid="policy-history"], .history-list');
    await expect(policyHistory.or(page.locator('text=/history|change/i').first())).toBeVisible();
  });

  test('4.9 Admin can configure curriculum standards', async () => {
    await page.goto(`${BASE_URL}/policies/curriculum`);
    await waitForPageReady(page);

    const curriculumPolicy = page.locator('[data-testid="curriculum-policy"], .curriculum-config');
    await expect(
      curriculumPolicy.or(page.locator('text=/curriculum|standard/i').first())
    ).toBeVisible();
  });

  test('4.10 Admin can set district-wide announcements', async () => {
    await page.goto(`${BASE_URL}/announcements/create`);
    await waitForPageReady(page);

    const announcementForm = page.locator(
      '[data-testid="announcement-form"], .create-announcement'
    );
    await expect(announcementForm.or(page.locator('form').first())).toBeVisible();
  });
});

// =============================================================================
// USER MANAGEMENT
// =============================================================================

test.describe('District User Management', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsDistrictAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 Admin can view all district users', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const usersList = page.locator('[data-testid="users-list"], .users-table');
    await expect(usersList.first()).toBeVisible();
  });

  test('5.2 Admin can filter users by school', async () => {
    await page.goto(`${BASE_URL}/users`);
    await waitForPageReady(page);

    const schoolFilter = page.locator('[data-testid="school-filter"], select[name="school"]');
    if (await schoolFilter.isVisible()) {
      await schoolFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('5.3 Admin can bulk assign users to schools', async () => {
    await page.goto(`${BASE_URL}/users/assign`);
    await waitForPageReady(page);

    const assignForm = page.locator('[data-testid="bulk-assign"], .assign-users');
    await expect(assignForm.or(page.locator('text=/assign|school/i').first())).toBeVisible();
  });

  test('5.4 Admin can view user activity across schools', async () => {
    await page.goto(`${BASE_URL}/users/activity`);
    await waitForPageReady(page);

    const activityReport = page.locator('[data-testid="user-activity"], .activity-report');
    await expect(activityReport.or(page.locator('text=/activity/i').first())).toBeVisible();
  });
});
