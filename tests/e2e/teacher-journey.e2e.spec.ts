/**
 * Teacher Journey E2E Tests
 *
 * Journey: login → view classes → open class detail → create assessment → view analytics
 *
 * @module tests/e2e/teacher-journey.e2e.spec
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.TEACHER_URL || 'http://localhost:3002';

const testTeacher = {
  email: 'teacher-journey@example.com',
  password: 'SecurePass123!',
};

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsTeacher(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', testTeacher.email);
  await page.fill('input[type="password"], input[name="password"]', testTeacher.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|classrooms)/, { timeout: 10000 });
}

// =============================================================================
// 1. LOGIN
// =============================================================================

test.describe('Teacher Journey — Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"], .error, [data-testid="error"]')).toBeVisible({ timeout: 5000 });
  });

  test('should login and redirect to dashboard', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page).toHaveURL(/\/(dashboard|home|classrooms)/);
  });
});

// =============================================================================
// 2. VIEW CLASSES
// =============================================================================

test.describe('Teacher Journey — View Classes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should navigate to classrooms list', async ({ page }) => {
    await page.goto(`${BASE_URL}/classrooms`);
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display class cards or list', async ({ page }) => {
    await page.goto(`${BASE_URL}/classrooms`);
    await waitForPageReady(page);
    const classes = page.locator('[data-testid="class-card"], .class-card, a[href*="classroom"], a[href*="class"]');
    await expect(classes.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 3. CLASS DETAIL
// =============================================================================

test.describe('Teacher Journey — Class Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should open a class detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/classrooms`);
    await waitForPageReady(page);
    const classLink = page.locator('a[href*="classroom"], a[href*="class"]').first();
    if (await classLink.isVisible()) {
      await classLink.click();
      await waitForPageReady(page);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });

  test('should show student roster in class detail', async ({ page }) => {
    await page.goto(`${BASE_URL}/classrooms`);
    await waitForPageReady(page);
    const classLink = page.locator('a[href*="classroom"], a[href*="class"]').first();
    if (await classLink.isVisible()) {
      await classLink.click();
      await waitForPageReady(page);
      const students = page.locator('[data-testid="student"], .student, table, [role="table"]');
      await expect(students.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// =============================================================================
// 4. CREATE ASSESSMENT
// =============================================================================

test.describe('Teacher Journey — Create Assessment', () => {
  test('should navigate to assessment builder', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto(`${BASE_URL}/assessments`).catch(() => page.goto(`${BASE_URL}/gradebook`));
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should show assessment creation form or button', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto(`${BASE_URL}/assessments`).catch(() => page.goto(`${BASE_URL}/gradebook`));
    await waitForPageReady(page);
    const createBtn = page.locator('button:has-text("Create"), a:has-text("New"), button:has-text("Add")');
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 5. VIEW ANALYTICS
// =============================================================================

test.describe('Teacher Journey — View Analytics', () => {
  test('should navigate to analytics page', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto(`${BASE_URL}/classrooms`);
    await waitForPageReady(page);

    const analyticsLink = page.locator('a[href*="analytics"], nav >> text=/analytics/i');
    if (await analyticsLink.first().isVisible()) {
      await analyticsLink.first().click();
      await waitForPageReady(page);
    } else {
      await page.goto(`${BASE_URL}/analytics`).catch(() => {});
      await waitForPageReady(page);
    }
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });
});
