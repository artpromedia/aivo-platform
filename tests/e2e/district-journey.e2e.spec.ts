/**
 * District Admin Journey E2E Tests
 *
 * Journey: login → view schools → manage users → view analytics → billing
 *
 * @module tests/e2e/district-journey.e2e.spec
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.DISTRICT_URL || 'http://localhost:3003';

const testAdmin = {
  email: 'district-admin@example.com',
  password: 'SecurePass123!',
};

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsDistrictAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', testAdmin.email);
  await page.fill('input[type="password"], input[name="password"]', testAdmin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|schools|overview)/, { timeout: 10000 });
}

// =============================================================================
// 1. LOGIN
// =============================================================================

test.describe('District Admin Journey — Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login and redirect to dashboard', async ({ page }) => {
    await loginAsDistrictAdmin(page);
    await expect(page).toHaveURL(/\/(dashboard|home|schools|overview)/);
  });
});

// =============================================================================
// 2. VIEW SCHOOLS
// =============================================================================

test.describe('District Admin Journey — View Schools', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDistrictAdmin(page);
  });

  test('should navigate to schools list', async ({ page }) => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display school cards or table', async ({ page }) => {
    await page.goto(`${BASE_URL}/schools`);
    await waitForPageReady(page);
    const schools = page.locator(
      '[data-testid="school-card"], .school-card, table, a[href*="school"]'
    );
    await expect(schools.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 3. MANAGE USERS
// =============================================================================

test.describe('District Admin Journey — Manage Users', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDistrictAdmin(page);
  });

  test('should navigate to users management', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`).catch(() => page.goto(`${BASE_URL}/staff`));
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display user list with search', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`).catch(() => page.goto(`${BASE_URL}/staff`));
    await waitForPageReady(page);
    const search = page.locator(
      'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
    );
    await expect(search.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add user capability', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`).catch(() => page.goto(`${BASE_URL}/staff`));
    await waitForPageReady(page);
    const addBtn = page.locator(
      'button:has-text("Add"), button:has-text("Invite"), a:has-text("Add"), a:has-text("Invite")'
    );
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 4. VIEW ANALYTICS
// =============================================================================

test.describe('District Admin Journey — Analytics', () => {
  test('should navigate to analytics dashboard', async ({ page }) => {
    await loginAsDistrictAdmin(page);
    await page.goto(`${BASE_URL}/analytics`).catch(() => page.goto(`${BASE_URL}/reports`));
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display analytics charts or metrics', async ({ page }) => {
    await loginAsDistrictAdmin(page);
    await page.goto(`${BASE_URL}/analytics`).catch(() => page.goto(`${BASE_URL}/reports`));
    await waitForPageReady(page);
    const charts = page.locator('canvas, svg, [data-testid="chart"], .chart, [role="img"]');
    await expect(charts.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 5. BILLING
// =============================================================================

test.describe('District Admin Journey — Billing', () => {
  test('should navigate to billing page', async ({ page }) => {
    await loginAsDistrictAdmin(page);
    await page.goto(`${BASE_URL}/billing`).catch(() => page.goto(`${BASE_URL}/settings/billing`));
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display billing information', async ({ page }) => {
    await loginAsDistrictAdmin(page);
    await page.goto(`${BASE_URL}/billing`).catch(() => page.goto(`${BASE_URL}/settings/billing`));
    await waitForPageReady(page);
    const content = page.locator('text=/plan|invoice|billing|subscription|payment/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});
