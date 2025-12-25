import { runAxeTest, type AxeConfig, type AxeTestResult } from './axe-runner';
import { FOCUSABLE_SELECTOR, isFocusable, getFocusableElements } from '../focus-management';

interface TestAccessibilityOptions extends Partial<AxeConfig> {
  failOnViolation?: boolean;
  ignoreIncomplete?: boolean;
}

/**
 * Test accessibility of an element or document
 */
export async function testAccessibility(
  container: HTMLElement | Document = document,
  options: TestAccessibilityOptions = {}
): Promise<{ passed: boolean; results: AxeTestResult; summary: string }> {
  const { failOnViolation = true, ignoreIncomplete = false, ...axeOptions } = options;

  const results = await runAxeTest(container, axeOptions);

  const violationCount = results.violations.length;
  const incompleteCount = results.incomplete.length;
  const passCount = results.passes.length;

  let passed = violationCount === 0;
  if (!ignoreIncomplete && incompleteCount > 0) {
    passed = false;
  }

  const summary = [
    `Accessibility test ${passed ? 'PASSED' : 'FAILED'}`,
    `  ✓ ${passCount} rules passed`,
    `  ✗ ${violationCount} violations`,
    `  ? ${incompleteCount} incomplete`,
    `  - ${results.inapplicable.length} inapplicable`,
  ].join('\n');

  return { passed, results, summary };
}

/**
 * Check keyboard navigation within a container
 */
export function checkKeyboardNavigation(
  container: HTMLElement
): {
  passed: boolean;
  issues: string[];
  focusableElements: HTMLElement[];
} {
  const issues: string[] = [];
  const focusableElements = getFocusableElements(container);

  if (focusableElements.length === 0) {
    issues.push('No focusable elements found in container');
    return { passed: false, issues, focusableElements };
  }

  // Check for logical tab order
  const tabIndexes = focusableElements.map((el) => {
    const tabIndex = el.getAttribute('tabindex');
    return tabIndex ? parseInt(tabIndex, 10) : 0;
  });

  const hasPositiveTabIndex = tabIndexes.some((i) => i > 0);
  if (hasPositiveTabIndex) {
    issues.push(
      'Positive tabindex values found. This can disrupt natural reading order.'
    );
  }

  // Check for focus visibility
  focusableElements.forEach((el, index) => {
    const styles = window.getComputedStyle(el);
    if (styles.outline === 'none' || styles.outline === '0') {
      // Only warn if no other focus indicator
      if (!el.classList.contains('focus-visible') && !styles.boxShadow.includes('rgb')) {
        issues.push(
          `Element ${index + 1} (${el.tagName.toLowerCase()}) may lack visible focus indicator`
        );
      }
    }
  });

  // Check for keyboard traps
  const dialogsAndModals = container.querySelectorAll('[role="dialog"], [role="alertdialog"]');
  dialogsAndModals.forEach((dialog, index) => {
    const dialogFocusables = getFocusableElements(dialog as HTMLElement);
    if (dialogFocusables.length === 0) {
      issues.push(`Dialog ${index + 1} has no focusable elements`);
    }
  });

  return {
    passed: issues.length === 0,
    issues,
    focusableElements,
  };
}

/**
 * Check focus management
 */
export function checkFocusManagement(container: HTMLElement): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for proper focus management on interactive widgets
  const widgets = container.querySelectorAll(
    '[role="menu"], [role="listbox"], [role="tree"], [role="tablist"], [role="grid"]'
  );

  widgets.forEach((widget, index) => {
    const role = widget.getAttribute('role');
    const focusables = getFocusableElements(widget as HTMLElement);

    if (focusables.length === 0) {
      issues.push(`${role} widget ${index + 1} has no focusable items`);
      return;
    }

    // Check for roving tabindex or aria-activedescendant
    const hasRovingTabindex = focusables.some((el) => el.getAttribute('tabindex') === '0');
    const hasActiveDescendant = widget.hasAttribute('aria-activedescendant');

    if (!hasRovingTabindex && !hasActiveDescendant) {
      issues.push(
        `${role} widget ${index + 1} may lack proper focus management (no roving tabindex or aria-activedescendant)`
      );
    }
  });

  // Check for modals without focus trapping hints
  const modals = container.querySelectorAll('[aria-modal="true"]');
  modals.forEach((modal, index) => {
    if (!modal.hasAttribute('tabindex')) {
      issues.push(
        `Modal ${index + 1} lacks tabindex="-1" for programmatic focus`
      );
    }
  });

  return { passed: issues.length === 0, issues };
}

/**
 * Check ARIA attributes
 */
export function checkAriaAttributes(container: HTMLElement): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for elements with ARIA attributes
  const elementsWithAria = container.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns]');

  elementsWithAria.forEach((el) => {
    // Check aria-labelledby
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const ids = labelledby.split(' ');
      ids.forEach((id) => {
        if (!document.getElementById(id)) {
          issues.push(`aria-labelledby references non-existent id: ${id}`);
        }
      });
    }

    // Check aria-describedby
    const describedby = el.getAttribute('aria-describedby');
    if (describedby) {
      const ids = describedby.split(' ');
      ids.forEach((id) => {
        if (!document.getElementById(id)) {
          issues.push(`aria-describedby references non-existent id: ${id}`);
        }
      });
    }

    // Check aria-controls
    const controls = el.getAttribute('aria-controls');
    if (controls) {
      const ids = controls.split(' ');
      ids.forEach((id) => {
        if (!document.getElementById(id)) {
          issues.push(`aria-controls references non-existent id: ${id}`);
        }
      });
    }

    // Check aria-owns
    const owns = el.getAttribute('aria-owns');
    if (owns) {
      const ids = owns.split(' ');
      ids.forEach((id) => {
        if (!document.getElementById(id)) {
          issues.push(`aria-owns references non-existent id: ${id}`);
        }
      });
    }
  });

  // Check for required ARIA attributes on roles
  const roleRequirements: Record<string, string[]> = {
    checkbox: ['aria-checked'],
    combobox: ['aria-expanded'],
    slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    meter: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    progressbar: ['aria-valuenow'],
    scrollbar: ['aria-controls', 'aria-valuenow'],
    separator: [], // Focusable separator needs valuenow
    switch: ['aria-checked'],
    tabpanel: ['aria-labelledby'],
  };

  Object.entries(roleRequirements).forEach(([role, requiredAttrs]) => {
    const elements = container.querySelectorAll(`[role="${role}"]`);
    elements.forEach((el, index) => {
      requiredAttrs.forEach((attr) => {
        if (!el.hasAttribute(attr)) {
          issues.push(`Element with role="${role}" ${index + 1} is missing required ${attr}`);
        }
      });
    });
  });

  // Check for interactive elements without accessible names
  const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'option'];
  interactiveRoles.forEach((role) => {
    const elements = container.querySelectorAll(`[role="${role}"]`);
    elements.forEach((el, index) => {
      const hasAccessibleName =
        el.hasAttribute('aria-label') ||
        el.hasAttribute('aria-labelledby') ||
        el.textContent?.trim();

      if (!hasAccessibleName) {
        issues.push(`Element with role="${role}" ${index + 1} lacks accessible name`);
      }
    });
  });

  return { passed: issues.length === 0, issues };
}

/**
 * Quick accessibility check combining all tests
 */
export async function quickA11yCheck(
  container: HTMLElement | Document = document
): Promise<{
  passed: boolean;
  summary: string;
  details: {
    axe: Awaited<ReturnType<typeof testAccessibility>>;
    keyboard: ReturnType<typeof checkKeyboardNavigation> | null;
    focus: ReturnType<typeof checkFocusManagement> | null;
    aria: ReturnType<typeof checkAriaAttributes> | null;
  };
}> {
  const containerElement = container instanceof Document ? document.body : container;

  const [axe, keyboard, focus, aria] = await Promise.all([
    testAccessibility(container),
    Promise.resolve(checkKeyboardNavigation(containerElement)),
    Promise.resolve(checkFocusManagement(containerElement)),
    Promise.resolve(checkAriaAttributes(containerElement)),
  ]);

  const passed = axe.passed && keyboard.passed && focus.passed && aria.passed;

  const summary = [
    `Quick Accessibility Check: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`,
    '',
    axe.summary,
    '',
    `Keyboard Navigation: ${keyboard.passed ? 'PASSED' : 'FAILED'}`,
    ...keyboard.issues.map((i) => `  - ${i}`),
    '',
    `Focus Management: ${focus.passed ? 'PASSED' : 'FAILED'}`,
    ...focus.issues.map((i) => `  - ${i}`),
    '',
    `ARIA Attributes: ${aria.passed ? 'PASSED' : 'FAILED'}`,
    ...aria.issues.map((i) => `  - ${i}`),
  ].join('\n');

  return {
    passed,
    summary,
    details: { axe, keyboard, focus, aria },
  };
}
