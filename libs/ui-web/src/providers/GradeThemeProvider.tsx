'use client';

/**
 * Grade Theme Provider
 *
 * Comprehensive theme provider for grade-based theming with:
 * - Automatic theme selection based on learner grade
 * - CSS variable injection for runtime theming
 * - Sensory profile integration for accessibility
 * - Theme persistence in localStorage
 * - System preference detection (dark mode, reduced motion)
 * - Custom overrides support
 * - SSR-safe implementation
 */

import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

import type { GradeTheme, SensoryProfile, GradeLevel } from '../themes/grade-themes';
import {
  gradeThemes,
  K5Theme,
  MSTheme,
  HSTheme,
  HSDarkTheme,
  defaultTheme,
} from '../themes/grade-themes';
import {
  applyCSSVariables,
  generateCSSVariablesObject,
} from '../themes/css-variables';
import {
  getThemeForGrade,
  getThemeIdForGrade,
  mergeThemeWithSensoryProfile,
  mergeThemeOverrides,
  getSystemDarkModePreference,
  getSystemReducedMotionPreference,
  loadPersistedTheme,
  persistTheme,
  loadPersistedSensoryProfile,
  persistSensoryProfile,
  THEME_STORAGE_KEY,
  SENSORY_PROFILE_STORAGE_KEY,
} from '../themes/utils';

/**
 * Props for the GradeThemeProvider component
 */
export interface GradeThemeProviderProps {
  children: ReactNode;
  /** Initial grade level identifier ('K5', 'MS', 'HS', 'HSDark') */
  gradeLevel?: GradeLevel;
  /** Initial grade number (0-12) - will auto-map to appropriate theme */
  gradeNumber?: number;
  /** Custom theme overrides to apply on top of the base theme */
  customOverrides?: Partial<GradeTheme>;
  /** Sensory profile for accessibility overrides */
  sensoryProfile?: SensoryProfile;
  /** Whether to persist theme preference to localStorage */
  persistPreference?: boolean;
  /** Whether to detect and apply system preferences (dark mode, reduced motion) */
  respectSystemPreferences?: boolean;
  /** Default theme to use when no preference is set */
  defaultTheme?: GradeLevel;
  /** Callback when theme changes */
  onThemeChange?: (theme: GradeTheme, themeId: GradeLevel) => void;
}

/**
 * Context value provided by GradeThemeProvider
 */
export interface GradeThemeContextValue {
  /** Current active theme configuration */
  theme: GradeTheme;
  /** Current theme identifier */
  themeId: GradeLevel;
  /** Set theme by identifier */
  setTheme: (themeId: GradeLevel) => void;
  /** Set theme based on grade number (auto-maps to appropriate theme) */
  setGrade: (grade: number) => void;
  /** All available themes */
  availableThemes: Record<GradeLevel, GradeTheme>;
  /** Human-readable labels for each theme */
  themeLabels: Record<GradeLevel, string>;
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Toggle dark mode (switches between HS and HSDark for high school) */
  toggleDark: () => void;
  /** Current sensory profile */
  sensoryProfile: SensoryProfile;
  /** Update sensory profile */
  setSensoryProfile: (profile: SensoryProfile) => void;
  /** Update a single sensory profile setting */
  updateSensoryProfile: (key: keyof SensoryProfile, value: boolean | string | null) => void;
  /** Apply custom overrides */
  setCustomOverrides: (overrides: Partial<GradeTheme> | null) => void;
  /** Current custom overrides */
  customOverrides: Partial<GradeTheme> | null;
  /** CSS variables object for the current theme */
  cssVariables: Record<string, string>;
  /** Reset to default theme and clear preferences */
  reset: () => void;
}

const GradeThemeContext = createContext<GradeThemeContextValue | null>(null);

const themeLabels: Record<GradeLevel, string> = {
  K5: 'Explorer (K-5)',
  MS: 'Navigator (6-8)',
  HS: 'Scholar (9-12)',
  HSDark: 'Scholar Dark',
};

const defaultSensoryProfile: SensoryProfile = {
  highContrast: false,
  dyslexia: false,
  reducedMotion: false,
  colorBlindness: null,
  largeText: false,
  increasedSpacing: false,
};

/**
 * Grade Theme Provider Component
 *
 * Provides comprehensive theme context for the application with support for
 * grade-based theming, accessibility features, and system preferences.
 *
 * @example
 * ```tsx
 * // Basic usage with grade number
 * <GradeThemeProvider gradeNumber={3}>
 *   <App />
 * </GradeThemeProvider>
 *
 * // With sensory profile
 * <GradeThemeProvider
 *   gradeLevel="K5"
 *   sensoryProfile={{ highContrast: true, reducedMotion: true }}
 * >
 *   <App />
 * </GradeThemeProvider>
 *
 * // With custom overrides
 * <GradeThemeProvider
 *   gradeLevel="MS"
 *   customOverrides={{
 *     colors: { primary: '#6366F1' }
 *   }}
 * >
 *   <App />
 * </GradeThemeProvider>
 * ```
 */
export function GradeThemeProvider({
  children,
  gradeLevel: initialGradeLevel,
  gradeNumber,
  customOverrides: initialCustomOverrides,
  sensoryProfile: initialSensoryProfile,
  persistPreference = true,
  respectSystemPreferences = true,
  defaultTheme: defaultThemeId = 'MS',
  onThemeChange,
}: Readonly<GradeThemeProviderProps>) {
  // Determine initial theme ID
  const getInitialThemeId = (): GradeLevel => {
    // First priority: explicit grade level prop
    if (initialGradeLevel) return initialGradeLevel;

    // Second priority: grade number prop
    if (gradeNumber !== undefined) return getThemeIdForGrade(gradeNumber);

    // Third priority: persisted preference (client-side only)
    if (typeof window !== 'undefined' && persistPreference) {
      const persisted = loadPersistedTheme();
      if (persisted) return persisted;
    }

    // Fourth priority: system dark mode preference
    if (typeof window !== 'undefined' && respectSystemPreferences) {
      if (getSystemDarkModePreference()) return 'HSDark';
    }

    // Default
    return defaultThemeId;
  };

  const [themeId, setThemeId] = useState<GradeLevel>(getInitialThemeId);
  const [customOverrides, setCustomOverrides] = useState<Partial<GradeTheme> | null>(
    initialCustomOverrides ?? null
  );
  const [sensoryProfile, setSensoryProfileState] = useState<SensoryProfile>(() => {
    // Load persisted sensory profile or use initial
    if (initialSensoryProfile) return { ...defaultSensoryProfile, ...initialSensoryProfile };

    if (typeof window !== 'undefined' && persistPreference) {
      const persisted = loadPersistedSensoryProfile();
      if (persisted) return { ...defaultSensoryProfile, ...persisted };
    }

    // Respect system reduced motion preference
    if (typeof window !== 'undefined' && respectSystemPreferences) {
      if (getSystemReducedMotionPreference()) {
        return { ...defaultSensoryProfile, reducedMotion: true };
      }
    }

    return defaultSensoryProfile;
  });

  // Compute the final theme with all modifications applied
  const computedTheme = useMemo(() => {
    let theme = gradeThemes[themeId] ?? MSTheme;

    // Apply sensory profile modifications
    theme = mergeThemeWithSensoryProfile(theme, sensoryProfile);

    // Apply custom overrides
    if (customOverrides) {
      theme = mergeThemeOverrides(theme, customOverrides);
    }

    return theme;
  }, [themeId, sensoryProfile, customOverrides]);

  // Generate CSS variables
  const cssVariables = useMemo(
    () => generateCSSVariablesObject(computedTheme, sensoryProfile),
    [computedTheme, sensoryProfile]
  );

  // Apply theme to DOM
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Set data attributes for theme
    root.dataset.gradeTheme = themeId;
    root.dataset.theme = themeId.toLowerCase();

    // Set color scheme
    if (themeId === 'HSDark') {
      root.style.colorScheme = 'dark';
    } else {
      root.style.colorScheme = 'light';
    }

    // Apply sensory profile data attributes
    if (sensoryProfile.highContrast) {
      root.dataset.highContrast = 'true';
    } else {
      delete root.dataset.highContrast;
    }

    if (sensoryProfile.dyslexia) {
      root.dataset.dyslexia = 'true';
    } else {
      delete root.dataset.dyslexia;
    }

    if (sensoryProfile.reducedMotion) {
      root.dataset.reducedMotion = 'true';
    } else {
      delete root.dataset.reducedMotion;
    }

    if (sensoryProfile.largeText) {
      root.dataset.largeText = 'true';
    } else {
      delete root.dataset.largeText;
    }

    // Apply CSS variables
    applyCSSVariables(computedTheme, sensoryProfile);

    // Callback
    onThemeChange?.(computedTheme, themeId);
  }, [themeId, sensoryProfile, computedTheme, onThemeChange]);

  // Persist preferences
  useEffect(() => {
    if (!persistPreference) return;

    persistTheme(themeId);
  }, [themeId, persistPreference]);

  useEffect(() => {
    if (!persistPreference) return;

    persistSensoryProfile(sensoryProfile);
  }, [sensoryProfile, persistPreference]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !respectSystemPreferences) return;

    // Dark mode listener
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const persisted = loadPersistedTheme();
      if (!persisted) {
        setThemeId(e.matches ? 'HSDark' : defaultThemeId);
      }
    };

    // Reduced motion listener
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSensoryProfileState((prev) => ({ ...prev, reducedMotion: e.matches }));
    };

    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
    reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
      reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, [respectSystemPreferences, defaultThemeId]);

  const setTheme = useCallback((id: GradeLevel) => {
    setThemeId(id);
  }, []);

  const setGrade = useCallback((grade: number) => {
    setThemeId(getThemeIdForGrade(grade));
  }, []);

  const setSensoryProfile = useCallback((profile: SensoryProfile) => {
    setSensoryProfileState(profile);
  }, []);

  const updateSensoryProfile = useCallback(
    (key: keyof SensoryProfile, value: boolean | string | null) => {
      setSensoryProfileState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleDark = useCallback(() => {
    setThemeId((current) => {
      if (current === 'HS') return 'HSDark';
      if (current === 'HSDark') return 'HS';
      return current;
    });
  }, []);

  const reset = useCallback(() => {
    setThemeId(defaultThemeId);
    setSensoryProfileState(defaultSensoryProfile);
    setCustomOverrides(null);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(THEME_STORAGE_KEY);
      localStorage.removeItem(SENSORY_PROFILE_STORAGE_KEY);
    }
  }, [defaultThemeId]);

  const contextValue = useMemo<GradeThemeContextValue>(
    () => ({
      theme: computedTheme,
      themeId,
      setTheme,
      setGrade,
      availableThemes: gradeThemes,
      themeLabels,
      isDark: themeId === 'HSDark',
      toggleDark,
      sensoryProfile,
      setSensoryProfile,
      updateSensoryProfile,
      setCustomOverrides,
      customOverrides,
      cssVariables,
      reset,
    }),
    [
      computedTheme,
      themeId,
      setTheme,
      setGrade,
      toggleDark,
      sensoryProfile,
      setSensoryProfile,
      updateSensoryProfile,
      customOverrides,
      cssVariables,
      reset,
    ]
  );

  return (
    <GradeThemeContext.Provider value={contextValue}>
      {children}
    </GradeThemeContext.Provider>
  );
}

/**
 * Hook to access the grade theme context
 *
 * @throws Error if used outside of GradeThemeProvider
 *
 * @example
 * ```tsx
 * function ThemeSwitcher() {
 *   const { theme, themeId, setTheme, themeLabels } = useGradeTheme();
 *
 *   return (
 *     <select value={themeId} onChange={(e) => setTheme(e.target.value as GradeLevel)}>
 *       {Object.entries(themeLabels).map(([id, label]) => (
 *         <option key={id} value={id}>{label}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useGradeTheme(): GradeThemeContextValue {
  const context = useContext(GradeThemeContext);
  if (!context) {
    throw new Error('useGradeTheme must be used within a GradeThemeProvider');
  }
  return context;
}

/**
 * Hook to access only the current theme (lighter alternative to useGradeTheme)
 */
export function useTheme(): GradeTheme {
  return useGradeTheme().theme;
}

/**
 * Hook to access sensory profile settings
 */
export function useSensoryProfile(): {
  profile: SensoryProfile;
  setProfile: (profile: SensoryProfile) => void;
  update: (key: keyof SensoryProfile, value: boolean | string | null) => void;
} {
  const { sensoryProfile, setSensoryProfile, updateSensoryProfile } = useGradeTheme();
  return {
    profile: sensoryProfile,
    setProfile: setSensoryProfile,
    update: updateSensoryProfile,
  };
}

export default GradeThemeProvider;
