import { useState, useCallback, useRef } from 'react';

interface UseFocusWithinOptions {
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

interface UseFocusWithinReturn<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  isFocusWithin: boolean;
  handlers: {
    onFocus: (e: React.FocusEvent) => void;
    onBlur: (e: React.FocusEvent) => void;
  };
}

/**
 * Hook to detect if focus is within a container
 */
export function useFocusWithin<T extends HTMLElement>(
  options: UseFocusWithinOptions = {}
): UseFocusWithinReturn<T> {
  const { onFocusIn, onFocusOut } = options;
  const ref = useRef<T>(null);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      // Only trigger if this is the first focus within
      if (!isFocusWithin) {
        setIsFocusWithin(true);
        onFocusIn?.();
      }
    },
    [isFocusWithin, onFocusIn]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Check if focus is moving outside the container
      if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
        setIsFocusWithin(false);
        onFocusOut?.();
      }
    },
    [onFocusOut]
  );

  return {
    ref,
    isFocusWithin,
    handlers: {
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

/**
 * Hook to detect if element has focus
 */
export function useFocused<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return {
    ref,
    isFocused,
    handlers: {
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

/**
 * Hook to detect if element has focus and it should be visible
 */
export function useFocusVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const hadKeyboardEventRef = useRef(false);

  const handleKeyDown = useCallback(() => {
    hadKeyboardEventRef.current = true;
  }, []);

  const handlePointerDown = useCallback(() => {
    hadKeyboardEventRef.current = false;
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setIsFocusVisible(hadKeyboardEventRef.current);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setIsFocusVisible(false);
  }, []);

  return {
    ref,
    isFocused,
    isFocusVisible,
    handlers: {
      onKeyDown: handleKeyDown,
      onPointerDown: handlePointerDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}
