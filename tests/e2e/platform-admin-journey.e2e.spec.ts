/**
 * Platform Admin Journey E2E Tests
 *
 * Journey: login → view tenants → manage compliance → review AI models
 *
 * @module tests/e2e/platform-admin-journey.e2e.spec
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PLATFORM_ADMIN_URL || 'http://localhost:3010';

const testPlatformAdmin = {
  email: 'platform-admin@example.com',
  password: 'SecurePass123!',
};

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsPlatformAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', testPlatformAdmin.email);
  await page.fill('input[type="password"], input[name="password"]', testPlatformAdmin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|tenants|overview)/, { timeout: 10000 });
}

// =============================================================================
// 1. LOGIN
// =============================================================================

test.describe('Platform Admin Journey — Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login and redirect', async ({ page }) => {
    await loginAsPlatformAdmin(page);
    await expect(page).toHaveURL(/\/(dashboard|home|tenants|overview)/);
  });
});

// =============================================================================
// 2. VIEW TENANTS
// =============================================================================

test.describe('Platform Admin Journey — View Tenants', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  test('should navigate to tenants list', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenants`);
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display tenant cards or table', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenants`);
    await waitForPageReady(page);
    const tenants = page.locator('[data-testid="tenant-card"], .tenant-card, table, a[href*="tenant"]');
    await expect(tenants.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open a tenant detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/tenants`);
    await waitForPageReady(page);
    const tenantLink = page.locator('a[href*="tenant"]').first();
    if (await tenantLink.isVisible()) {
      await tenantLink.click();
      await waitForPageReady(page);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });
});

// =============================================================================
// 3. MANAGE COMPLIANCE
// =============================================================================

test.describe('Platform Admin Journey — Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  test('should navigate to compliance page', async ({ page }) => {
    await page.goto(`${BASE_URL}/compliance`);
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display compliance dashboard or reports', async ({ page }) => {
    await page.goto(`${BASE_URL}/compliance`);
    await waitForPageReady(page);
    const content = page.locator('text=/compliance|audit|report|FERPA|COPPA/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// 4. REVIEW AI MODELS
// =============================================================================

test.describe('Platform Admin Journey — AI Models', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  test('should navigate to AI models page', async ({ page }) => {
    await page.goto(`${BASE_URL}/models`).catch(() => page.goto(`${BASE_URL}/ai`));
    await waitForPageReady(page);
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();
  });

  test('should display model cards or list', async ({ page }) => {
    await page.goto(`${BASE_URL}/models`).catch(() => page.goto(`${BASE_URL}/ai`));
    await waitForPageReady(page);
    const models = page.locator('[data-testid="model-card"], .model-card, table, a[href*="model"]');
    await expect(models.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open a model detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/models`).catch(() => page.goto(`${BASE_URL}/ai`));
    await waitForPageReady(page);
    const modelLink = page.locator('a[href*="model"]').first();
    if (await modelLink.isVisible()) {
      await modelLink.click();
      await waitForPageReady(page);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });
});
