/**
 * Accessibility Types
 *
 * Common types used throughout the accessibility package
 */

/**
 * ARIA live region politeness levels
 */
export type Politeness = 'polite' | 'assertive' | 'off';

/**
 * WCAG compliance levels
 */
export type WCAGLevel = 'A' | 'AA' | 'AAA';

/**
 * ARIA roles for interactive elements
 */
export type InteractiveRole =
  | 'button'
  | 'checkbox'
  | 'combobox'
  | 'grid'
  | 'gridcell'
  | 'link'
  | 'listbox'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'option'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'scrollbar'
  | 'searchbox'
  | 'slider'
  | 'spinbutton'
  | 'switch'
  | 'tab'
  | 'tablist'
  | 'tabpanel'
  | 'textbox'
  | 'tree'
  | 'treeitem'
  | 'treegrid';

/**
 * ARIA landmark roles
 */
export type LandmarkRole =
  | 'banner'
  | 'complementary'
  | 'contentinfo'
  | 'form'
  | 'main'
  | 'navigation'
  | 'region'
  | 'search';

/**
 * Focus trap options
 */
export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string | null;
  returnFocusOnDeactivate?: boolean;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  allowOutsideClick?: boolean | ((e: MouseEvent) => boolean);
  preventScroll?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onPostActivate?: () => void;
  onPostDeactivate?: () => void;
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
  scope?: string;
}

/**
 * Announcement options
 */
export interface AnnouncementOptions {
  politeness?: Politeness;
  timeout?: number;
  clearPrevious?: boolean;
}

/**
 * Color contrast result
 */
export interface ContrastResult {
  ratio: number;
  aa: {
    normalText: boolean;
    largeText: boolean;
    uiComponents: boolean;
  };
  aaa: {
    normalText: boolean;
    largeText: boolean;
  };
  level: 'AAA' | 'AA' | 'Fail';
}

/**
 * RGB color representation
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL color representation
 */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Accessibility audit violation
 */
export interface A11yViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yViolationNode[];
  wcagCriteria: string[];
}

/**
 * Accessibility violation node
 */
export interface A11yViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

/**
 * Accessibility audit result
 */
export interface A11yAuditResult {
  passed: boolean;
  violations: A11yViolation[];
  incompleteTests: A11yViolation[];
  passedTests: number;
  summary: string;
}

/**
 * Skip link definition
 */
export interface SkipLink {
  id: string;
  label: string;
}

/**
 * Roving tabindex options
 */
export interface RovingTabindexOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  initialIndex?: number;
}

/**
 * Form field accessibility props
 */
export interface AccessibleFieldProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-errormessage'?: string;
}

/**
 * Screen reader supported platforms
 */
export type ScreenReaderPlatform = 'nvda' | 'jaws' | 'voiceover' | 'talkback' | 'narrator';

/**
 * Motion preference
 */
export type MotionPreference = 'no-preference' | 'reduce';

/**
 * Color scheme preference
 */
export type ColorSchemePreference = 'light' | 'dark' | 'no-preference';

/**
 * Contrast preference
 */
export type ContrastPreference = 'no-preference' | 'more' | 'less' | 'custom';
