/**
 * Keyboard Navigation Utilities
 *
 * Standard keyboard patterns for common UI components
 */

import { KeyboardShortcut } from './types';

/**
 * Keyboard Shortcut Manager
 *
 * Manages global and scoped keyboard shortcuts with support for
 * modifier keys and scope-based activation.
 */
export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private scopes: Set<string> = new Set(['global']);
  private activeScopes: Set<string> = new Set(['global']);
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private isDestroyed = false;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.boundHandleKeyDown);
    }
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): () => void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);

    if (shortcut.scope) {
      this.scopes.add(shortcut.scope);
    }

    return () => this.unregister(key);
  }

  /**
   * Register multiple shortcuts at once
   */
  registerAll(shortcuts: KeyboardShortcut[]): () => void {
    const unregisterFns = shortcuts.map((s) => this.register(s));
    return () => unregisterFns.forEach((fn) => fn());
  }

  /**
   * Unregister a shortcut by key
   */
  unregister(key: string): void {
    this.shortcuts.delete(key);
  }

  /**
   * Activate a scope
   */
  activateScope(scope: string): void {
    this.activeScopes.add(scope);
  }

  /**
   * Deactivate a scope
   */
  deactivateScope(scope: string): void {
    if (scope !== 'global') {
      this.activeScopes.delete(scope);
    }
  }

  /**
   * Set exclusive scope (deactivates all others except global)
   */
  setExclusiveScope(scope: string): void {
    this.activeScopes.clear();
    this.activeScopes.add('global');
    this.activeScopes.add(scope);
  }

  /**
   * Reset to only global scope
   */
  resetScopes(): void {
    this.activeScopes.clear();
    this.activeScopes.add('global');
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts for a specific scope
   */
  getShortcutsForScope(scope: string): KeyboardShortcut[] {
    return this.getShortcuts().filter(
      (s) => s.scope === scope || s.scope === 'global' || !s.scope
    );
  }

  /**
   * Get active scopes
   */
  getActiveScopes(): string[] {
    return Array.from(this.activeScopes);
  }

  /**
   * Check if a scope is active
   */
  isScopeActive(scope: string): boolean {
    return this.activeScopes.has(scope);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isDestroyed) return;

    // Don't trigger shortcuts when typing in inputs (unless using modifiers)
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow shortcuts with Ctrl/Cmd modifier in inputs
      if (!e.ctrlKey && !e.metaKey) {
        return;
      }
    }

    const key = this.getEventKey(e);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      const scope = shortcut.scope || 'global';
      if (this.activeScopes.has(scope) || scope === 'global') {
        e.preventDefault();
        shortcut.handler(e);
      }
    }
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.meta) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  private getEventKey(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Destroy the shortcut manager
   */
  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.boundHandleKeyDown);
    }
    this.shortcuts.clear();
    this.isDestroyed = true;
  }
}

// Singleton instance
let shortcutManager: KeyboardShortcutManager | null = null;

/**
 * Get the global shortcut manager instance
 */
export function getShortcutManager(): KeyboardShortcutManager {
  if (!shortcutManager) {
    shortcutManager = new KeyboardShortcutManager();
  }
  return shortcutManager;
}

/**
 * Destroy the global shortcut manager
 */
export function destroyShortcutManager(): void {
  shortcutManager?.destroy();
  shortcutManager = null;
}

/**
 * Common keyboard navigation patterns
 */
export const KeyboardPatterns = {
  /**
   * Menu navigation
   */
  menu: {
    ArrowUp: 'Move to previous item',
    ArrowDown: 'Move to next item',
    Home: 'Move to first item',
    End: 'Move to last item',
    Enter: 'Select item',
    Space: 'Select item',
    Escape: 'Close menu',
  },

  /**
   * Tab list navigation
   */
  tabs: {
    ArrowRight: 'Move to next tab',
    ArrowLeft: 'Move to previous tab',
    Home: 'Move to first tab',
    End: 'Move to last tab',
  },

  /**
   * Grid navigation
   */
  grid: {
    ArrowRight: 'Move right',
    ArrowLeft: 'Move left',
    ArrowUp: 'Move up',
    ArrowDown: 'Move down',
    Home: 'Move to first cell in row',
    End: 'Move to last cell in row',
    'Ctrl+Home': 'Move to first cell',
    'Ctrl+End': 'Move to last cell',
    PageUp: 'Move up one page',
    PageDown: 'Move down one page',
  },

  /**
   * Dialog navigation
   */
  dialog: {
    Tab: 'Move to next element',
    'Shift+Tab': 'Move to previous element',
    Escape: 'Close dialog',
  },

  /**
   * Combobox navigation
   */
  combobox: {
    ArrowDown: 'Open list / Move to next option',
    ArrowUp: 'Move to previous option',
    Enter: 'Select option',
    Escape: 'Close list',
    Home: 'Move to first option',
    End: 'Move to last option',
  },

  /**
   * Tree navigation
   */
  tree: {
    ArrowUp: 'Move to previous visible node',
    ArrowDown: 'Move to next visible node',
    ArrowRight: 'Expand node / Move to first child',
    ArrowLeft: 'Collapse node / Move to parent',
    Home: 'Move to first node',
    End: 'Move to last visible node',
    Enter: 'Activate node',
    Space: 'Toggle selection',
  },

  /**
   * Slider navigation
   */
  slider: {
    ArrowRight: 'Increase value',
    ArrowUp: 'Increase value',
    ArrowLeft: 'Decrease value',
    ArrowDown: 'Decrease value',
    Home: 'Set to minimum',
    End: 'Set to maximum',
    PageUp: 'Increase by large step',
    PageDown: 'Decrease by large step',
  },
} as const;

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Win');
  }

  // Format special keys
  const keyMap: Record<string, string> = {
    arrowup: isMac ? '↑' : '↑',
    arrowdown: isMac ? '↓' : '↓',
    arrowleft: isMac ? '←' : '←',
    arrowright: isMac ? '→' : '→',
    enter: isMac ? '↩' : 'Enter',
    escape: isMac ? '⎋' : 'Esc',
    tab: isMac ? '⇥' : 'Tab',
    backspace: isMac ? '⌫' : 'Backspace',
    delete: isMac ? '⌦' : 'Del',
    space: isMac ? '␣' : 'Space',
  };

  const key =
    keyMap[shortcut.key.toLowerCase()] ||
    (shortcut.key.length === 1
      ? shortcut.key.toUpperCase()
      : shortcut.key);

  parts.push(key);

  return parts.join(isMac ? '' : '+');
}

/**
 * Parse a shortcut string into a KeyboardShortcut object
 */
export function parseShortcut(
  shortcutString: string,
  handler: (e: KeyboardEvent) => void,
  description: string
): KeyboardShortcut {
  const parts = shortcutString.toLowerCase().split('+');
  const key = parts.pop() || '';

  return {
    key,
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    handler,
    description,
  };
}

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }
  if (!!shortcut.ctrl !== event.ctrlKey) return false;
  if (!!shortcut.alt !== event.altKey) return false;
  if (!!shortcut.shift !== event.shiftKey) return false;
  if (!!shortcut.meta !== event.metaKey) return false;

  return true;
}

/**
 * Create a keyboard event handler that matches a pattern
 */
export function createKeyboardHandler(
  handlers: Record<string, (e: KeyboardEvent) => void>
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const key = e.key;
    let handlerKey = key;

    // Build modifier prefix
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta');

    if (modifiers.length > 0) {
      handlerKey = `${modifiers.join('+')}+${key}`;
    }

    const handler = handlers[handlerKey] || handlers[key];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  };
}
