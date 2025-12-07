'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { tokens } from './tokens.js';

interface AccessibilityPreferences {
  highContrast: boolean;
  dyslexia: boolean;
  reducedMotion: boolean;
}

type AccessibilityContextValue = AccessibilityPreferences & {
  setPreferences: (next: Partial<AccessibilityPreferences>) => void;
  reset: () => void;
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
}: {
  children: ReactNode;
  initial?: Partial<AccessibilityPreferences>;
}) {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>({
    ...defaultPrefs,
    ...initial,
  });

  // Hydrate from storage and system settings
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
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
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setPrefs((prev: AccessibilityPreferences) => ({ ...prev, reducedMotion: true }));
      }
    }
  }, []);

  // Sync data attributes for Tailwind CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const applyFlag = (
      key: 'a11yHighContrast' | 'a11yDyslexia' | 'a11yReducedMotion',
      value: boolean
    ) => {
      const attr = `data-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      if (value) {
        root.setAttribute(attr, 'true');
      } else {
        root.removeAttribute(attr);
      }
    };

    applyFlag('a11yHighContrast', prefs.highContrast);
    applyFlag('a11yDyslexia', prefs.dyslexia);
    applyFlag('a11yReducedMotion', prefs.reducedMotion);
  }, [prefs]);

  // Persist preferences client-side
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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

  const value = useMemo(
    () => ({
      ...prefs,
      setPreferences,
      reset,
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
