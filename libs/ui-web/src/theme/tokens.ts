/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
// Use require for CJS compatibility with PostCSS/Tailwind config
const aivoTokens = require('../tokens.json');

export const tokens = aivoTokens as {
  meta: {
    name: string;
    version: string;
    description: string;
    brand: { name: string; tagline: string; icon: string };
    gradeBands: Record<string, string>;
  };
  brand: {
    font: {
      family: { default: string[]; dyslexia_friendly: string[] };
      weight: Record<string, number>;
    };
    color: { primary: string; navy: string; white: string };
  };
  functional: {
    color: { success: string; progress: string; focus: string; error: string };
  };
  base: {
    color: {
      neutral: Record<string, string>;
      purple: Record<string, string>;
      teal: Record<string, string>;
      navy: Record<string, string>;
    };
    font: { family: { default: string[]; dyslexia_friendly: string[] } };
    space: Record<string, number>;
    radius: Record<string, number>;
    shadow: Record<string, { color: string; x: number; y: number; blur: number; spread: number }>;
    elevation: Record<string, { shadow: string; opacity: number }>;
    motion: {
      duration: Record<string, number>;
      durationReduced: Record<string, number>;
      easing: Record<string, string>;
      reduced: boolean;
    };
    accessibility: {
      supportsHighContrast: boolean;
      supportsDyslexia: boolean;
      supportsReducedMotion: boolean;
      minTouchTarget: number;
      wcagLevel: string;
    };
  };
  gradeThemes: Record<
    string,
    {
      label: string;
      gradeRange: string;
      scale: { font: number; space: number };
      color: Record<string, string>;
      colorHighContrast: Record<string, string>;
      radius: Record<string, number>;
      fontSize: Record<string, number>;
      lineHeight: Record<string, number>;
      touchTarget: Record<string, number>;
    }
  >;
};

/** Grade band theme identifiers - Explorer (K-5), Navigator (6-8), Scholar (9-12) */
export type GradeBand = 'explorer' | 'navigator' | 'scholar' | 'scholarDark';

export const gradeBandLabels: Record<GradeBand, string> = {
  explorer: tokens.meta.gradeBands.explorer,
  navigator: tokens.meta.gradeBands.navigator,
  scholar: tokens.meta.gradeBands.scholar,
  scholarDark: 'Scholar Dark Mode',
};

export function gradeBands(): GradeBand[] {
  return ['explorer', 'navigator', 'scholar', 'scholarDark'];
}

/** Map a grade number to the appropriate theme */
export function gradeToTheme(grade: number | undefined): GradeBand {
  if (!grade || grade <= 0) return 'navigator'; // Default to middle school
  if (grade <= 5) return 'explorer';
  if (grade <= 8) return 'navigator';
  return 'scholar';
}

/** Get theme-specific CSS class name */
export function getThemeClass(theme: GradeBand): string {
  return `theme-${theme}`;
}

/** Brand color palette */
export const brandColors = {
  primary: tokens.brand.color.primary,
  navy: tokens.brand.color.navy,
  white: tokens.brand.color.white,
} as const;

/** Functional colors (consistent across themes) */
export const functionalColors = {
  success: tokens.functional.color.success,
  progress: tokens.functional.color.progress,
  focus: tokens.functional.color.focus,
  error: tokens.functional.color.error,
} as const;
