import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook for saving and restoring focus
 */
export function useFocusReturn() {
  const savedElementRef = useRef<HTMLElement | null>(null);

  const save = useCallback(() => {
    savedElementRef.current = document.activeElement as HTMLElement;
  }, []);

  const restore = useCallback((options?: FocusOptions) => {
    if (savedElementRef.current && document.contains(savedElementRef.current)) {
      savedElementRef.current.focus(options);
      savedElementRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    savedElementRef.current = null;
  }, []);

  return { save, restore, clear };
}

/**
 * Hook that automatically saves and restores focus on mount/unmount
 */
export function useAutoFocusReturn(
  options: {
    enabled?: boolean;
    focusOptions?: FocusOptions;
  } = {}
) {
  const { enabled = true, focusOptions } = options;
  const savedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Save current focus on mount
    savedElementRef.current = document.activeElement as HTMLElement;

    return () => {
      // Restore focus on unmount
      if (savedElementRef.current && document.contains(savedElementRef.current)) {
        savedElementRef.current.focus(focusOptions);
      }
    };
  }, [enabled, focusOptions]);
}

/**
 * Hook for managing focus on a list of elements
 */
export function useFocusManager<T extends HTMLElement>() {
  const elementsRef = useRef<Map<string, T>>(new Map());

  const register = useCallback((id: string, element: T | null) => {
    if (element) {
      elementsRef.current.set(id, element);
    } else {
      elementsRef.current.delete(id);
    }
  }, []);

  const focus = useCallback((id: string, options?: FocusOptions) => {
    const element = elementsRef.current.get(id);
    if (element) {
      element.focus(options);
      return true;
    }
    return false;
  }, []);

  const focusFirst = useCallback((options?: FocusOptions) => {
    const first = Array.from(elementsRef.current.values())[0];
    if (first) {
      first.focus(options);
      return true;
    }
    return false;
  }, []);

  const focusLast = useCallback((options?: FocusOptions) => {
    const elements = Array.from(elementsRef.current.values());
    const last = elements[elements.length - 1];
    if (last) {
      last.focus(options);
      return true;
    }
    return false;
  }, []);

  const getRef = useCallback(
    (id: string) => (element: T | null) => {
      register(id, element);
    },
    [register]
  );

  return {
    register,
    getRef,
    focus,
    focusFirst,
    focusLast,
    getElement: (id: string) => elementsRef.current.get(id),
    getAllElements: () => Array.from(elementsRef.current.values()),
  };
}
