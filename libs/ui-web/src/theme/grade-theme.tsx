'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { gradeBandLabels, gradeBands, gradeToTheme, type GradeBand } from './tokens';

interface GradeThemeContextValue {
  /** Current active theme */
  theme: GradeBand;
  /** Set the theme directly */
  setTheme: (theme: GradeBand) => void;
  /** Set theme based on grade number (auto-maps to appropriate theme) */
  setGrade: (grade: number) => void;
  /** All available themes */
  availableThemes: GradeBand[];
  /** Human-readable labels for each theme */
  labels: Record<GradeBand, string>;
  /** Whether dark mode is active (scholar-dark) */
  isDark: boolean;
  /** Toggle dark mode (only applies to scholar theme) */
  toggleDark: () => void;
}

const GradeThemeContext = createContext<GradeThemeContextValue | null>(null);

export interface GradeThemeProviderProps {
  children: ReactNode;
  /** Initial theme - defaults to navigator (middle school) */
  initialTheme?: GradeBand;
  /** Initial grade number - will auto-map to theme */
  initialGrade?: number;
}

export function GradeThemeProvider({
  children,
  initialTheme,
  initialGrade,
}: Readonly<GradeThemeProviderProps>) {
  const [theme, setThemeState] = useState<GradeBand>(() => {
    if (initialTheme) return initialTheme;
    if (initialGrade !== undefined) return gradeToTheme(initialGrade);
    return 'navigator';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.gradeTheme = theme;

    // Apply color scheme for dark mode
    if (theme === 'scholarDark') {
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      setGrade: (grade: number) => {
        setThemeState(gradeToTheme(grade));
      },
      availableThemes: gradeBands(),
      labels: gradeBandLabels,
      isDark: theme === 'scholarDark',
      toggleDark: () => {
        setThemeState((current) => {
          if (current === 'scholar') return 'scholarDark';
          if (current === 'scholarDark') return 'scholar';
          return current;
        });
      },
    }),
    [theme]
  );

  return <GradeThemeContext.Provider value={value}>{children}</GradeThemeContext.Provider>;
}

export function useGradeTheme(): GradeThemeContextValue {
  const context = useContext(GradeThemeContext);
  if (!context) {
    throw new Error('useGradeTheme must be used within a GradeThemeProvider');
  }
  return context;
}

/** @deprecated Use useGradeTheme().theme instead */
export function useTheme(): GradeBand {
  return useGradeTheme().theme;
}
