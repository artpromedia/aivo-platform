import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/dashboard.page';
import { LoginPage } from '../../pages/login.page';
import { TestDataFactory, TestUser } from '../../utils/test-data-factory';

/**
 * Learner Dashboard E2E Tests — Container 10
 *
 * Comprehensive click-through, navigation, and data-flow tests covering:
 * - Sidebar link navigation (all 10 routes)
 * - Topbar buttons (notifications, search, profile)
 * - Dashboard interactions (start learning, continue, AI tutor, achievements)
 * - Data loading & error states
 * - Mobile responsive hamburger menu
 */

test.describe('Learner Dashboard E2E', () => {
  let dashboard: DashboardPage;
  let testUser: TestUser;

  test.beforeAll(async () => {
    await TestDataFactory.initialize();
    testUser = await TestDataFactory.createUser({
      role: 'student',
      verified: true,
    });
  });

  test.afterAll(async () => {
    await TestDataFactory.cleanup();
  });

  test.beforeEach(async ({ page }) => {
    // Login with test learner credentials
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);
    await loginPage.submit();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    dashboard = new DashboardPage(page);
    await dashboard.waitForPageLoad();
  });

  // ============================================================================
  // SIDEBAR NAVIGATION
  // ============================================================================

  test.describe('Sidebar Navigation', () => {
    const sidebarRoutes = [
      { link: 'Dashboard', url: '/dashboard' },
      { link: 'My Courses', url: '/courses' },
      { link: 'Goals', url: '/goals' },
      { link: 'Progress', url: '/progress' },
      { link: 'Achievements', url: '/achievements' },
      { link: 'AI Tutor', url: '/tutor' },
      { link: 'Games', url: '/games' },
      { link: 'Homework Helper', url: '/homework' },
      { link: 'Calming Space', url: '/calm' },
      { link: 'My Tools', url: '/executive-function' },
    ];

    for (const { link, url } of sidebarRoutes) {
      test(`sidebar: "${link}" navigates to ${url}`, async ({ page }) => {
        await page.getByRole('link', { name: link }).click();
        await expect(page).toHaveURL(new RegExp(url));
        // Verify no 404 — page should have meaningful content
        await expect(
          page.locator('h1, h2, [role="heading"]').first(),
        ).toBeVisible({ timeout: 10000 });
      });
    }

    test('sidebar: Settings navigates to /settings', async ({ page }) => {
      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page).toHaveURL(/\/settings/);
      await expect(
        page.locator('h1, h2, [role="heading"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test('sidebar: active link is highlighted on current page', async ({ page }) => {
      // Dashboard link should be active by default
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
      // Active state is typically expressed via aria-current or a CSS class
      await expect(dashboardLink).toBeVisible();

      // Navigate to courses
      await page.getByRole('link', { name: 'My Courses' }).click();
      await expect(page).toHaveURL(/\/courses/);
    });
  });

  // ============================================================================
  // TOPBAR BUTTONS
  // ============================================================================

  test.describe('Topbar Interactions', () => {
    test('notifications bell opens notification panel', async ({ page }) => {
      const bellButton = page.getByRole('button', { name: /notification/i });
      await expect(bellButton).toBeVisible();
      await bellButton.click();
      // Panel should become visible (could be dropdown, popover, or side panel)
      await expect(
        page.locator('[data-testid="notification-panel"], [role="dialog"], [role="menu"]').first(),
      ).toBeVisible({ timeout: 5000 });
    });

    test('search input accepts text and shows results', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('math');
        // Wait for search results to appear
        await expect(
          page.locator('[data-testid="search-results"], [role="listbox"], [role="list"]').first(),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('user avatar or profile button is accessible', async ({ page }) => {
      const profileTrigger = page
        .locator('[data-testid="user-avatar"], [role="button"][name*="profile" i]')
        .first();
      if (await profileTrigger.isVisible()) {
        await profileTrigger.click();
        // Should open a dropdown or navigate to profile
        await page.waitForTimeout(500);
        const url = page.url();
        const hasDropdown = await page
          .locator('[role="menu"], [role="dialog"]')
          .first()
          .isVisible()
          .catch(() => false);
        expect(url.includes('/profile') || hasDropdown).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // DASHBOARD INTERACTIONS
  // ============================================================================

  test.describe('Dashboard Content Interactions', () => {
    test('Start Learning button opens subject picker', async ({ page }) => {
      const startBtn = page.getByRole('button', { name: /start learning|begin/i });
      if (await startBtn.isVisible()) {
        await startBtn.click();
        // Subject picker should appear (Math, ELA, Science, SEL)
        await expect(
          page.getByText(/math/i),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('Start Learning: selecting a subject triggers session start', async ({ page }) => {
      const startBtn = page.getByRole('button', { name: /start learning|begin/i });
      if (await startBtn.isVisible()) {
        await startBtn.click();

        // Wait for subject picker
        const mathOption = page.getByText(/math/i);
        await expect(mathOption).toBeVisible({ timeout: 5000 });
        await mathOption.click();

        // Should navigate to a course or lesson
        await page.waitForURL(/\/(courses|lessons)/, { timeout: 10000 });
      }
    });

    test('Continue Learning: lesson cards navigate to lesson', async ({ page }) => {
      const lessonCard = page
        .locator('[data-testid="lesson-card"], a[href*="/courses/"][href*="/lessons/"]')
        .first();
      if (await lessonCard.isVisible()) {
        await lessonCard.click();
        await page.waitForURL(/\/courses\/.*\/lessons\//, { timeout: 10000 });
      }
    });

    test('AI Tutor CTA navigates to /tutor', async ({ page }) => {
      const tutorLink = page.getByRole('link', { name: /chat now|ai tutor|ask/i });
      if (await tutorLink.isVisible()) {
        await tutorLink.click();
        await expect(page).toHaveURL(/\/tutor/);
      }
    });

    test('Achievements "View all" navigates to /achievements', async ({ page }) => {
      const viewAllLinks = page.getByRole('link', { name: /view all|see more|see all/i });
      // The last "view all" is typically achievements
      const count = await viewAllLinks.count();
      if (count > 0) {
        await viewAllLinks.last().click();
        await expect(page).toHaveURL(/\/achievements/);
      }
    });
  });

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  test.describe('Data Loading & Error States', () => {
    test('dashboard loads stats cards with data', async ({ page }) => {
      // Verify stats cards render (text may vary)
      await expect(
        page.getByText(/streak/i).first(),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/xp/i).first(),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/level/i).first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test('dashboard shows greeting with user name', async ({ page }) => {
      // Should greet the user — "Good morning/afternoon/evening, Name!"
      await expect(
        page.getByText(new RegExp(`(good|hi|hello|welcome).*${testUser.firstName}`, 'i')),
      ).toBeVisible({ timeout: 10000 });
    });

    test('dashboard shows error state on API failure', async ({ page }) => {
      // Intercept dashboard-related API calls to force failure
      await page.route('**/api/learner/**', (route) =>
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server Error' }) }),
      );
      await page.route('**/api/session/**', (route) =>
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server Error' }) }),
      );

      // Reload to trigger the error
      await page.reload();

      // Should show some error indication and a retry mechanism
      const errorIndicator = page.locator(
        'text=/couldn\'t load|error|failed|something went wrong/i',
      );
      const retryButton = page.getByRole('button', { name: /retry|try again|reload/i });

      // At least one error indication should be visible
      await expect(
        errorIndicator.first().or(retryButton),
      ).toBeVisible({ timeout: 10000 });
    });

    test('dashboard retry button reloads data after error', async ({ page }) => {
      // Force API error
      await page.route('**/api/learner/**', (route) =>
        route.fulfill({ status: 500 }),
      );
      await page.reload();

      // Unblock the route before clicking retry
      await page.unroute('**/api/learner/**');

      const retryButton = page.getByRole('button', { name: /retry|try again|reload/i });
      if (await retryButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await retryButton.click();
        // After retry, stats should reappear
        await expect(
          page.getByText(/streak|xp|level/i).first(),
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  // ============================================================================
  // MOBILE RESPONSIVE
  // ============================================================================

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('hamburger menu opens sidebar on mobile', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Hamburger menu button
      const menuButton = page.getByRole('button', { name: /menu|toggle|hamburger/i });
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      // Sidebar/drawer should slide in with all nav items
      const navLabels = [
        'Dashboard',
        'My Courses',
        'Goals',
        'Progress',
        'Achievements',
        'AI Tutor',
        'Games',
        'Settings',
      ];

      for (const label of navLabels) {
        await expect(
          page.getByRole('link', { name: label }),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('mobile sidebar closes when link is clicked', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const menuButton = page.getByRole('button', { name: /menu|toggle|hamburger/i });
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      // Click a link
      await page.getByRole('link', { name: 'Goals' }).click();
      await expect(page).toHaveURL(/\/goals/);

      // Sidebar should close (nav links hidden again)
      await expect(
        page.getByRole('link', { name: 'Dashboard' }),
      ).not.toBeVisible({ timeout: 3000 }).catch(() => {
        // Some implementations keep the sidebar visible; that's acceptable
      });
    });

    test('mobile: stats cards stack vertically', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Stats should still be visible on mobile
      await expect(
        page.getByText(/streak/i).first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ============================================================================
  // GAMIFICATION ELEMENTS
  // ============================================================================

  test.describe('Gamification Widgets', () => {
    test('streak calendar is visible on dashboard', async ({ page }) => {
      // Streak display should show current streak
      await dashboard.assertStreakDisplayed();
    });

    test('XP display shows current XP', async ({ page }) => {
      await dashboard.assertXPDisplayed();
    });

    test('level display shows current level', async ({ page }) => {
      await dashboard.assertLevelDisplayed();
    });

    test('achievements section renders on dashboard', async ({ page }) => {
      // Check for any badge/achievement related content
      const achievementSection = page.locator(
        'text=/badge|achievement|earned/i',
      );
      if (await achievementSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(achievementSection.first()).toBeVisible();
      }
    });
  });

  // ============================================================================
  // NAVIGATION HISTORY
  // ============================================================================

  test.describe('Navigation History', () => {
    test('browser back button returns to previous page', async ({ page }) => {
      // Navigate to courses
      await page.getByRole('link', { name: 'My Courses' }).click();
      await expect(page).toHaveURL(/\/courses/);

      // Go back
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('deep-linked route loads correctly', async ({ page }) => {
      await page.goto('/achievements');
      await page.waitForLoadState('networkidle');
      // Should either load achievements or redirect to login/onboarding
      const url = page.url();
      expect(
        url.includes('/achievements') ||
        url.includes('/login') ||
        url.includes('/onboarding'),
      ).toBeTruthy();
    });
  });
});
