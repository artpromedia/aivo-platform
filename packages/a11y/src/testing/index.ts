/**
 * Accessibility Testing Utilities
 *
 * Automated accessibility testing with axe-core integration
 */

export { axeRunner, runAxeTest, configureAxe, type AxeConfig, type AxeTestResult } from './axe-runner';
export { a11yMatchers, setupA11yMatchers, type A11yMatcherResult } from './matchers';
export { testAccessibility, checkKeyboardNavigation, checkFocusManagement, checkAriaAttributes } from './test-helpers';
export { generateA11yReport, type A11yReport, type A11yViolationReport } from './reporter';
