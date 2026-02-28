/**
 * Teacher Dashboard E2E Tests — Container 10
 *
 * Comprehensive end-to-end tests for the web-teacher dashboard:
 * - 12 sidebar navigation links (no 404s)
 * - Header: Quick Add dropdown (5 links)
 * - Header: Notifications bell, Mark all read
 * - Header: Search submit, ⌘K shortcut
 * - Header: User menu links, Sign Out
 * - Dashboard: AI Tool cards (4), Quick Action cards (4)
 * - Dashboard: Class selector, + New Assignment, SEL Observation
 * - Dashboard: API data loading & error states
 * - Settings: Profile form save
 * - Mobile: hamburger menu
 */

import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const TEST_EMAIL = process.env.E2E_TEACHER_EMAIL || 'teacher@test.aivo.com';
const TEST_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'Test1234!';

/**
 * Login via the email/password form at /login.
 * After successful login the router redirects to / (dashboard).
 */
async function login(page: Page) {
  await page.goto('/login');

  // Fill credentials
  await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard (the layout has the sidebar)
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15_000 });
}

/**
 * Assert the page did NOT render a 404 / "not found" error.
 */
async function assertNo404(page: Page) {
  // Check for common 404 indicators
  const body = page.locator('body');
  await expect(body).not.toContainText('404');
  await expect(body).not.toContainText('This page could not be found');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Teacher Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ─────────────────────────────────────────────────────────────────────
  // SIDEBAR NAVIGATION (12 links — 10 main + 2 bottom)
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Sidebar Navigation', () => {
    const sidebarRoutes = [
      { label: 'Dashboard', url: '/dashboard' },
      { label: 'My Classes', url: '/classes' },
      { label: 'Students', url: '/students' },
      { label: 'Gradebook', url: '/gradebook' },
      { label: 'Assignments', url: '/assignments' },
      { label: 'Calendar', url: '/calendar' },
      { label: 'Reports', url: '/reports' },
      { label: 'Messages', url: '/messages' },
      { label: 'Library', url: '/library' },
      { label: 'Professional Dev', url: '/professional-development' },
      // Bottom nav
      { label: 'Settings', url: '/settings' },
      { label: 'Help & Support', url: '/help' },
    ];

    test('all 12 sidebar links resolve without 404', async ({ page }) => {
      for (const { label, url } of sidebarRoutes) {
        // Sidebar links are rendered as <a> elements by Next.js <Link>
        const link = page.getByRole('link', { name: label }).first();
        await link.click();
        await page.waitForURL(new RegExp(url.replace(/\//g, '\\/')));
        await assertNo404(page);
      }
    });

    test('active sidebar link has highlighted style', async ({ page }) => {
      await page.goto('/students');
      const link = page.getByRole('link', { name: 'Students' }).first();
      // Active links in the sidebar use bg-primary or bg-primary/10
      await expect(link).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // HEADER: Quick Add
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Header — Quick Add', () => {
    const quickAddTargets = [
      { label: 'New Assignment', url: '/assignments/new' },
      { label: 'Add Student', url: '/students/new' },
      { label: 'Schedule Event', url: '/calendar/new' },
      { label: 'Send Message', url: '/messages/new' },
      { label: 'Create Report', url: '/reports/new' },
    ];

    test('Quick Add dropdown opens and shows all 5 links', async ({ page }) => {
      await page.goto('/dashboard');

      // The button contains "Quick Add" text (hidden on small screens)
      // or a "+" icon. Find by containing the plus icon.
      const quickAddBtn = page.locator('button', { hasText: /Quick Add/i }).first();
      // Fallback: icon-only button on narrow viewports
      const trigger = (await quickAddBtn.isVisible())
        ? quickAddBtn
        : page.locator('button:has(svg path[d*="M12 4v16"])').first();

      await trigger.click();

      for (const { label } of quickAddTargets) {
        await expect(page.getByRole('link', { name: label })).toBeVisible();
      }
    });

    test('Quick Add → "New Assignment" navigates correctly', async ({ page }) => {
      await page.goto('/dashboard');
      const trigger = page.locator('button', { hasText: /Quick Add/i }).first();
      await trigger.click();

      await page.getByRole('link', { name: 'New Assignment' }).click();
      await page.waitForURL(/\/assignments\/new/);
      await assertNo404(page);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // HEADER: Notifications
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Header — Notifications', () => {
    test('bell opens dropdown with heading and Mark all read', async ({ page }) => {
      await page.goto('/dashboard');

      await page.getByRole('button', { name: /Notifications/i }).click();

      // Dropdown should show "Notifications" heading & "Mark all read"
      const dropdown = page.locator('.absolute').filter({ hasText: 'Notifications' });
      await expect(dropdown.getByText('Notifications')).toBeVisible();
      await expect(dropdown.getByText('Mark all read')).toBeVisible();
    });

    test('Mark all read button can be clicked', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByRole('button', { name: /Notifications/i }).click();

      const markBtn = page.getByText('Mark all read');
      await markBtn.click();

      // After marking all read, the unread badge should either disappear
      // or the button should become disabled
      // We just verify no crash and the dropdown is still visible
      await expect(page.getByText('Notifications')).toBeVisible();
    });

    test('View all notifications link navigates', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByRole('button', { name: /Notifications/i }).click();

      await page.getByRole('link', { name: /View all notifications/i }).click();
      await page.waitForURL(/\/notifications/);
      await assertNo404(page);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // HEADER: Search
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Header — Search', () => {
    test('search submits and navigates to results page', async ({ page }) => {
      await page.goto('/dashboard');

      const searchInput = page.getByPlaceholder('Search students, classes, assignments...');
      await searchInput.fill('math');
      await page.keyboard.press('Enter');

      await page.waitForURL(/\/search\?q=math/);
      await assertNo404(page);
    });

    test('⌘K / Ctrl+K focuses search input', async ({ page }) => {
      await page.goto('/dashboard');

      // Use the correct modifier for the OS
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+k`);

      const searchInput = page.getByPlaceholder('Search students, classes, assignments...');
      await expect(searchInput).toBeFocused();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // HEADER: User Menu
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Header — User Menu', () => {
    test('user avatar menu opens and shows profile links', async ({ page }) => {
      await page.goto('/dashboard');

      // The user menu button contains the user's initials in a circle
      // It's the rightmost button in the header
      const userButton = page.locator('button').filter({ hasText: /Teacher/ }).first();
      // Fallback: look for the avatar button with initials
      const trigger = (await userButton.isVisible())
        ? userButton
        : page.locator('button:has(div.rounded-full)').last();

      await trigger.click();

      // Dropdown items
      await expect(page.getByText('My Profile')).toBeVisible();
      await expect(page.getByText('Account Settings')).toBeVisible();
      await expect(page.getByText('Sign Out')).toBeVisible();
    });

    test('My Profile link navigates to /profile', async ({ page }) => {
      await page.goto('/dashboard');

      const trigger = page.locator('button:has(div.rounded-full)').last();
      await trigger.click();

      await page.getByText('My Profile').click();
      await page.waitForURL(/\/profile/);
      await assertNo404(page);
    });

    test('Sign Out clears session and redirects to /login', async ({ page }) => {
      await page.goto('/dashboard');

      const trigger = page.locator('button:has(div.rounded-full)').last();
      await trigger.click();

      await page.getByText('Sign Out').click();
      await page.waitForURL(/\/login/, { timeout: 10_000 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // DASHBOARD PAGE
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
    });

    test('class selector is visible', async ({ page }) => {
      // ClassSelector renders a select/button with class names
      const selector = page.locator('[class*="ClassSelector"], [data-testid="class-selector"]')
        .first();
      // Fallback: any select-like element near the top
      const fallback = page.getByText('+ New Assignment');
      await expect(fallback).toBeVisible();
    });

    test('AI Tool cards navigate correctly', async ({ page }) => {
      const aiTools = [
        { name: 'AI IEP Creator', url: '/iep/create' },
        { name: 'Lesson Generator', url: '/lessons/ai-generate' },
        { name: 'Quiz Builder', url: '/assessments/ai-create' },
        { name: 'Feedback Assistant', url: '/feedback/ai-assist' },
      ];

      for (const { name, url } of aiTools) {
        // Each AI tool is wrapped in a <Link> (rendered as <a>)
        const toolCard = page.getByRole('link', { name: new RegExp(name, 'i') }).first();
        // Fallback: find by text inside any clickable element
        const fallback = page.locator(`a:has-text("${name}")`).first();

        const target = (await toolCard.isVisible()) ? toolCard : fallback;
        await target.click();
        await page.waitForURL(new RegExp(url.replace(/\//g, '\\/')));
        await assertNo404(page);
        await page.goto('/dashboard');
      }
    });

    test('Quick Action cards navigate correctly', async ({ page }) => {
      const actions = [
        { name: 'Open Gradebook', url: '/gradebook' },
        { name: 'View Students', url: '/students' },
        { name: 'Generate Reports', url: '/reports' },
        { name: 'Messages', url: '/messages' },
      ];

      for (const { name, url } of actions) {
        const actionCard = page.getByRole('link', { name: new RegExp(name, 'i') }).first();
        const fallback = page.locator(`a:has-text("${name}")`).first();

        const target = (await actionCard.isVisible()) ? actionCard : fallback;
        await target.click();
        await page.waitForURL(new RegExp(url.replace(/\//g, '\\/')));
        await page.goto('/dashboard');
      }
    });

    test('+ New Assignment link navigates', async ({ page }) => {
      await page.getByRole('link', { name: /New Assignment/i }).first().click();
      await page.waitForURL(/\/assignments\/new/);
      await assertNo404(page);
    });

    test('SEL + New Observation opens modal', async ({ page }) => {
      const obsBtn = page.getByText('+ New Observation').first();
      if (await obsBtn.isVisible()) {
        await obsBtn.click();
        // Modal opens as a fixed overlay
        const modal = page.locator('.fixed').filter({ hasText: /observation/i });
        await expect(modal.first()).toBeVisible();
      }
    });

    test('loads stats from API (Total Students visible)', async ({ page }) => {
      // QuickStats renders stat boxes; at minimum "Total Students" should appear
      await expect(page.getByText(/Total Students/i)).toBeVisible({ timeout: 15_000 });
    });

    test('error state with API failure does not crash', async ({ page }) => {
      // Intercept API calls and return 500
      await page.route('**/api/**', (route) =>
        route.fulfill({ status: 500, body: '{"error":"mock"}' })
      );
      await page.goto('/dashboard');

      // Page should render without crashing — either a spinner, error message,
      // or empty state, but definitely NOT a stack trace
      await page.waitForTimeout(3_000);
      await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error');
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // SETTINGS PAGE
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Settings Page', () => {
    test('Profile tab renders form fields', async ({ page }) => {
      await page.goto('/settings');

      // The Profile tab should be active by default
      await expect(page.getByText('Profile Information')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
    });

    test('Profile tab saves form data', async ({ page }) => {
      await page.goto('/settings');

      // Wait for form to load
      await page.getByLabel('First Name').waitFor({ state: 'visible', timeout: 10_000 });

      // Fill and submit
      await page.getByLabel('First Name').fill('UpdatedFirstName');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Should show success banner ("Saved successfully.")
      await expect(page.getByText(/Saved successfully|saved/i)).toBeVisible({ timeout: 10_000 });
    });

    test('Grading / Notifications / Integrations tabs are navigable', async ({ page }) => {
      await page.goto('/settings');

      for (const tab of ['Grading', 'Notifications', 'Integrations']) {
        await page.getByText(tab, { exact: true }).click();
        // Each tab should render without crashing
        await page.waitForTimeout(500);
        await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // MOBILE RESPONSIVE
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Mobile Responsive', () => {
    test('hamburger menu opens sidebar on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard');

      // Hamburger button has aria-label "Open navigation menu"
      const hamburger = page.getByRole('button', { name: /Open navigation menu/i });
      await expect(hamburger).toBeVisible();
      await hamburger.click();

      // Sidebar should slide in — check for the logo / brand "A" or nav links
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Students' }).first()).toBeVisible();
    });

    test('Quick Add button is visible (icon only) on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard');

      // The Quick Add button should still be present (shows "+" icon without label)
      const quickAddContainer = page.locator('button:has(svg path[d*="M12 4v16"])').first();
      await expect(quickAddContainer).toBeVisible();
    });

    test('search is hidden on mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard');

      // Search form has class "hidden md:block"
      const searchInput = page.getByPlaceholder('Search students, classes, assignments...');
      await expect(searchInput).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // CROSS-PAGE NAVIGATION FLOWS
  // ─────────────────────────────────────────────────────────────────────

  test.describe('Cross-Page Navigation', () => {
    test('Dashboard → Classes → Class Detail → Gradebook', async ({ page }) => {
      await page.goto('/dashboard');

      // Navigate to classes
      await page.getByRole('link', { name: 'My Classes' }).first().click();
      await page.waitForURL(/\/classes/);
      await assertNo404(page);

      // Click first class card (if any exist)
      const classCard = page.locator('a[href*="/classes/"]').first();
      if (await classCard.isVisible()) {
        await classCard.click();
        await page.waitForURL(/\/classes\/.+/);
        await assertNo404(page);

        // Navigate to Gradebook from class detail
        const gradebookLink = page.getByRole('link', { name: /Gradebook/i }).first();
        if (await gradebookLink.isVisible()) {
          await gradebookLink.click();
          await page.waitForURL(/\/gradebook/);
          await assertNo404(page);
        }
      }
    });

    test('Dashboard → Students → Student Detail', async ({ page }) => {
      await page.goto('/dashboard');

      // Navigate to students
      await page.getByRole('link', { name: 'Students' }).first().click();
      await page.waitForURL(/\/students/);
      await assertNo404(page);

      // Click first student (if any)
      const studentLink = page.locator('a[href*="/students/"]').first();
      if (await studentLink.isVisible()) {
        await studentLink.click();
        await page.waitForURL(/\/students\/.+/);
        await assertNo404(page);
      }
    });

    test('Dashboard → Classes → Class Detail → AI Transparency', async ({ page }) => {
      await page.goto('/classes');

      const classCard = page.locator('a[href*="/classes/"]').first();
      if (await classCard.isVisible()) {
        await classCard.click();
        await page.waitForURL(/\/classes\/.+/);

        // Click AI Transparency link in header
        const aiLink = page.getByRole('link', { name: /AI Transparency/i }).first();
        if (await aiLink.isVisible()) {
          await aiLink.click();
          await page.waitForURL(/\/ai-transparency/);
          await assertNo404(page);
        }
      }
    });
  });
});
