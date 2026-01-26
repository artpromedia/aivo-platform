/**
 * Theme Utility Functions
 *
 * Provides helper functions for theme selection, color manipulation,
 * accessibility calculations, and theme merging.
 */

import type { GradeTheme, SensoryProfile, GradeLevel } from './grade-themes';
import { gradeThemes, K5Theme, MSTheme, HSTheme, HSDarkTheme, defaultTheme } from './grade-themes';
import { generateCSSVariables as genCSSVars, generateCSSVariablesObject } from './css-variables';

/**
 * Get the appropriate theme for a given grade number
 *
 * @param grade - Grade level (0-12, where 0 = Kindergarten)
 * @returns The appropriate GradeTheme for the grade level
 *
 * @example
 * getThemeForGrade(3)  // Returns K5Theme (Explorer)
 * getThemeForGrade(7)  // Returns MSTheme (Navigator)
 * getThemeForGrade(10) // Returns HSTheme (Scholar)
 */
export function getThemeForGrade(grade: number): GradeTheme {
  if (grade < 0) return defaultTheme;
  if (grade <= 5) return K5Theme;
  if (grade <= 8) return MSTheme;
  return HSTheme;
}

/**
 * Get theme ID for a given grade number
 */
export function getThemeIdForGrade(grade: number): GradeLevel {
  if (grade < 0) return 'MS';
  if (grade <= 5) return 'K5';
  if (grade <= 8) return 'MS';
  return 'HS';
}

/**
 * Get a theme by its ID
 */
export function getThemeById(id: GradeLevel): GradeTheme {
  return gradeThemes[id] ?? defaultTheme;
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Merge a theme with sensory profile overrides
 *
 * @param theme - Base theme to modify
 * @param profile - Sensory profile with accessibility preferences
 * @returns A new theme with sensory profile adjustments applied
 */
export function mergeThemeWithSensoryProfile(
  theme: GradeTheme,
  profile: SensoryProfile
): GradeTheme {
  const merged = { ...theme };

  // Apply high contrast colors
  if (profile.highContrast) {
    merged.colors = {
      ...theme.colors,
      ...theme.colorsHighContrast,
    } as GradeTheme['colors'];
  }

  // Apply dyslexia-friendly typography
  if (profile.dyslexia) {
    merged.typography = {
      ...theme.typography,
      fontFamily: theme.typography.dyslexiaFontFamily,
      headingFontFamily: theme.typography.dyslexiaFontFamily,
      letterSpacing: '0.05em',
      lineHeight: Math.max(theme.typography.lineHeight, 1.8),
    };
  }

  // Apply reduced motion
  if (profile.reducedMotion) {
    merged.animations = {
      ...theme.animations,
      style: 'none',
      duration: '0ms',
      durationFast: '0ms',
      durationSlow: '0ms',
      easing: 'linear',
      easingBounce: 'linear',
      hoverScale: '1',
      pressScale: '1',
    };
    merged.gamification = {
      ...theme.gamification,
      celebrationIntensity: 'none',
      rewardAnimations: false,
    };
  }

  // Apply large text scaling
  if (profile.largeText) {
    const scale = 1.2;
    const scaledFontSizes: Record<string, string> = {};
    const scaledLineHeights: Record<string, string> = {};

    for (const [key, value] of Object.entries(theme.typography.fontSizes)) {
      const numValue = Number.parseFloat(value);
      scaledFontSizes[key] = `${Math.round(numValue * scale)}px`;
    }

    for (const [key, value] of Object.entries(theme.typography.lineHeights)) {
      const numValue = Number.parseFloat(value);
      scaledLineHeights[key] = `${Math.round(numValue * scale)}px`;
    }

    merged.typography = {
      ...merged.typography,
      baseFontSize: `${Number.parseFloat(theme.typography.baseFontSize) * scale}px`,
      fontSizes: scaledFontSizes as GradeTheme['typography']['fontSizes'],
      lineHeights: scaledLineHeights as GradeTheme['typography']['lineHeights'],
    };
  }

  // Apply increased spacing
  if (profile.increasedSpacing) {
    const spacingScale = 1.25;
    merged.spacing = {
      ...theme.spacing,
      scale: theme.spacing.scale * spacingScale,
      cardPadding: `${Number.parseFloat(theme.spacing.cardPadding) * spacingScale}px`,
    };
  }

  // Apply color blindness filters (color adjustments)
  if (profile.colorBlindness) {
    merged.colors = applyColorBlindnessFilter(merged.colors, profile.colorBlindness);
  }

  return merged;
}

/**
 * Apply color blindness-friendly color adjustments
 */
function applyColorBlindnessFilter(
  colors: GradeTheme['colors'],
  type: NonNullable<SensoryProfile['colorBlindness']>
): GradeTheme['colors'] {
  // These are basic adjustments - a full implementation would use
  // proper color transformation matrices
  const adjusted = { ...colors };

  switch (type) {
    case 'protanopia':
    case 'deuteranopia':
      // Red-green color blindness - shift problematic colors
      if (colors.error === '#EF4444' || colors.error === '#E17055') {
        adjusted.error = '#DC2626'; // Darker red with more distinction
      }
      if (colors.success === '#10B981' || colors.success === '#00B894') {
        adjusted.success = '#0284C7'; // Use blue instead of green for success
      }
      break;
    case 'tritanopia':
      // Blue-yellow color blindness
      if (colors.info === '#3B82F6' || colors.info === '#74B9FF') {
        adjusted.info = '#6366F1'; // Shift blue toward purple
      }
      if (colors.warning === '#F59E0B' || colors.warning === '#FDCB6E') {
        adjusted.warning = '#EA580C'; // Shift yellow toward orange/red
      }
      break;
    case 'achromatopsia':
      // Complete color blindness - maximize luminance contrast
      adjusted.primary = '#1A1A1A';
      adjusted.primaryHover = '#333333';
      adjusted.secondary = '#666666';
      adjusted.accent = '#000000';
      break;
  }

  return adjusted;
}

/**
 * Parse a color string to RGB values
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: Number.parseInt(hex[0] + hex[0], 16),
        g: Number.parseInt(hex[1] + hex[1], 16),
        b: Number.parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // Handle rgb/rgba
  const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color);
  if (rgbMatch) {
    return {
      r: Number.parseInt(rgbMatch[1], 10),
      g: Number.parseInt(rgbMatch[2], 10),
      b: Number.parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 */
function getRelativeLuminance(color: { r: number; g: number; b: number }): number {
  const rsRGB = color.r / 255;
  const gsRGB = color.g / 255;
  const bsRGB = color.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 *
 * @returns Contrast ratio (1-21, where 21 is maximum contrast)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  if (!c1 || !c2) return 1;

  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get appropriate text color (black or white) for a given background color
 *
 * @param backgroundColor - The background color to contrast against
 * @returns '#FFFFFF' for dark backgrounds, '#000000' for light backgrounds
 */
export function getContrastColor(backgroundColor: string): string {
  const parsed = parseColor(backgroundColor);
  if (!parsed) return '#000000';

  const luminance = getRelativeLuminance(parsed);
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Check if a color combination meets WCAG AA contrast requirements
 *
 * @param foreground - Text/foreground color
 * @param background - Background color
 * @param largeText - Whether the text is large (18px+ or 14px+ bold)
 * @returns true if the combination meets WCAG AA requirements
 */
export function meetsContrastRequirements(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Verify all theme color combinations meet WCAG AA requirements
 */
export function verifyThemeAccessibility(theme: GradeTheme): {
  passed: boolean;
  issues: Array<{ combination: string; ratio: number; required: number }>;
} {
  const issues: Array<{ combination: string; ratio: number; required: number }> = [];

  // Check text on background
  const textOnBg = getContrastRatio(theme.colors.text, theme.colors.background);
  if (textOnBg < 4.5) {
    issues.push({ combination: 'text on background', ratio: textOnBg, required: 4.5 });
  }

  // Check text muted on background
  const mutedOnBg = getContrastRatio(theme.colors.textMuted, theme.colors.background);
  if (mutedOnBg < 4.5) {
    issues.push({ combination: 'textMuted on background', ratio: mutedOnBg, required: 4.5 });
  }

  // Check text on surface
  const textOnSurface = getContrastRatio(theme.colors.text, theme.colors.surface);
  if (textOnSurface < 4.5) {
    issues.push({ combination: 'text on surface', ratio: textOnSurface, required: 4.5 });
  }

  // Check primary button text
  const onPrimary = getContrastRatio(theme.colors.textOnPrimary, theme.colors.primary);
  if (onPrimary < 4.5) {
    issues.push({ combination: 'textOnPrimary on primary', ratio: onPrimary, required: 4.5 });
  }

  // Check accent text
  const onAccent = getContrastRatio(theme.colors.textOnAccent, theme.colors.accent);
  if (onAccent < 4.5) {
    issues.push({ combination: 'textOnAccent on accent', ratio: onAccent, required: 4.5 });
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Generate CSS variables string from theme
 * Re-export from css-variables for convenience
 */
export const generateCSSVariables = genCSSVars;

/**
 * Merge custom overrides into a theme
 */
export function mergeThemeOverrides(
  theme: GradeTheme,
  overrides: Partial<GradeTheme>
): GradeTheme {
  return deepMerge(theme, overrides);
}

/**
 * Get all available themes as an array
 */
export function getAvailableThemes(): GradeTheme[] {
  return [K5Theme, MSTheme, HSTheme, HSDarkTheme];
}

/**
 * Get theme labels for UI display
 */
export function getThemeLabels(): Record<GradeLevel, string> {
  return {
    K5: 'Explorer (K-5)',
    MS: 'Navigator (6-8)',
    HS: 'Scholar (9-12)',
    HSDark: 'Scholar Dark',
  };
}

/**
 * Detect system dark mode preference
 */
export function getSystemDarkModePreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Detect system reduced motion preference
 */
export function getSystemReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Create a complete theme with all necessary defaults
 */
export function createTheme(base: Partial<GradeTheme>): GradeTheme {
  return deepMerge(defaultTheme, base);
}

/**
 * Export utility type for theme customization
 */
export type ThemeOverrides = Partial<GradeTheme>;

/**
 * Storage key for persisted theme preference
 */
export const THEME_STORAGE_KEY = 'aivo:grade-theme';

/**
 * Storage key for persisted sensory profile
 */
export const SENSORY_PROFILE_STORAGE_KEY = 'aivo:sensory-profile';

/**
 * Load persisted theme preference from localStorage
 */
export function loadPersistedTheme(): GradeLevel | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && stored in gradeThemes) {
      return stored as GradeLevel;
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
}

/**
 * Save theme preference to localStorage
 */
export function persistTheme(themeId: GradeLevel): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Load persisted sensory profile from localStorage
 */
export function loadPersistedSensoryProfile(): SensoryProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SENSORY_PROFILE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SensoryProfile;
    }
  } catch {
    // localStorage might be unavailable or data malformed
  }
  return null;
}

/**
 * Save sensory profile to localStorage
 */
export function persistSensoryProfile(profile: SensoryProfile): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SENSORY_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage might be unavailable
  }
}
