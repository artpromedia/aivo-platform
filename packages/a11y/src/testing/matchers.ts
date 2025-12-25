import type { Result, NodeResult } from 'axe-core';
import { runAxeTest, formatViolation, type AxeConfig } from './axe-runner';

export interface A11yMatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Custom matchers for accessibility testing
 */
export const a11yMatchers = {
  /**
   * Check if element has no accessibility violations
   */
  async toBeAccessible(
    received: HTMLElement | Document,
    options?: Partial<AxeConfig>
  ): Promise<A11yMatcherResult> {
    const results = await runAxeTest(received, options);
    const violations = results.violations;

    if (violations.length === 0) {
      return {
        pass: true,
        message: () => 'Expected element to have accessibility violations, but none were found',
      };
    }

    const formattedViolations = violations.map(formatViolation).join('\n');

    return {
      pass: false,
      message: () =>
        `Expected element to be accessible, but found ${violations.length} violation(s):\n${formattedViolations}`,
    };
  },

  /**
   * Check if element has valid ARIA attributes
   */
  toHaveValidAriaAttributes(received: HTMLElement): A11yMatcherResult {
    const ariaAttributes = Array.from(received.attributes).filter((attr) =>
      attr.name.startsWith('aria-')
    );

    const errors: string[] = [];

    for (const attr of ariaAttributes) {
      const { name, value } = attr;

      // Check for empty values
      if (value === '' && !['aria-hidden', 'aria-modal'].includes(name)) {
        errors.push(`${name} has empty value`);
      }

      // Check boolean attributes
      if (
        ['aria-hidden', 'aria-disabled', 'aria-selected', 'aria-checked', 'aria-pressed'].includes(
          name
        ) &&
        !['true', 'false'].includes(value) &&
        value !== 'mixed' // mixed is valid for aria-checked
      ) {
        errors.push(`${name} has invalid boolean value: ${value}`);
      }

      // Check aria-expanded
      if (name === 'aria-expanded' && !['true', 'false'].includes(value)) {
        errors.push(`aria-expanded has invalid value: ${value}`);
      }

      // Check aria-level
      if (name === 'aria-level') {
        const level = parseInt(value, 10);
        if (isNaN(level) || level < 1 || level > 6) {
          errors.push(`aria-level has invalid value: ${value} (must be 1-6)`);
        }
      }
    }

    if (errors.length === 0) {
      return {
        pass: true,
        message: () => 'Expected element to have invalid ARIA attributes',
      };
    }

    return {
      pass: false,
      message: () =>
        `Expected element to have valid ARIA attributes:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    };
  },

  /**
   * Check if element is focusable
   */
  toBeFocusable(received: HTMLElement): A11yMatcherResult {
    const tabindex = received.getAttribute('tabindex');
    const tagName = received.tagName.toLowerCase();

    // Naturally focusable elements
    const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
    const isNaturallyFocusable =
      focusableTags.includes(tagName) &&
      !received.hasAttribute('disabled') &&
      (tagName !== 'a' || received.hasAttribute('href'));

    // Programmatically focusable
    const isProgrammaticallyFocusable = tabindex !== null && tabindex !== '-1';

    const isFocusable = isNaturallyFocusable || isProgrammaticallyFocusable;

    return {
      pass: isFocusable,
      message: () =>
        isFocusable
          ? 'Expected element not to be focusable'
          : 'Expected element to be focusable',
    };
  },

  /**
   * Check if element has accessible name
   */
  toHaveAccessibleName(received: HTMLElement, expectedName?: string): A11yMatcherResult {
    // Check aria-label
    const ariaLabel = received.getAttribute('aria-label');
    if (ariaLabel) {
      if (expectedName && ariaLabel !== expectedName) {
        return {
          pass: false,
          message: () =>
            `Expected accessible name "${expectedName}", but found "${ariaLabel}"`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected element not to have accessible name',
      };
    }

    // Check aria-labelledby
    const labelledBy = received.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        const labelText = labelElement.textContent?.trim();
        if (expectedName && labelText !== expectedName) {
          return {
            pass: false,
            message: () =>
              `Expected accessible name "${expectedName}", but found "${labelText}"`,
          };
        }
        return {
          pass: true,
          message: () => 'Expected element not to have accessible name',
        };
      }
    }

    // Check associated label (for form controls)
    const id = received.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        const labelText = label.textContent?.trim();
        if (expectedName && labelText !== expectedName) {
          return {
            pass: false,
            message: () =>
              `Expected accessible name "${expectedName}", but found "${labelText}"`,
          };
        }
        return {
          pass: true,
          message: () => 'Expected element not to have accessible name',
        };
      }
    }

    // Check title attribute
    const title = received.getAttribute('title');
    if (title) {
      if (expectedName && title !== expectedName) {
        return {
          pass: false,
          message: () => `Expected accessible name "${expectedName}", but found "${title}"`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected element not to have accessible name',
      };
    }

    // Check inner text for buttons
    if (received.tagName.toLowerCase() === 'button') {
      const text = received.textContent?.trim();
      if (text) {
        if (expectedName && text !== expectedName) {
          return {
            pass: false,
            message: () => `Expected accessible name "${expectedName}", but found "${text}"`,
          };
        }
        return {
          pass: true,
          message: () => 'Expected element not to have accessible name',
        };
      }
    }

    return {
      pass: false,
      message: () => 'Expected element to have accessible name',
    };
  },

  /**
   * Check if element has specific role
   */
  toHaveRole(received: HTMLElement, expectedRole: string): A11yMatcherResult {
    const explicitRole = received.getAttribute('role');
    const tagName = received.tagName.toLowerCase();

    // Implicit roles
    const implicitRoles: Record<string, string> = {
      a: 'link',
      button: 'button',
      article: 'article',
      aside: 'complementary',
      footer: 'contentinfo',
      header: 'banner',
      main: 'main',
      nav: 'navigation',
      section: 'region',
      img: 'img',
      table: 'table',
      form: 'form',
      input: 'textbox', // simplified
      select: 'combobox',
      textarea: 'textbox',
    };

    const actualRole = explicitRole || implicitRoles[tagName];

    const pass = actualRole === expectedRole;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have role "${expectedRole}"`
          : `Expected element to have role "${expectedRole}", but found "${actualRole || 'none'}"`,
    };
  },
};

/**
 * Setup custom matchers for testing framework
 * Works with Vitest/Jest
 */
export function setupA11yMatchers(): void {
  // For Vitest/Jest
  if (typeof expect !== 'undefined' && typeof expect.extend === 'function') {
    expect.extend(a11yMatchers);
  }
}

// Type augmentation for Vitest/Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(options?: Partial<AxeConfig>): Promise<R>;
      toHaveValidAriaAttributes(): R;
      toBeFocusable(): R;
      toHaveAccessibleName(expectedName?: string): R;
      toHaveRole(expectedRole: string): R;
    }
  }
}
