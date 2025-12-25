import { useEffect, useCallback, useRef } from 'react';
import {
  getShortcutManager,
  parseShortcut,
  matchesShortcut,
} from '../keyboard-navigation';
import { KeyboardShortcut } from '../types';

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut | string,
  handler: (e: KeyboardEvent) => void,
  options: {
    enabled?: boolean;
    scope?: string;
    description?: string;
  } = {}
) {
  const { enabled = true, scope, description = '' } = options;
  const handlerRef = useRef(handler);

  // Keep handler ref updated
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const parsedShortcut: KeyboardShortcut =
      typeof shortcut === 'string'
        ? parseShortcut(shortcut, (e) => handlerRef.current(e), description)
        : { ...shortcut, handler: (e) => handlerRef.current(e) };

    if (scope) {
      parsedShortcut.scope = scope;
    }

    const unregister = getShortcutManager().register(parsedShortcut);

    return unregister;
  }, [shortcut, enabled, scope, description]);
}

/**
 * Hook for registering multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{
    shortcut: KeyboardShortcut | string;
    handler: (e: KeyboardEvent) => void;
    description?: string;
  }>,
  options: {
    enabled?: boolean;
    scope?: string;
  } = {}
) {
  const { enabled = true, scope } = options;

  useEffect(() => {
    if (!enabled) return;

    const parsedShortcuts = shortcuts.map(({ shortcut, handler, description }) => {
      const parsed =
        typeof shortcut === 'string'
          ? parseShortcut(shortcut, handler, description || '')
          : { ...shortcut, handler };

      if (scope) {
        parsed.scope = scope;
      }

      return parsed;
    });

    const unregister = getShortcutManager().registerAll(parsedShortcuts);

    return unregister;
  }, [shortcuts, enabled, scope]);
}

/**
 * Hook for keyboard navigation patterns
 */
export function useKeyboardNavigation<T extends HTMLElement>(options: {
  onArrowUp?: (e: React.KeyboardEvent<T>) => void;
  onArrowDown?: (e: React.KeyboardEvent<T>) => void;
  onArrowLeft?: (e: React.KeyboardEvent<T>) => void;
  onArrowRight?: (e: React.KeyboardEvent<T>) => void;
  onHome?: (e: React.KeyboardEvent<T>) => void;
  onEnd?: (e: React.KeyboardEvent<T>) => void;
  onEnter?: (e: React.KeyboardEvent<T>) => void;
  onSpace?: (e: React.KeyboardEvent<T>) => void;
  onEscape?: (e: React.KeyboardEvent<T>) => void;
  onTab?: (e: React.KeyboardEvent<T>) => void;
  onDelete?: (e: React.KeyboardEvent<T>) => void;
  onBackspace?: (e: React.KeyboardEvent<T>) => void;
  preventDefault?: boolean;
}) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    onEnter,
    onSpace,
    onEscape,
    onTab,
    onDelete,
    onBackspace,
    preventDefault = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<T>) => {
      let handled = false;

      switch (e.key) {
        case 'ArrowUp':
          if (onArrowUp) {
            onArrowUp(e);
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            onArrowDown(e);
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            onArrowLeft(e);
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            onArrowRight(e);
            handled = true;
          }
          break;
        case 'Home':
          if (onHome) {
            onHome(e);
            handled = true;
          }
          break;
        case 'End':
          if (onEnd) {
            onEnd(e);
            handled = true;
          }
          break;
        case 'Enter':
          if (onEnter) {
            onEnter(e);
            handled = true;
          }
          break;
        case ' ':
          if (onSpace) {
            onSpace(e);
            handled = true;
          }
          break;
        case 'Escape':
          if (onEscape) {
            onEscape(e);
            handled = true;
          }
          break;
        case 'Tab':
          if (onTab) {
            onTab(e);
            // Don't prevent default for Tab
          }
          break;
        case 'Delete':
          if (onDelete) {
            onDelete(e);
            handled = true;
          }
          break;
        case 'Backspace':
          if (onBackspace) {
            onBackspace(e);
            handled = true;
          }
          break;
      }

      if (handled && preventDefault) {
        e.preventDefault();
      }
    },
    [
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onHome,
      onEnd,
      onEnter,
      onSpace,
      onEscape,
      onTab,
      onDelete,
      onBackspace,
      preventDefault,
    ]
  );

  return { onKeyDown: handleKeyDown };
}

/**
 * Hook for type-ahead selection
 */
export function useTypeAhead<T>(
  items: T[],
  getLabel: (item: T) => string,
  options: {
    timeout?: number;
    onSelect?: (item: T, index: number) => void;
  } = {}
) {
  const { timeout = 500, onSelect } = options;
  const bufferRef = useRef('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Only handle printable characters
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Add to buffer
      bufferRef.current += e.key.toLowerCase();

      // Find matching item
      const matchIndex = items.findIndex((item) =>
        getLabel(item).toLowerCase().startsWith(bufferRef.current)
      );

      if (matchIndex >= 0) {
        onSelect?.(items[matchIndex], matchIndex);
      }

      // Clear buffer after timeout
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, timeout);
    },
    [items, getLabel, timeout, onSelect]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { onKeyDown: handleKeyDown };
}

/**
 * Hook for detecting specific key combinations
 */
export function useKeyPress(
  targetKey: string | KeyboardShortcut,
  options: {
    onPress?: (e: KeyboardEvent) => void;
    onRelease?: (e: KeyboardEvent) => void;
    element?: HTMLElement | Window | null;
  } = {}
) {
  const { onPress, onRelease, element = typeof window !== 'undefined' ? window : null } = options;

  useEffect(() => {
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const matches =
        typeof targetKey === 'string'
          ? e.key.toLowerCase() === targetKey.toLowerCase()
          : matchesShortcut(e, targetKey);

      if (matches) {
        onPress?.(e);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const matches =
        typeof targetKey === 'string'
          ? e.key.toLowerCase() === targetKey.toLowerCase()
          : matchesShortcut(e, targetKey);

      if (matches) {
        onRelease?.(e);
      }
    };

    element.addEventListener('keydown', handleKeyDown as EventListener);
    element.addEventListener('keyup', handleKeyUp as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
      element.removeEventListener('keyup', handleKeyUp as EventListener);
    };
  }, [targetKey, onPress, onRelease, element]);
}
