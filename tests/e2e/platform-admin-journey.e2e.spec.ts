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

// =============================================================================
// 5. DASHBOARD REFRESH BUTTON (PA-01)
// =============================================================================

test.describe('Platform Admin Journey — Dashboard Refresh', () => {
  test('dashboard refresh button should trigger data reload', async ({ page }) => {
    await loginAsPlatformAdmin(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    // Verify no error and page still renders
    await waitForPageReady(page);
    await expect(page.locator('h1:has-text("Platform Dashboard")')).toBeVisible();
  });
});

// =============================================================================
// 6. QUICK ACTION LINKS (PA-01 / PA-02)
// =============================================================================

test.describe('Platform Admin Journey — Quick Actions', () => {
  const quickActionTargets = [
    { label: 'Add Tenant', expectedPath: '/tenants/new' },
    { label: 'Run Ed-Fi Export', expectedPath: '/integrations/edfi' },
    { label: 'View Incidents', expectedPath: '/ai/incidents' },
    { label: 'Compliance Report', expectedPath: '/compliance' },
    { label: 'System Logs', expectedPath: '/audit' },
  ];

  for (const action of quickActionTargets) {
    test(`Quick Action "${action.label}" should navigate to ${action.expectedPath}`, async ({
      page,
    }) => {
      await loginAsPlatformAdmin(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await waitForPageReady(page);

      const link = page.locator(`a:has-text("${action.label}")`);
      await link.click();
      await waitForPageReady(page);

      expect(page.url()).toContain(action.expectedPath);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    });
  }
});

// =============================================================================
// 7. BILLING SUB-PAGE LINKS (PA-02)
// =============================================================================

test.describe('Platform Admin Journey — Billing Sub-pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  const billingSubPages = [
    { path: '/billing/vault', heading: /vault|license/i },
    { path: '/billing/pilots', heading: /pilot/i },
    { path: '/billing/enterprise', heading: /enterprise/i },
    { path: '/billing/finops', heading: /finops|cost/i },
    { path: '/billing/quotes/new', heading: /quote|new/i },
  ];

  for (const sub of billingSubPages) {
    test(`Billing sub-page ${sub.path} should render`, async ({ page }) => {
      await page.goto(`${BASE_URL}${sub.path}`);
      await waitForPageReady(page);

      // Should not be a 404
      const notFound = page.locator('text=/404|not found/i');
      await expect(notFound).not.toBeVisible();

      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    });
  }

  test('Billing header links should be visible on /billing', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    await expect(page.locator('a:has-text("License Vault")')).toBeVisible();
    await expect(page.locator('a:has-text("Pilots")')).toBeVisible();
    await expect(page.locator('a:has-text("Enterprise Sales")')).toBeVisible();
    await expect(page.locator('a:has-text("FinOps Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Create Quote")')).toBeVisible();
  });

  test('Quote "View" link should navigate to detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    // Default tab is quotes — look for a View link
    const viewLink = page.locator('a:has-text("View")').first();
    if (await viewLink.isVisible()) {
      await viewLink.click();
      await waitForPageReady(page);
      expect(page.url()).toMatch(/\/billing\/quotes\/.+/);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });

  test('PO detail link should navigate to PO page', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    // Switch to Purchase Orders tab
    await page.click('button:has-text("Purchase Orders")');
    await waitForPageReady(page);

    const poLink = page.locator('a[href*="/billing/pos/"]').first();
    if (await poLink.isVisible()) {
      await poLink.click();
      await waitForPageReady(page);
      expect(page.url()).toMatch(/\/billing\/pos\/.+/);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });

  test('Renewal "Details" link should navigate to renewal page', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    // Switch to Renewals tab
    await page.click('button:has-text("Renewals")');
    await waitForPageReady(page);

    const detailsLink = page.locator('a:has-text("Details")').first();
    if (await detailsLink.isVisible()) {
      await detailsLink.click();
      await waitForPageReady(page);
      expect(page.url()).toMatch(/\/billing\/renewals\/.+/);
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });
});

// =============================================================================
// 8. BILLING ACTION BUTTONS (PA-01 / PA-02)
// =============================================================================

test.describe('Platform Admin Journey — Billing Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  test('Billing PO "Activate Contract" button should be clickable', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    // Click PO tab
    await page.click('button:has-text("Purchase Orders")');
    await waitForPageReady(page);

    // If an "Activate Contract" button exists, verify it's wired
    const activateBtn = page.locator('button:has-text("Activate Contract")');
    if ((await activateBtn.count()) > 0) {
      await expect(activateBtn.first()).toBeEnabled();
    }
  });

  test('Billing PO "Approve" button should be clickable when PO is pending', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    await page.click('button:has-text("Purchase Orders")');
    await waitForPageReady(page);

    const approveBtn = page.locator('button:has-text("Approve")');
    if ((await approveBtn.count()) > 0) {
      await expect(approveBtn.first()).toBeEnabled();
    }
  });

  test('Billing PO "Reject" button should be clickable when PO is pending', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    await page.click('button:has-text("Purchase Orders")');
    await waitForPageReady(page);

    const rejectBtn = page.locator('button:has-text("Reject")');
    if ((await rejectBtn.count()) > 0) {
      await expect(rejectBtn.first()).toBeEnabled();
    }
  });

  test('Billing Quote "Send" button should be clickable when quote is DRAFT', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    // Default tab is quotes
    const sendBtn = page.locator('button:has-text("Send")');
    if ((await sendBtn.count()) > 0) {
      await expect(sendBtn.first()).toBeEnabled();
    }
  });

  test('Renewal "Create Quote" button should be clickable', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    await page.click('button:has-text("Renewals")');
    await waitForPageReady(page);

    const createQuoteBtn = page.locator('button:has-text("Create Quote")');
    if ((await createQuoteBtn.count()) > 0) {
      await expect(createQuoteBtn.first()).toBeEnabled();
    }
  });
});

// =============================================================================
// 9. NAVIGATION COMPLETENESS (PA-03)
// =============================================================================

test.describe('Platform Admin Journey — Navigation Completeness', () => {
  test('All nav links should resolve to real pages', async ({ page }) => {
    await loginAsPlatformAdmin(page);

    const navLinks = [
      '/dashboard',
      '/tenants',
      '/billing',
      '/ai/incidents',
      '/ai/usage',
      '/marketplace',
      '/compliance',
      '/legal-holds',
      '/soc2',
      '/audit',
      '/flags',
    ];

    for (const path of navLinks) {
      await page.goto(`${BASE_URL}${path}`);
      await waitForPageReady(page);
      // Should not show a Next.js 404 page
      const notFound = page.locator('text=/404|not found/i');
      await expect(notFound).not.toBeVisible();
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    }
  });
});

// =============================================================================
// 10. MARKETPLACE SUB-PAGES (PA-04)
// =============================================================================

test.describe('Platform Admin Journey — Marketplace Sub-pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page);
  });

  const marketplaceSubPages = [
    { path: '/marketplace/review', label: 'Review Queue' },
    { path: '/marketplace/items', label: 'All Items' },
    { path: '/marketplace/vendors', label: 'Vendors' },
  ];

  for (const sub of marketplaceSubPages) {
    test(`Marketplace sub-page ${sub.path} should render`, async ({ page }) => {
      await page.goto(`${BASE_URL}${sub.path}`);
      await waitForPageReady(page);

      const notFound = page.locator('text=/404|not found/i');
      await expect(notFound).not.toBeVisible();

      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    });
  }

  test('Marketplace hub card links should be clickable', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    await waitForPageReady(page);

    // Verify the three hub card links exist
    await expect(page.locator('a[href="/marketplace/review"]')).toBeVisible();
    await expect(page.locator('a[href="/marketplace/items"]')).toBeVisible();
    await expect(page.locator('a[href="/marketplace/vendors"]')).toBeVisible();
  });
});
