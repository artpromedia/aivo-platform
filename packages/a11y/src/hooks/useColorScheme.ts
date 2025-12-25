import { useState, useEffect, useMemo } from 'react';
import {
  getColorSchemePreference,
  subscribeToColorScheme,
} from '../reduced-motion';
import { ColorSchemePreference } from '../types';

/**
 * Hook to detect user's color scheme preference
 */
export function useColorScheme(): ColorSchemePreference {
  const [scheme, setScheme] = useState<ColorSchemePreference>(() =>
    getColorSchemePreference()
  );

  useEffect(() => {
    return subscribeToColorScheme(setScheme);
  }, []);

  return scheme;
}

/**
 * Hook to get effective color scheme (with system default)
 */
export function useEffectiveColorScheme(
  defaultScheme: 'light' | 'dark' = 'light'
): 'light' | 'dark' {
  const preference = useColorScheme();

  return useMemo(() => {
    if (preference === 'no-preference') {
      return defaultScheme;
    }
    return preference;
  }, [preference, defaultScheme]);
}

/**
 * Hook for color scheme aware styles
 */
export function useColorSchemeStyles<T extends Record<string, unknown>>(
  lightStyles: T,
  darkStyles: Partial<T>
): T {
  const scheme = useEffectiveColorScheme();

  return useMemo(() => {
    if (scheme === 'dark') {
      return { ...lightStyles, ...darkStyles };
    }
    return lightStyles;
  }, [scheme, lightStyles, darkStyles]);
}
