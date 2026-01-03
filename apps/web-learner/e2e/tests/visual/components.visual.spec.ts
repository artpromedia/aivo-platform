/**
 * Visual Regression Tests
 *
 * Captures and compares screenshots of key UI components
 * to detect unintended visual changes.
 *
 * Uses Playwright's built-in snapshot testing with Percy integration
 * for cross-browser visual testing.
 */

import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

// Visual test configuration
const VISUAL_CONFIG = {
  fullPage: true,
  animations: 'disabled' as const,
  mask: [
    // Mask dynamic content
    '[data-testid="timestamp"]',
    '[data-testid="user-avatar"]',
    '[data-testid="streak-count"]',
  ],
};

test.describe('Visual Regression - Core Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test('Login page - default state', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      ...VISUAL_CONFIG,
      maxDiffPixelRatio: 0.01,
    });

    // Percy snapshot for cross-browser testing
    await percySnapshot(page, 'Login Page');
  });

  test('Login page - with validation errors', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForSelector('[role="alert"]');

    await expect(page).toHaveScreenshot('login-page-errors.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Login Page - Validation Errors');
  });

  test('Dashboard - authenticated user', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('TestP@ss123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Dashboard');
  });

  test('Course catalog - grid view', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('courses-grid.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Course Catalog - Grid');
  });

  test('Course catalog - list view', async ({ page }) => {
    await page.goto('/courses');
    await page.getByRole('button', { name: /list view/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('courses-list.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Course Catalog - List');
  });

  test('Lesson player - video block', async ({ page }) => {
    await page.goto('/lessons/sample-lesson');
    await page.waitForLoadState('networkidle');

    // Wait for video player to load
    await page.waitForSelector('[data-testid="video-player"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('lesson-video.png', {
      ...VISUAL_CONFIG,
      mask: [...VISUAL_CONFIG.mask, '[data-testid="video-player"]'], // Mask video content
    });

    await percySnapshot(page, 'Lesson Player - Video');
  });

  test('Lesson player - quiz block', async ({ page }) => {
    await page.goto('/lessons/sample-lesson?block=quiz');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('lesson-quiz.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Lesson Player - Quiz');
  });

  test('Profile settings page', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-profile.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Settings - Profile');
  });
});

test.describe('Visual Regression - Components', () => {
  test('Button variants', async ({ page }) => {
    await page.goto('/storybook/button');

    await expect(page).toHaveScreenshot('button-variants.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Button Variants');
  });

  test('Card components', async ({ page }) => {
    await page.goto('/storybook/card');

    await expect(page).toHaveScreenshot('card-components.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Card Components');
  });

  test('Form inputs', async ({ page }) => {
    await page.goto('/storybook/inputs');

    await expect(page).toHaveScreenshot('form-inputs.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Form Inputs');
  });

  test('Navigation components', async ({ page }) => {
    await page.goto('/storybook/navigation');

    await expect(page).toHaveScreenshot('navigation.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Navigation Components');
  });

  test('Modal dialogs', async ({ page }) => {
    await page.goto('/storybook/modal');
    await page.getByRole('button', { name: /open modal/i }).click();
    await page.waitForSelector('[role="dialog"]');

    await expect(page).toHaveScreenshot('modal-dialog.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Modal Dialog');
  });

  test('Toast notifications', async ({ page }) => {
    await page.goto('/storybook/toast');

    // Trigger different toast types
    await page.getByRole('button', { name: /success toast/i }).click();
    await page.waitForSelector('[data-testid="toast-success"]');

    await expect(page).toHaveScreenshot('toast-success.png', {
      ...VISUAL_CONFIG,
    });

    await page.getByRole('button', { name: /error toast/i }).click();
    await page.waitForSelector('[data-testid="toast-error"]');

    await expect(page).toHaveScreenshot('toast-error.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Toast Notifications');
  });
});

test.describe('Visual Regression - Responsive', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`Dashboard at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        ...VISUAL_CONFIG,
      });

      await percySnapshot(page, `Dashboard - ${viewport.name}`, {
        widths: [viewport.width],
      });
    });

    test(`Course page at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/courses/sample-course');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`course-${viewport.name}.png`, {
        ...VISUAL_CONFIG,
      });

      await percySnapshot(page, `Course Page - ${viewport.name}`, {
        widths: [viewport.width],
      });
    });
  }
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('Dashboard in dark mode', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Dashboard - Dark Mode');
  });

  test('Lesson player in dark mode', async ({ page }) => {
    await page.goto('/lessons/sample-lesson');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('lesson-dark.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Lesson Player - Dark Mode');
  });

  test('Settings in dark mode', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-dark.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Settings - Dark Mode');
  });
});

test.describe('Visual Regression - States', () => {
  test('Loading states', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.continue();
    });

    await page.goto('/dashboard');

    // Capture loading state
    await expect(page).toHaveScreenshot('dashboard-loading.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Dashboard - Loading State');
  });

  test('Empty states', async ({ page }) => {
    // Mock empty data response
    await page.route('**/api/courses', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ courses: [], pagination: { total: 0 } }),
      })
    );

    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('courses-empty.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Courses - Empty State');
  });

  test('Error states', async ({ page }) => {
    // Mock error response
    await page.route('**/api/courses', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    );

    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('courses-error.png', {
      ...VISUAL_CONFIG,
    });

    await percySnapshot(page, 'Courses - Error State');
  });
});

test.describe('Visual Regression - Interactive States', () => {
  test('Button hover states', async ({ page }) => {
    await page.goto('/storybook/button');

    const primaryButton = page.getByRole('button', { name: /primary/i }).first();
    await primaryButton.hover();

    await expect(page).toHaveScreenshot('button-hover.png', {
      ...VISUAL_CONFIG,
    });
  });

  test('Input focus states', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    await emailInput.focus();

    await expect(page).toHaveScreenshot('input-focus.png', {
      ...VISUAL_CONFIG,
    });
  });

  test('Dropdown open state', async ({ page }) => {
    await page.goto('/storybook/dropdown');

    await page.getByRole('button', { name: /select option/i }).click();
    await page.waitForSelector('[role="listbox"]');

    await expect(page).toHaveScreenshot('dropdown-open.png', {
      ...VISUAL_CONFIG,
    });
  });
});
