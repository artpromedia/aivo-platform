/**
 * Focus Management Utilities
 *
 * Provides utilities for managing focus in complex UIs:
 * - Focus restoration
 * - Focus scope management
 * - Roving tabindex
 * - Focus visible detection
 */

import { RovingTabindexOptions } from './types';

/**
 * Selectors for focusable elements
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Selectors for tabbable elements (natural tab order)
 */
export const TABBABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]:not([tabindex="-1"])',
].join(', ');

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) {
    return false;
  }

  if (element.hasAttribute('disabled')) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  // Check if element or any ancestor has display:none or visibility:hidden
  let current: HTMLElement | null = element;
  while (current) {
    const currentStyle = window.getComputedStyle(current);
    if (currentStyle.display === 'none' || currentStyle.visibility === 'hidden') {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

/**
 * Check if an element is tabbable (can receive focus via Tab key)
 */
export function isTabbable(element: HTMLElement): boolean {
  if (!isFocusable(element)) {
    return false;
  }

  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex === '-1') {
    return false;
  }

  return true;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isFocusable
  );
}

/**
 * Get all tabbable elements within a container
 */
export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
    isTabbable
  );
}

/**
 * Get the first focusable element in a container
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Get the last focusable element in a container
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * Get the next focusable element
 */
export function getNextFocusable(
  container: HTMLElement,
  currentElement: HTMLElement,
  wrap = true
): HTMLElement | null {
  const elements = getFocusableElements(container);
  const currentIndex = elements.indexOf(currentElement);

  if (currentIndex === -1) {
    return elements[0] || null;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex >= elements.length) {
    return wrap ? elements[0] : null;
  }

  return elements[nextIndex];
}

/**
 * Get the previous focusable element
 */
export function getPreviousFocusable(
  container: HTMLElement,
  currentElement: HTMLElement,
  wrap = true
): HTMLElement | null {
  const elements = getFocusableElements(container);
  const currentIndex = elements.indexOf(currentElement);

  if (currentIndex === -1) {
    return elements[elements.length - 1] || null;
  }

  const prevIndex = currentIndex - 1;
  if (prevIndex < 0) {
    return wrap ? elements[elements.length - 1] : null;
  }

  return elements[prevIndex];
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirst(
  container: HTMLElement,
  options?: FocusOptions
): boolean {
  const element = getFirstFocusable(container);
  if (element) {
    element.focus(options);
    return true;
  }
  return false;
}

/**
 * Focus the last focusable element in a container
 */
export function focusLast(
  container: HTMLElement,
  options?: FocusOptions
): boolean {
  const element = getLastFocusable(container);
  if (element) {
    element.focus(options);
    return true;
  }
  return false;
}

/**
 * Focus Scope Manager
 *
 * Manages focus within a scope, useful for composite widgets
 * like menus, toolbars, and grids.
 */
export class FocusScope {
  private container: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private currentIndex = 0;
  private orientation: RovingTabindexOptions['orientation'];
  private wrap: boolean;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: RovingTabindexOptions = {}) {
    this.container = container;
    this.orientation = options.orientation || 'both';
    this.wrap = options.wrap ?? true;
    this.currentIndex = options.initialIndex ?? 0;

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.updateFocusableElements();
    this.container.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Update the list of focusable elements
   */
  updateFocusableElements(): void {
    this.focusableElements = getFocusableElements(this.container);
    this.applyRovingTabindex();
  }

  /**
   * Get current focused index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get currently focused element
   */
  getCurrentElement(): HTMLElement | null {
    return this.focusableElements[this.currentIndex] || null;
  }

  private applyRovingTabindex(): void {
    this.focusableElements.forEach((element, index) => {
      element.setAttribute(
        'tabindex',
        index === this.currentIndex ? '0' : '-1'
      );
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    let handled = false;
    let newIndex = this.currentIndex;

    switch (e.key) {
      case 'ArrowRight':
        if (
          this.orientation === 'horizontal' ||
          this.orientation === 'both'
        ) {
          newIndex = this.getNextIndex();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (
          this.orientation === 'horizontal' ||
          this.orientation === 'both'
        ) {
          newIndex = this.getPreviousIndex();
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (this.orientation === 'vertical' || this.orientation === 'both') {
          newIndex = this.getNextIndex();
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (this.orientation === 'vertical' || this.orientation === 'both') {
          newIndex = this.getPreviousIndex();
          handled = true;
        }
        break;
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
      case 'End':
        newIndex = this.focusableElements.length - 1;
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      this.focusIndex(newIndex);
    }
  }

  private getNextIndex(): number {
    const next = this.currentIndex + 1;
    if (next >= this.focusableElements.length) {
      return this.wrap ? 0 : this.currentIndex;
    }
    return next;
  }

  private getPreviousIndex(): number {
    const prev = this.currentIndex - 1;
    if (prev < 0) {
      return this.wrap ? this.focusableElements.length - 1 : this.currentIndex;
    }
    return prev;
  }

  /**
   * Focus a specific index
   */
  focusIndex(index: number): void {
    if (index < 0 || index >= this.focusableElements.length) {
      return;
    }

    const previousElement = this.focusableElements[this.currentIndex];
    const nextElement = this.focusableElements[index];

    if (previousElement) {
      previousElement.setAttribute('tabindex', '-1');
    }

    if (nextElement) {
      nextElement.setAttribute('tabindex', '0');
      nextElement.focus();
    }

    this.currentIndex = index;
  }

  /**
   * Focus first element
   */
  focusFirst(): void {
    this.focusIndex(0);
  }

  /**
   * Focus last element
   */
  focusLast(): void {
    this.focusIndex(this.focusableElements.length - 1);
  }

  /**
   * Destroy the focus scope
   */
  destroy(): void {
    this.container.removeEventListener('keydown', this.boundHandleKeyDown);
  }
}

/**
 * Focus restoration stack
 */
const focusStack: HTMLElement[] = [];

/**
 * Save current focus for later restoration
 */
export function saveFocus(): void {
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && activeElement !== document.body) {
    focusStack.push(activeElement);
  }
}

/**
 * Restore previously saved focus
 */
export function restoreFocus(options?: FocusOptions): void {
  const element = focusStack.pop();
  if (element && document.contains(element)) {
    element.focus(options);
  }
}

/**
 * Get the current focus stack depth
 */
export function getFocusStackDepth(): number {
  return focusStack.length;
}

/**
 * Clear the focus stack
 */
export function clearFocusStack(): void {
  focusStack.length = 0;
}

/**
 * Focus visible state tracking
 */
let hadKeyboardEvent = false;
let isUsingKeyboard = false;

function onPointerDown(): void {
  hadKeyboardEvent = false;
  isUsingKeyboard = false;
}

function onKeyDown(e: KeyboardEvent): void {
  // Only specific keys indicate keyboard navigation
  if (
    e.key === 'Tab' ||
    e.key === 'Escape' ||
    e.key.startsWith('Arrow') ||
    e.key === 'Enter' ||
    e.key === ' '
  ) {
    hadKeyboardEvent = true;
    isUsingKeyboard = true;
  }
}

function onFocus(): void {
  if (hadKeyboardEvent) {
    document.body.classList.add('focus-visible');
    document.body.setAttribute('data-focus-visible', 'true');
  }
}

function onBlur(): void {
  document.body.classList.remove('focus-visible');
  document.body.removeAttribute('data-focus-visible');
}

let focusVisibleInitialized = false;

/**
 * Initialize focus-visible polyfill/detection
 */
export function initFocusVisible(): void {
  if (focusVisibleInitialized || typeof document === 'undefined') return;

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);

  focusVisibleInitialized = true;
}

/**
 * Cleanup focus-visible listeners
 */
export function cleanupFocusVisible(): void {
  if (!focusVisibleInitialized || typeof document === 'undefined') return;

  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('mousedown', onPointerDown, true);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('focus', onFocus, true);
  document.removeEventListener('blur', onBlur, true);

  focusVisibleInitialized = false;
}

/**
 * Check if focus should be visible (keyboard navigation is active)
 */
export function shouldShowFocusVisible(): boolean {
  return isUsingKeyboard;
}

/**
 * Check if user is currently using keyboard navigation
 */
export function isKeyboardUser(): boolean {
  return isUsingKeyboard;
}

/**
 * Focus an element and scroll it into view if needed
 */
export function focusAndScrollIntoView(
  element: HTMLElement,
  options?: ScrollIntoViewOptions
): void {
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
    ...options,
  });
}

/**
 * Create a focus guard element (invisible element to catch focus)
 */
export function createFocusGuard(onFocus: () => void): HTMLElement {
  const guard = document.createElement('div');
  guard.setAttribute('tabindex', '0');
  guard.setAttribute('aria-hidden', 'true');
  guard.setAttribute('data-focus-guard', 'true');

  Object.assign(guard.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '0',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  guard.addEventListener('focus', onFocus);

  return guard;
}
