/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
// Use require for CJS compatibility with PostCSS/Tailwind config
const aivoTokens = require('../tokens.json');

export const tokens = aivoTokens as {
  meta: { name: string; version: string; description: string; gradeBands: Record<string, string> };
  base: {
    color: { neutral: Record<string, string> };
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
    accessibility?: {
      supportsHighContrast?: boolean;
      supportsDyslexia?: boolean;
      supportsReducedMotion?: boolean;
    };
  };
  gradeThemes: Record<
    string,
    {
      scale: { font: number; space: number };
      color: Record<string, string>;
      colorHighContrast?: Record<string, string>;
      fontSize: Record<string, number>;
      lineHeight: Record<string, number>;
    }
  >;
};
export type GradeBand = keyof typeof tokens.gradeThemes;

export const gradeBandLabels: Record<GradeBand, string> = tokens.meta.gradeBands;

export function gradeBands(): GradeBand[] {
  return Object.keys(tokens.gradeThemes);
}
