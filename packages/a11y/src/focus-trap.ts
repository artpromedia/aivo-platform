/**
 * Focus Trap
 *
 * Traps focus within a container element, essential for:
 * - Modal dialogs
 * - Dropdown menus
 * - Side panels
 * - Popovers
 */

import { FocusTrapOptions } from './types';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * FocusTrap class
 *
 * Manages focus within a container, preventing focus from escaping
 * and handling keyboard navigation.
 */
export class FocusTrap {
  private container: HTMLElement;
  private options: Required<FocusTrapOptions>;
  private isActive = false;
  private previouslyFocusedElement: HTMLElement | null = null;
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;

  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleClick: (e: MouseEvent) => void;
  private boundHandleFocusIn: (e: FocusEvent) => void;
  private mutationObserver: MutationObserver | null = null;

  constructor(container: HTMLElement, options: FocusTrapOptions = {}) {
    this.container = container;
    this.options = {
      initialFocus: options.initialFocus ?? null,
      returnFocusOnDeactivate: options.returnFocusOnDeactivate ?? true,
      escapeDeactivates: options.escapeDeactivates ?? true,
      clickOutsideDeactivates: options.clickOutsideDeactivates ?? false,
      allowOutsideClick: options.allowOutsideClick ?? false,
      preventScroll: options.preventScroll ?? false,
      onActivate: options.onActivate ?? (() => {}),
      onDeactivate: options.onDeactivate ?? (() => {}),
      onPostActivate: options.onPostActivate ?? (() => {}),
      onPostDeactivate: options.onPostDeactivate ?? (() => {}),
    };

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleFocusIn = this.handleFocusIn.bind(this);
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.previouslyFocusedElement = document.activeElement as HTMLElement;

    this.options.onActivate();

    // Update focusable elements
    this.updateFocusableElements();

    // Set up mutation observer to track DOM changes
    this.setupMutationObserver();

    // Add event listeners
    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('click', this.boundHandleClick, true);
    document.addEventListener('focusin', this.boundHandleFocusIn);

    // Set initial focus
    this.setInitialFocus();

    this.options.onPostActivate();
  }

  /**
   * Deactivate the focus trap
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;

    this.options.onDeactivate();

    // Remove event listeners
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('click', this.boundHandleClick, true);
    document.removeEventListener('focusin', this.boundHandleFocusIn);

    // Disconnect mutation observer
    this.mutationObserver?.disconnect();

    // Return focus
    if (
      this.options.returnFocusOnDeactivate &&
      this.previouslyFocusedElement &&
      document.contains(this.previouslyFocusedElement)
    ) {
      this.previouslyFocusedElement.focus({
        preventScroll: this.options.preventScroll,
      });
    }

    this.options.onPostDeactivate();
  }

  /**
   * Pause the focus trap (temporarily disable)
   */
  pause(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('focusin', this.boundHandleFocusIn);
  }

  /**
   * Unpause the focus trap
   */
  unpause(): void {
    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('focusin', this.boundHandleFocusIn);
  }

  /**
   * Check if the focus trap is currently active
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Update focusable elements (call when content changes)
   */
  updateFocusableElements(): void {
    const focusableElements = this.getFocusableElements();
    this.firstFocusableElement = focusableElements[0] || null;
    this.lastFocusableElement =
      focusableElements[focusableElements.length - 1] || null;
  }

  private getFocusableElements(): HTMLElement[] {
    const elements = Array.from(
      this.container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );

    return elements.filter((el) => {
      // Filter out elements that aren't visible
      if (el.offsetParent === null && el.tagName !== 'BODY') {
        return false;
      }
      // Filter out elements with visibility: hidden or display: none
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') {
        return false;
      }
      return true;
    });
  }

  private setInitialFocus(): void {
    let elementToFocus: HTMLElement | null = null;

    if (this.options.initialFocus) {
      if (typeof this.options.initialFocus === 'string') {
        elementToFocus = this.container.querySelector(
          this.options.initialFocus
        );
      } else {
        elementToFocus = this.options.initialFocus;
      }
    }

    if (!elementToFocus) {
      // Try to find an element with autofocus
      elementToFocus =
        this.container.querySelector<HTMLElement>('[autofocus]');
    }

    if (!elementToFocus) {
      // Try to find an element with data-autofocus
      elementToFocus =
        this.container.querySelector<HTMLElement>('[data-autofocus]');
    }

    if (!elementToFocus) {
      // Fall back to first focusable element
      elementToFocus = this.firstFocusableElement;
    }

    if (!elementToFocus) {
      // Fall back to the container itself (must be focusable)
      if (!this.container.hasAttribute('tabindex')) {
        this.container.setAttribute('tabindex', '-1');
      }
      elementToFocus = this.container;
    }

    elementToFocus.focus({ preventScroll: this.options.preventScroll });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return;

    if (e.key === 'Escape' && this.options.escapeDeactivates) {
      e.preventDefault();
      this.deactivate();
      return;
    }

    if (e.key === 'Tab') {
      this.handleTabKey(e);
    }
  }

  private handleTabKey(e: KeyboardEvent): void {
    this.updateFocusableElements();

    if (!this.firstFocusableElement || !this.lastFocusableElement) {
      e.preventDefault();
      return;
    }

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusableElement) {
        e.preventDefault();
        this.lastFocusableElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusableElement) {
        e.preventDefault();
        this.firstFocusableElement.focus();
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.isActive) return;

    const target = e.target as Node;
    const isOutsideClick = !this.container.contains(target);

    if (isOutsideClick) {
      if (this.options.clickOutsideDeactivates) {
        this.deactivate();
      } else if (!this.options.allowOutsideClick) {
        e.preventDefault();
        e.stopPropagation();
      } else if (typeof this.options.allowOutsideClick === 'function') {
        if (!this.options.allowOutsideClick(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  }

  private handleFocusIn(e: FocusEvent): void {
    if (!this.isActive) return;

    const target = e.target as Node;

    if (!this.container.contains(target)) {
      // Focus escaped - bring it back
      e.preventDefault();
      e.stopPropagation();
      this.firstFocusableElement?.focus();
    }
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver(() => {
      this.updateFocusableElements();
    });

    this.mutationObserver.observe(this.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'tabindex', 'style'],
    });
  }
}

/**
 * Create and optionally activate a focus trap
 */
export function createFocusTrap(
  container: HTMLElement | string,
  options?: FocusTrapOptions
): FocusTrap {
  const element =
    typeof container === 'string'
      ? document.querySelector<HTMLElement>(container)
      : container;

  if (!element) {
    throw new Error('Focus trap container not found');
  }

  return new FocusTrap(element, options);
}

/**
 * Create and immediately activate a focus trap
 */
export function activateFocusTrap(
  container: HTMLElement | string,
  options?: FocusTrapOptions
): FocusTrap {
  const trap = createFocusTrap(container, options);
  trap.activate();
  return trap;
}
