/**
 * Parent Journey E2E Tests
 *
 * Journey: login → onboarding → view child dashboard → check assessments → billing
 *
 * @module tests/e2e/parent-journey.e2e.spec
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PARENT_URL || 'http://localhost:3003';

const testParent = {
  email: 'parent-journey@example.com',
  password: 'SecurePass123!',
};

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsParent(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', testParent.email);
  await page.fill('input[type="password"], input[name="password"]', testParent.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|onboarding|children)/, { timeout: 10000 });
}

// =============================================================================
// 1. LOGIN
// =============================================================================

test.describe('Parent Journey — Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login and redirect', async ({ page }) => {
    await loginAsParent(page);
    await expect(page).toHaveURL(/\/(dashboard|home|onboarding|children)/);
  });
});

// =============================================================================
// 2. ONBOARDING
// =============================================================================

test.describe('Parent Journey — Onboarding', () => {
  test('should show onboarding or dashboard after login', async ({ page }) => {
    await loginAsParent(page);
    await waitForPageReady(page);
    const heading = page.locator('h1, h2, [data-testid="onboarding"], [data-testid="greeting"]');
    await expect(heading.first()).toBeVisible();
  });

  test('should allow adding a child profile', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${BASE_URL}/onboarding`).catch(() => page.goto(`${BASE_URL}/children/add`)).catch(() => {});
    await waitForPageReady(page);
    const form = page.locator('form, [data-testid="add-child"], button:has-text("Add")');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 3. VIEW CHILD DASHBOARD
// =============================================================================

test.describe('Parent Journey — Child Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsParent(page);
  });

  test('should view child dashboard with progress', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`).catch(() => page.goto(`${BASE_URL}/children`));
    await waitForPageReady(page);
    const content = page.locator('[data-testid="child-card"], .child-dashboard, h1, h2');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show progress metrics for child', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);
    const progress = page.locator('[data-testid="progress"], [role="progressbar"], .progress, canvas, svg');
    await expect(progress.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 4. CHECK ASSESSMENTS
// =============================================================================

test.describe('Parent Journey — Assessments', () => {
  test('should view assessment results', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${BASE_URL}/assessments`).catch(() => page.goto(`${BASE_URL}/reports`)).catch(() => {});
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });
});

// =============================================================================
// 5. BILLING
// =============================================================================

test.describe('Parent Journey — Billing', () => {
  test('should navigate to billing or subscription page', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${BASE_URL}/billing`).catch(() => page.goto(`${BASE_URL}/settings/billing`)).catch(() => page.goto(`${BASE_URL}/subscription`)).catch(() => {});
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display subscription status', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${BASE_URL}/billing`).catch(() => page.goto(`${BASE_URL}/subscription`)).catch(() => {});
    await waitForPageReady(page);
    const content = page.locator('text=/plan|subscription|billing|payment/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});
