import { Page, Locator, expect, Response } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Base Page Object
 *
 * Provides common functionality for all page objects:
 * - Navigation helpers
 * - Wait utilities
 * - Common element interactions
 * - Screenshot helpers
 * - Performance metrics
 * - Accessibility checking
 * - Network interception
 */

export abstract class BasePage {
  protected readonly page: Page;
  protected abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Navigate to this page
   */
  async navigate(): Promise<Response | null> {
    const response = await this.page.goto(this.path);
    await this.waitForPageLoad();
    return response;
  }

  /**
   * Navigate with query parameters
   */
  async navigateWithParams(params: Record<string, string>): Promise<Response | null> {
    const searchParams = new URLSearchParams(params);
    const response = await this.page.goto(`${this.path}?${searchParams.toString()}`);
    await this.waitForPageLoad();
    return response;
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get current URL
   */
  get currentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if on this page
   */
  async isOnPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes(this.path);
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Go back
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  // ============================================================================
  // COMMON ELEMENTS
  // ============================================================================

  /**
   * Loading indicator
   */
  get loadingIndicator(): Locator {
    return this.page.getByTestId('loading-indicator');
  }

  /**
   * Loading spinner
   */
  get loadingSpinner(): Locator {
    return this.page.locator('[data-loading="true"], .loading, .spinner');
  }

  /**
   * Toast/snackbar notification
   */
  get toastNotification(): Locator {
    return this.page.getByRole('alert');
  }

  /**
   * Error alert
   */
  get errorAlert(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /error|failed/i });
  }

  /**
   * Success alert
   */
  get successAlert(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /success|completed/i });
  }

  /**
   * Modal dialog
   */
  get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Page title (h1)
   */
  get pageTitle(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  /**
   * Main content area
   */
  get mainContent(): Locator {
    return this.page.getByRole('main');
  }

  /**
   * Navigation menu
   */
  get navigationMenu(): Locator {
    return this.page.getByRole('navigation');
  }

  // ============================================================================
  // WAIT UTILITIES
  // ============================================================================

  /**
   * Wait for loading to complete
   */
  async waitForLoading(): Promise<void> {
    // Wait for any loading indicators to disappear
    const loadingSelectors = [
      '[data-loading="true"]',
      '[aria-busy="true"]',
      '.loading',
      '.spinner',
      '[data-testid="loading-indicator"]',
    ];

    for (const selector of loadingSelectors) {
      const locator = this.page.locator(selector);
      if ((await locator.count()) > 0) {
        await expect(locator.first()).not.toBeVisible({ timeout: 30000 });
      }
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: Locator, timeout = 10000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(locator: Locator, timeout = 10000): Promise<void> {
    await expect(locator).not.toBeVisible({ timeout });
  }

  /**
   * Wait for network request
   */
  async waitForRequest(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForRequest(urlPattern);
  }

  /**
   * Wait for network response
   */
  async waitForResponse(urlPattern: string | RegExp): Promise<Response> {
    return await this.page.waitForResponse(urlPattern);
  }

  /**
   * Wait for API call to complete successfully
   */
  async waitForApiSuccess(endpoint: string): Promise<Response> {
    return await this.page.waitForResponse(
      (response) =>
        response.url().includes(endpoint) && response.status() >= 200 && response.status() < 300
    );
  }

  /**
   * Wait for specific text to appear
   */
  async waitForText(text: string | RegExp, timeout = 10000): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout });
  }

  /**
   * Wait for URL to match
   */
  async waitForUrl(urlPattern: string | RegExp, timeout = 10000): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  // ============================================================================
  // INTERACTIONS
  // ============================================================================

  /**
   * Click with retry logic
   */
  async clickWithRetry(locator: Locator, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await locator.click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Fill input field (clears first)
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Type text with delay (for realistic input)
   */
  async typeWithDelay(locator: Locator, value: string, delay = 50): Promise<void> {
    await locator.click();
    await locator.pressSequentially(value, { delay });
  }

  /**
   * Select dropdown option
   */
  async selectOption(locator: Locator, value: string): Promise<void> {
    await locator.click();
    await this.page.getByRole('option', { name: value }).click();
  }

  /**
   * Upload file
   */
  async uploadFile(locator: Locator, filePath: string | string[]): Promise<void> {
    await locator.setInputFiles(filePath);
  }

  /**
   * Clear file input
   */
  async clearFileInput(locator: Locator): Promise<void> {
    await locator.setInputFiles([]);
  }

  /**
   * Scroll to element
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   */
  async hoverElement(locator: Locator): Promise<void> {
    await locator.hover();
  }

  /**
   * Drag and drop
   */
  async dragAndDrop(source: Locator, target: Locator): Promise<void> {
    await source.dragTo(target);
  }

  /**
   * Close modal
   */
  async closeModal(): Promise<void> {
    const closeButton = this.modal.getByRole('button', { name: /close|cancel|×/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.modal).not.toBeVisible();
  }

  /**
   * Dismiss toast notification
   */
  async dismissToast(): Promise<void> {
    const toast = this.toastNotification;
    if (await toast.isVisible()) {
      const closeButton = toast.getByRole('button', { name: /close|dismiss|×/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  /**
   * Press Tab key
   */
  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  /**
   * Press Shift+Tab (reverse tab)
   */
  async pressShiftTab(): Promise<void> {
    await this.page.keyboard.press('Shift+Tab');
  }

  /**
   * Press Enter key
   */
  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  /**
   * Press Escape key
   */
  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Get currently focused element
   */
  get focusedElement(): Locator {
    return this.page.locator(':focus');
  }

  // ============================================================================
  // SCREENSHOTS & VISUAL
  // ============================================================================

  /**
   * Take full page screenshot
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Take element screenshot
   */
  async takeElementScreenshot(locator: Locator, name: string): Promise<Buffer> {
    return await locator.screenshot({
      path: `screenshots/${name}.png`,
    });
  }

  /**
   * Compare visual snapshot
   */
  async expectVisualMatch(
    name: string,
    options?: { fullPage?: boolean; mask?: Locator[] }
  ): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      fullPage: options?.fullPage ?? true,
      animations: 'disabled',
      mask: options?.mask,
    });
  }

  /**
   * Compare element visual snapshot
   */
  async expectElementVisualMatch(locator: Locator, name: string): Promise<void> {
    await expect(locator).toHaveScreenshot(`${name}.png`, {
      animations: 'disabled',
    });
  }

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const lcp = performance.getEntriesByType('largest-contentful-paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
        load: navigation.loadEventEnd - navigation.startTime,
        firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint:
          paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: lcp[lcp.length - 1]?.startTime || 0,
        timeToInteractive: navigation.domInteractive - navigation.startTime,
        ttfb: navigation.responseStart - navigation.requestStart,
      };
    });

    return metrics;
  }

  /**
   * Assert performance thresholds
   */
  async assertPerformance(thresholds: Partial<PerformanceMetrics>): Promise<void> {
    const metrics = await this.getPerformanceMetrics();

    if (thresholds.domContentLoaded !== undefined) {
      expect(metrics.domContentLoaded).toBeLessThan(thresholds.domContentLoaded);
    }
    if (thresholds.firstContentfulPaint !== undefined) {
      expect(metrics.firstContentfulPaint).toBeLessThan(thresholds.firstContentfulPaint);
    }
    if (thresholds.largestContentfulPaint !== undefined) {
      expect(metrics.largestContentfulPaint).toBeLessThan(thresholds.largestContentfulPaint);
    }
    if (thresholds.ttfb !== undefined) {
      expect(metrics.ttfb).toBeLessThan(thresholds.ttfb);
    }
  }

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  /**
   * Run accessibility audit
   */
  async checkAccessibility(options?: AccessibilityOptions): Promise<AccessibilityResult> {
    let builder = new AxeBuilder({ page: this.page });

    if (options?.tags) {
      builder = builder.withTags(options.tags);
    }

    if (options?.exclude) {
      for (const selector of options.exclude) {
        builder = builder.exclude(selector);
      }
    }

    if (options?.include) {
      for (const selector of options.include) {
        builder = builder.include(selector);
      }
    }

    const results = await builder.analyze();

    return {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable,
    };
  }

  /**
   * Assert no accessibility violations
   */
  async assertNoAccessibilityViolations(options?: AccessibilityOptions): Promise<void> {
    const results = await this.checkAccessibility(options);

    if (results.violations.length > 0) {
      const messages = results.violations.map((v) => {
        const nodes = v.nodes.map((n) => `  - ${n.html}`).join('\n');
        return `${v.id} (${v.impact}): ${v.description}\n${nodes}`;
      });

      throw new Error(`Accessibility violations found:\n\n${messages.join('\n\n')}`);
    }
  }

  // ============================================================================
  // NETWORK MOCKING
  // ============================================================================

  /**
   * Mock API response
   */
  async mockApi(
    urlPattern: string | RegExp,
    response: {
      status?: number;
      body?: unknown;
      headers?: Record<string, string>;
      delay?: number;
    }
  ): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      if (response.delay) {
        await new Promise((resolve) => setTimeout(resolve, response.delay));
      }

      await route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
        headers: response.headers,
      });
    });
  }

  /**
   * Mock API error
   */
  async mockApiError(
    urlPattern: string | RegExp,
    status = 500,
    message = 'Internal Server Error'
  ): Promise<void> {
    await this.mockApi(urlPattern, {
      status,
      body: { error: message, statusCode: status },
    });
  }

  /**
   * Mock network failure
   */
  async mockNetworkFailure(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, (route) => route.abort('failed'));
  }

  /**
   * Clear all route handlers
   */
  async clearMocks(): Promise<void> {
    await this.page.unrouteAll();
  }

  // ============================================================================
  // STORAGE
  // ============================================================================

  /**
   * Get localStorage item
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set localStorage item
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
  }

  /**
   * Remove localStorage item
   */
  async removeLocalStorageItem(key: string): Promise<void> {
    await this.page.evaluate((k) => localStorage.removeItem(k), key);
  }

  /**
   * Clear localStorage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Get sessionStorage item
   */
  async getSessionStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => sessionStorage.getItem(k), key);
  }

  /**
   * Set sessionStorage item
   */
  async setSessionStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ k, v }) => sessionStorage.setItem(k, v), { k: key, v: value });
  }

  /**
   * Get cookie by name
   */
  async getCookie(name: string): Promise<string | undefined> {
    const cookies = await this.page.context().cookies();
    return cookies.find((c) => c.name === name)?.value;
  }

  /**
   * Set cookie
   */
  async setCookie(
    name: string,
    value: string,
    options?: { domain?: string; path?: string }
  ): Promise<void> {
    const url = new URL(this.page.url());
    await this.page.context().addCookies([
      {
        name,
        value,
        domain: options?.domain || url.hostname,
        path: options?.path || '/',
      },
    ]);
  }

  /**
   * Clear all cookies
   */
  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetrics {
  domContentLoaded: number;
  load: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  ttfb: number;
}

export interface AccessibilityOptions {
  tags?: string[];
  exclude?: string[];
  include?: string[];
}

export interface AccessibilityResult {
  violations: AxeViolation[];
  passes: AxeResult[];
  incomplete: AxeResult[];
  inapplicable: AxeResult[];
}

interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface AxeNode {
  html: string;
  target: string[];
  failureSummary: string;
}

interface AxeResult {
  id: string;
  description: string;
  help: string;
  nodes: AxeNode[];
}
