/**
 * Grade-Based Theming System
 *
 * @module @aivo/ui-web/themes
 *
 * Provides a comprehensive theming system for age-appropriate UI experiences
 * across K-5, Middle School, and High School grade bands.
 */

// Theme definitions
export {
  K5Theme,
  MSTheme,
  HSTheme,
  HSDarkTheme,
  gradeThemes,
  defaultTheme,
} from './grade-themes';

export type {
  GradeTheme,
  SensoryProfile,
  GradeLevel,
} from './grade-themes';

// CSS variables system
export {
  generateCSSVariables,
  generateCSSVariablesObject,
  generateThemeStylesheet,
  applyCSSVariables,
  clearCSSVariables,
  getSSRStyleTag,
  createThemeStyleElement,
  injectThemeStyles,
  hexToRgbChannels,
  colorToRgbChannels,
} from './css-variables';

// Theme utilities
export {
  getThemeForGrade,
  getThemeIdForGrade,
  getThemeById,
  mergeThemeWithSensoryProfile,
  mergeThemeOverrides,
  getContrastColor,
  getContrastRatio,
  meetsContrastRequirements,
  verifyThemeAccessibility,
  getAvailableThemes,
  getThemeLabels,
  getSystemDarkModePreference,
  getSystemReducedMotionPreference,
  createTheme,
  loadPersistedTheme,
  persistTheme,
  loadPersistedSensoryProfile,
  persistSensoryProfile,
  THEME_STORAGE_KEY,
  SENSORY_PROFILE_STORAGE_KEY,
} from './utils';

export type { ThemeOverrides } from './utils';
