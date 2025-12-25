import { useRef, useEffect } from 'react';
import { FocusTrap, createFocusTrap } from '../focus-trap';
import { FocusTrapOptions } from '../types';

interface UseFocusTrapOptions extends Omit<FocusTrapOptions, 'onActivate' | 'onDeactivate'> {
  enabled?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

/**
 * Hook for managing focus traps
 */
export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions = {}
): React.RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const trapRef = useRef<FocusTrap | null>(null);
  const {
    enabled = true,
    initialFocus,
    returnFocusOnDeactivate = true,
    escapeDeactivates = true,
    clickOutsideDeactivates = false,
    onActivate,
    onDeactivate,
    preventScroll,
  } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      trapRef.current?.deactivate();
      trapRef.current = null;
      return;
    }

    trapRef.current = createFocusTrap(containerRef.current, {
      initialFocus,
      returnFocusOnDeactivate,
      escapeDeactivates,
      clickOutsideDeactivates,
      preventScroll,
      onActivate,
      onDeactivate,
    });

    trapRef.current.activate();

    return () => {
      trapRef.current?.deactivate();
    };
  }, [
    enabled,
    initialFocus,
    returnFocusOnDeactivate,
    escapeDeactivates,
    clickOutsideDeactivates,
    preventScroll,
    onActivate,
    onDeactivate,
  ]);

  return containerRef;
}

/**
 * Hook for imperatively controlling a focus trap
 */
export function useFocusTrapImperative<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const trapRef = useRef<FocusTrap | null>(null);

  const activate = (options?: FocusTrapOptions) => {
    if (!containerRef.current) return;

    if (!trapRef.current) {
      trapRef.current = createFocusTrap(containerRef.current, options);
    }
    trapRef.current.activate();
  };

  const deactivate = () => {
    trapRef.current?.deactivate();
  };

  const pause = () => {
    trapRef.current?.pause();
  };

  const unpause = () => {
    trapRef.current?.unpause();
  };

  useEffect(() => {
    return () => {
      trapRef.current?.deactivate();
    };
  }, []);

  return {
    containerRef,
    activate,
    deactivate,
    pause,
    unpause,
    isActive: () => trapRef.current?.active ?? false,
  };
}
