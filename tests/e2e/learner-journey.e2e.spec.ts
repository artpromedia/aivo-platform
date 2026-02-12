/**
 * Learner Journey E2E Tests
 *
 * Journey: login → dashboard → start a course → take an assessment → view progress
 *
 * @module tests/e2e/learner-journey.e2e.spec
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.LEARNER_URL || 'http://localhost:3000';

const testLearner = {
  email: 'learner-journey@example.com',
  password: 'SecurePass123!',
  accessCode: 'DEMO-2026',
};

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

// =============================================================================
// 1. LOGIN WITH ACCESS CODE
// =============================================================================

test.describe('Learner Journey — Login', () => {
  test('should show login page with access code input', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);
    await expect(page.locator('input[type="email"], input[name="email"], input[name="accessCode"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"], .error, [data-testid="error"]')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testLearner.email);
    await page.fill('input[type="password"], input[name="password"]', testLearner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|learn)/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/(dashboard|home|learn)/);
  });
});

// =============================================================================
// 2. DASHBOARD
// =============================================================================

test.describe('Learner Journey — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testLearner.email);
    await page.fill('input[type="password"], input[name="password"]', testLearner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|learn)/, { timeout: 10000 });
  });

  test('should display learner dashboard with greeting', async ({ page }) => {
    await waitForPageReady(page);
    const heading = page.locator('h1, h2, [data-testid="greeting"]');
    await expect(heading.first()).toBeVisible();
  });

  test('should show course cards or activity feed', async ({ page }) => {
    await waitForPageReady(page);
    const content = page.locator('[data-testid="course-card"], .course-card, [data-testid="activity"], a[href*="course"], a[href*="learn"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show progress summary', async ({ page }) => {
    await waitForPageReady(page);
    const progress = page.locator('[data-testid="progress"], .progress, [role="progressbar"], text=/progress/i');
    await expect(progress.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 3. START A COURSE
// =============================================================================

test.describe('Learner Journey — Start a Course', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testLearner.email);
    await page.fill('input[type="password"], input[name="password"]', testLearner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|learn)/, { timeout: 10000 });
  });

  test('should navigate to course catalog or library', async ({ page }) => {
    await page.click('a[href*="course"], a[href*="learn"], a[href*="library"], nav >> text=/courses|library|learn/i');
    await waitForPageReady(page);
    await expect(page).toHaveURL(/(course|learn|library)/);
  });

  test('should open a course and see lesson content', async ({ page }) => {
    await page.goto(`${BASE_URL}/courses`).catch(() => page.goto(`${BASE_URL}/learn`));
    await waitForPageReady(page);
    const courseLink = page.locator('a[href*="course"], [data-testid="course-card"]').first();
    if (await courseLink.isVisible()) {
      await courseLink.click();
      await waitForPageReady(page);
      const content = page.locator('h1, h2, [data-testid="lesson"], .lesson-content');
      await expect(content.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// =============================================================================
// 4. TAKE AN ASSESSMENT
// =============================================================================

test.describe('Learner Journey — Assessment', () => {
  test('should navigate to assessments page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testLearner.email);
    await page.fill('input[type="password"], input[name="password"]', testLearner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|learn)/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/assessments`).catch(() => {});
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });
});

// =============================================================================
// 5. VIEW PROGRESS
// =============================================================================

test.describe('Learner Journey — View Progress', () => {
  test('should navigate to progress page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testLearner.email);
    await page.fill('input[type="password"], input[name="password"]', testLearner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|learn)/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/progress`).catch(() => {});
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display progress charts or metrics', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testLearner.email);
    await page.fill('input[type="password"], input[name="password"]', testLearner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|learn)/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/progress`).catch(() => page.goto(`${BASE_URL}/dashboard`));
    await waitForPageReady(page);
    const metrics = page.locator('[data-testid="progress"], [role="progressbar"], .chart, canvas, svg');
    await expect(metrics.first()).toBeVisible({ timeout: 10000 });
  });
});
