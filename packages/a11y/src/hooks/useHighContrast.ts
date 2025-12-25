import { useState, useEffect } from 'react';
import {
  prefersHighContrast,
  getContrastPreference,
  subscribeToContrastPreference,
} from '../reduced-motion';
import { ContrastPreference } from '../types';

/**
 * Hook to detect user's high contrast preference
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(() => prefersHighContrast());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const forcedColors = window.matchMedia('(forced-colors: active)');
    const prefersMore = window.matchMedia('(prefers-contrast: more)');

    const handler = () => {
      setHighContrast(forcedColors.matches || prefersMore.matches);
    };

    forcedColors.addEventListener('change', handler);
    prefersMore.addEventListener('change', handler);

    return () => {
      forcedColors.removeEventListener('change', handler);
      prefersMore.removeEventListener('change', handler);
    };
  }, []);

  return highContrast;
}

/**
 * Hook to get the contrast preference
 */
export function useContrastPreference(): ContrastPreference {
  const [preference, setPreference] = useState<ContrastPreference>(() =>
    getContrastPreference()
  );

  useEffect(() => {
    return subscribeToContrastPreference(setPreference);
  }, []);

  return preference;
}

/**
 * Hook to detect forced colors mode (Windows High Contrast)
 */
export function useForcedColors(): boolean {
  const [forcedColors, setForcedColors] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(forced-colors: active)');
    setForcedColors(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setForcedColors(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return forcedColors;
}

/**
 * Hook for contrast-aware styles
 */
export function useContrastStyles<T extends Record<string, unknown>>(
  normalStyles: T,
  highContrastStyles: Partial<T>
): T {
  const highContrast = useHighContrast();

  if (highContrast) {
    return { ...normalStyles, ...highContrastStyles };
  }

  return normalStyles;
}
