'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { tokens } from './tokens';

interface AccessibilityPreferences {
  highContrast: boolean;
  dyslexia: boolean;
  reducedMotion: boolean;
}

type AccessibilityContextValue = AccessibilityPreferences & {
  setPreferences: (next: Partial<AccessibilityPreferences>) => void;
  reset: () => void;
  /** Toggle high contrast mode */
  toggleHighContrast: () => void;
  /** Toggle dyslexia-friendly font */
  toggleDyslexia: () => void;
  /** Toggle reduced motion */
  toggleReducedMotion: () => void;
};

const STORAGE_KEY = 'aivo:a11y-preferences';

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const defaultPrefs: AccessibilityPreferences = {
  highContrast: false,
  dyslexia: false,
  reducedMotion: tokens.base.motion.reduced,
};

export function AccessibilityProvider({
  children,
  initial,
}: Readonly<{
  children: ReactNode;
  initial?: Partial<AccessibilityPreferences>;
}>) {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>({
    ...defaultPrefs,
    ...initial,
  });

  // Hydrate from storage and system settings
  useEffect(() => {
    const stored =
      typeof globalThis.window !== 'undefined'
        ? globalThis.localStorage.getItem(STORAGE_KEY)
        : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
        setPrefs((prev: AccessibilityPreferences) => ({ ...prev, ...parsed }));
      } catch {
        // ignore malformed storage
      }
      return;
    }

    // If no stored prefs, honor system reduced-motion
    if (typeof globalThis.window !== 'undefined') {
      const prefersReduced = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setPrefs((prev: AccessibilityPreferences) => ({ ...prev, reducedMotion: true }));
      }
    }
  }, []);

  // Sync data attributes for CSS and Tailwind
  useEffect(() => {
    const root = document.documentElement;

    // High contrast - uses new naming convention
    if (prefs.highContrast) {
      root.dataset.highContrast = 'true';
      root.dataset.a11yHighContrast = 'true';
    } else {
      delete root.dataset.highContrast;
      delete root.dataset.a11yHighContrast;
    }

    // Dyslexia-friendly font
    if (prefs.dyslexia) {
      root.dataset.dyslexia = 'true';
      root.dataset.a11yDyslexia = 'true';
    } else {
      delete root.dataset.dyslexia;
      delete root.dataset.a11yDyslexia;
    }

    // Reduced motion
    if (prefs.reducedMotion) {
      root.dataset.reducedMotion = 'true';
      root.dataset.a11yReducedMotion = 'true';
    } else {
      delete root.dataset.reducedMotion;
      delete root.dataset.a11yReducedMotion;
    }
  }, [prefs]);

  // Persist preferences client-side
  useEffect(() => {
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // storage might be unavailable; fail silently
    }
  }, [prefs]);

  const setPreferences = (next: Partial<AccessibilityPreferences>) => {
    setPrefs((prev: AccessibilityPreferences) => ({ ...prev, ...next }));
  };

  const reset = () => {
    setPrefs(defaultPrefs);
  };

  const toggleHighContrast = () => {
    setPrefs((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const toggleDyslexia = () => {
    setPrefs((prev) => ({ ...prev, dyslexia: !prev.dyslexia }));
  };

  const toggleReducedMotion = () => {
    setPrefs((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  };

  const value = useMemo(
    () => ({
      ...prefs,
      setPreferences,
      reset,
      toggleHighContrast,
      toggleDyslexia,
      toggleReducedMotion,
    }),
    [prefs]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
