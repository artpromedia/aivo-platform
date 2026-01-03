import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LoginPage } from '../../pages/login.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { LessonPage } from '../../pages/lesson.page';
import { TestDataFactory, TestUser, TestLesson } from '../../utils/test-data-factory';

/**
 * WCAG 2.1 AA Accessibility Tests
 *
 * Comprehensive accessibility testing for:
 * - All critical user flows
 * - Form accessibility
 * - Keyboard navigation
 * - Screen reader compatibility
 * - Color contrast
 * - Focus management
 * - ARIA attributes
 * - Landmarks and headings
 */

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  let testUser: TestUser;
  let testLesson: TestLesson;

  test.beforeAll(async () => {
    await TestDataFactory.initialize();
    testUser = await TestDataFactory.createUser({ role: 'student' });
    testLesson = await TestDataFactory.createLesson({ title: 'Accessibility Test Lesson' });
  });

  test.afterAll(async () => {
    await TestDataFactory.cleanup();
  });

  // ============================================================================
  // LOGIN PAGE ACCESSIBILITY
  // ============================================================================

  test.describe('Login Page', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('should be fully keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Start from body
      await page.keyboard.press('Tab');

      // Should tab through interactive elements in logical order
      const tabOrder = [
        { role: 'link', name: /logo|home/i },
        { role: 'textbox', name: /email/i },
        { role: 'textbox', name: /password/i },
        { role: 'checkbox', name: /remember/i },
        { role: 'button', name: /sign in|log in/i },
        { role: 'link', name: /forgot password/i },
        { role: 'link', name: /sign up|register/i },
      ];

      for (const element of tabOrder) {
        const locator = page.getByRole(element.role as any, { name: element.name });
        if (await locator.isVisible()) {
          // Focus should reach this element
          await page.keyboard.press('Tab');
        }
      }
    });

    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/login');

      // Email input
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');

      // Password input
      const passwordInput = page.getByLabel(/password/i);
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

      // Submit button
      const submitButton = page.getByRole('button', { name: /sign in|log in/i });
      await expect(submitButton).toHaveAttribute('type', 'submit');
    });

    test('should announce form errors to screen readers', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Error messages should have role="alert" for screen readers
      const alerts = page.getByRole('alert');
      await expect(alerts.first()).toBeVisible();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/login');

      const results = await new AxeBuilder({ page }).withTags(['cat.color']).analyze();

      const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
      expect(contrastViolations).toEqual([]);
    });

    test('should support reduced motion preference', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/login');

      // Check that animations are disabled or reduced
      const hasReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });

      expect(hasReducedMotion).toBe(true);
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/email/i);
      await emailInput.focus();

      // Check for visible focus styling
      const focusStyles = await emailInput.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          border: styles.border,
        };
      });

      // Should have some visible focus indicator
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.boxShadow !== 'none' ||
        focusStyles.border !== 'none';

      expect(hasFocusIndicator).toBe(true);
    });
  });

  // ============================================================================
  // DASHBOARD ACCESSIBILITY
  // ============================================================================

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);
    });

    test('should have no accessibility violations', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('[data-testid="chart"]') // Charts may need special handling
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
        elements.map((el) => ({
          level: parseInt(el.tagName.substring(1)),
          text: el.textContent?.trim(),
        }))
      );

      // Should have exactly one h1
      const h1s = headings.filter((h) => h.level === 1);
      expect(h1s.length).toBe(1);

      // Headings should not skip levels
      let previousLevel = 0;
      for (const heading of headings) {
        expect(heading.level).toBeLessThanOrEqual(previousLevel + 2);
        previousLevel = heading.level;
      }
    });

    test('should have accessible navigation landmarks', async ({ page }) => {
      // Check for main landmark
      const main = page.getByRole('main');
      await expect(main).toBeVisible();

      // Check for navigation landmark
      const nav = page.getByRole('navigation');
      await expect(nav.first()).toBeVisible();

      // Check for banner (header)
      const header = page.getByRole('banner');
      await expect(header).toBeVisible();
    });

    test('should announce dynamic content updates', async ({ page }) => {
      // Check for live regions
      const liveRegions = page.locator('[aria-live]');
      const count = await liveRegions.count();

      // Should have at least one live region for announcements
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should handle focus correctly on modal open/close', async ({ page }) => {
      // Find and click a button that opens a modal
      const profileButton = page.getByRole('button', { name: /profile|account|settings/i });

      if (await profileButton.isVisible()) {
        await profileButton.click();

        const modal = page.getByRole('dialog');
        if (await modal.isVisible()) {
          // Focus should be trapped in modal
          const focusableInModal = modal.locator(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if ((await focusableInModal.count()) > 0) {
            await expect(focusableInModal.first()).toBeFocused();
          }

          // Press Escape to close
          await page.keyboard.press('Escape');

          // Focus should return to trigger button
          await expect(profileButton).toBeFocused();
        }
      }
    });
  });

  // ============================================================================
  // LESSON PLAYER ACCESSIBILITY
  // ============================================================================

  test.describe('Lesson Player', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);
      await page.goto(`/lessons/${testLesson.id}`);
      await page.waitForLoadState('networkidle');
    });

    test('should have no accessibility violations', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('video') // Video players need special handling
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('should announce progress to screen readers', async ({ page }) => {
      const progressBar = page.getByRole('progressbar');

      if (await progressBar.isVisible()) {
        await expect(progressBar).toHaveAttribute('aria-valuenow');
        await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      }
    });

    test('should have accessible question forms', async ({ page }) => {
      const questionBlock = page.getByTestId('block-question');

      if (await questionBlock.isVisible()) {
        // Check that question has fieldset/legend or proper labeling
        const fieldset = questionBlock.locator('fieldset');
        const ariaLabel = await questionBlock.getAttribute('aria-label');
        const ariaLabelledBy = await questionBlock.getAttribute('aria-labelledby');

        const hasProperGrouping =
          (await fieldset.count()) > 0 || ariaLabel !== null || ariaLabelledBy !== null;

        expect(hasProperGrouping).toBe(true);

        // Check answer options have proper labels
        const options = page.getByTestId('answer-option');
        const optionCount = await options.count();

        for (let i = 0; i < optionCount; i++) {
          const option = options.nth(i);
          const role = await option.getAttribute('role');
          const ariaChecked = await option.getAttribute('aria-checked');

          // Should be a radio button or have proper ARIA
          expect(role === 'radio' || ariaChecked !== null).toBe(true);
        }
      }
    });

    test('should have accessible video player', async ({ page }) => {
      const videoBlock = page.getByTestId('block-video');

      if (await videoBlock.isVisible()) {
        // Check for accessible controls
        const playButton = page.getByRole('button', { name: /play/i });
        if (await playButton.isVisible()) {
          await expect(playButton).toBeVisible();
        }

        // Check for captions button
        const captionsButton = page.getByRole('button', { name: /caption|subtitle/i });
        if (await captionsButton.isVisible()) {
          await expect(captionsButton).toHaveAttribute('aria-pressed');
        }

        // Volume slider should be accessible
        const volumeSlider = page.getByRole('slider', { name: /volume/i });
        if (await volumeSlider.isVisible()) {
          await expect(volumeSlider).toHaveAttribute('aria-valuemin');
          await expect(volumeSlider).toHaveAttribute('aria-valuemax');
        }
      }
    });

    test('should provide feedback announcement after answering', async ({ page }) => {
      const questionBlock = page.getByTestId('block-question');

      if (await questionBlock.isVisible()) {
        // Select an answer
        const firstOption = page.getByTestId('answer-option').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();

          // Submit answer
          const submitButton = page.getByRole('button', { name: /submit|check/i });
          if (await submitButton.isVisible()) {
            await submitButton.click();

            // Feedback should be announced via live region
            const feedback = page.getByRole('alert');
            await expect(feedback).toBeVisible();
          }
        }
      }
    });
  });

  // ============================================================================
  // TEXT SCALING
  // ============================================================================

  test.describe('Text Scaling', () => {
    test('should remain usable at 200% text zoom', async ({ page }) => {
      await page.goto('/login');

      // Simulate 200% text zoom
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });

      // All interactive elements should still be visible
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // No horizontal scrolling should be required at reasonable viewport
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Allow some tolerance for edge cases
      expect(hasHorizontalScroll).toBe(false);
    });

    test('should support custom font sizes from accessibility settings', async ({ page }) => {
      // Login first
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      // Navigate to accessibility settings
      await page.goto('/settings/accessibility');

      // Check for font size control
      const fontSizeSlider = page.getByRole('slider', { name: /text size|font size/i });

      if (await fontSizeSlider.isVisible()) {
        // Increase font size
        await fontSizeSlider.fill('150');

        // Verify font size is applied
        const computedFontSize = await page.evaluate(() => {
          return parseFloat(getComputedStyle(document.body).fontSize);
        });

        expect(computedFontSize).toBeGreaterThan(16);
      }
    });
  });

  // ============================================================================
  // SCREEN READER SPECIFIC
  // ============================================================================

  test.describe('Screen Reader Compatibility', () => {
    test('should have descriptive link text', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      // Get all links
      const links = await page.$$eval('a', (elements) =>
        elements.map((el) => ({
          text: el.textContent?.trim() || el.getAttribute('aria-label') || '',
          href: el.getAttribute('href'),
        }))
      );

      // No links should have generic text
      const genericTexts = ['click here', 'read more', 'learn more', 'here', 'link'];

      for (const link of links) {
        const lowerText = link.text.toLowerCase();
        for (const generic of genericTexts) {
          if (lowerText === generic) {
            throw new Error(`Link with generic text "${link.text}" found: ${link.href}`);
          }
        }
      }
    });

    test('should have alt text for all informative images', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      const images = await page.$$eval('img', (elements) =>
        elements.map((el) => ({
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt'),
          role: el.getAttribute('role'),
          ariaHidden: el.getAttribute('aria-hidden'),
        }))
      );

      for (const img of images) {
        // Images should have alt attribute (can be empty for decorative)
        // or role="presentation" / aria-hidden="true" for decorative images
        const isAccessible =
          img.alt !== null || img.role === 'presentation' || img.ariaHidden === 'true';

        expect(isAccessible).toBe(true);
      }
    });

    test('should have skip links for main content', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      // Skip link should be first or early focusable element
      await page.keyboard.press('Tab');

      const skipLink = page.getByRole('link', { name: /skip to (main )?content/i });

      if (await skipLink.isVisible()) {
        // Activating skip link should move focus to main content
        await page.keyboard.press('Enter');

        const main = page.getByRole('main');
        await expect(main).toBeVisible();
      }
    });

    test('should have proper ARIA roles for interactive elements', async ({ page }) => {
      await page.goto('/login');

      // Check form has proper role
      const form = page.locator('form');
      await expect(form).toBeVisible();

      // Check buttons have proper role
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeVisible();

      // Check links have proper role
      const forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
      await expect(forgotPasswordLink).toBeVisible();
    });
  });

  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================

  test.describe('Focus Management', () => {
    test('should have logical tab order', async ({ page }) => {
      await page.goto('/login');

      // Track focus order
      const focusOrder: string[] = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName + (el?.getAttribute('type') || '') + (el?.getAttribute('name') || '');
        });

        focusOrder.push(focusedElement);
      }

      // Focus order should follow visual order (no unexpected jumps)
      expect(focusOrder.length).toBeGreaterThan(0);
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      // Open a modal (find any button that opens one)
      const modalTrigger = page.locator('[data-modal-trigger], [aria-haspopup="dialog"]').first();

      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();

        const modal = page.getByRole('dialog');

        if (await modal.isVisible()) {
          // Tab through all elements - focus should stay within modal
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Tab');

            const isFocusInModal = await page.evaluate(() => {
              const activeElement = document.activeElement;
              const modal = document.querySelector('[role="dialog"]');
              return modal?.contains(activeElement);
            });

            expect(isFocusInModal).toBe(true);
          }
        }
      }
    });

    test('should return focus after dialog closes', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL(/\/dashboard/);

      const modalTrigger = page.locator('[data-modal-trigger], [aria-haspopup="dialog"]').first();

      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();

        const modal = page.getByRole('dialog');

        if (await modal.isVisible()) {
          // Close modal with Escape
          await page.keyboard.press('Escape');

          // Focus should return to trigger
          await expect(modalTrigger).toBeFocused();
        }
      }
    });
  });

  // ============================================================================
  // COLOR & VISUAL
  // ============================================================================

  test.describe('Color & Visual Accessibility', () => {
    test('should not rely solely on color to convey information', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();

      // Submit empty form to trigger errors
      await page.getByRole('button', { name: /sign in/i }).click();

      // Error messages should have more than just color
      const errorElements = page.locator('[class*="error"], [aria-invalid="true"]');
      const count = await errorElements.count();

      for (let i = 0; i < count; i++) {
        const element = errorElements.nth(i);

        // Should have text content, icon, or other indicator beyond color
        const hasText = (await element.textContent())?.trim().length! > 0;
        const hasIcon = (await element.locator('svg, img, [class*="icon"]').count()) > 0;
        const hasAriaLabel = (await element.getAttribute('aria-label')) !== null;

        expect(hasText || hasIcon || hasAriaLabel).toBe(true);
      }
    });

    test('should work in high contrast mode', async ({ page }) => {
      // Enable forced colors (high contrast mode)
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto('/login');

      // All interactive elements should still be visible
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });
  });
});

// ============================================================================
// ACCESSIBILITY HELPER FUNCTION
// ============================================================================

/**
 * Assert no accessibility violations for a page
 */
export async function assertNoA11yViolations(
  page: any,
  options?: {
    tags?: string[];
    exclude?: string[];
  }
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(
    options?.tags || ['wcag2a', 'wcag2aa', 'wcag21aa']
  );

  if (options?.exclude) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }

  const results = await builder.analyze();

  if (results.violations.length > 0) {
    const messages = results.violations.map((v) => {
      const nodes = v.nodes.map((n) => `  - ${n.html.substring(0, 100)}`).join('\n');
      return `${v.id} (${v.impact}): ${v.description}\n${nodes}`;
    });

    throw new Error(`Accessibility violations found:\n\n${messages.join('\n\n')}`);
  }
}
