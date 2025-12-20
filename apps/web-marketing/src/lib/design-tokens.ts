/**
 * AIVO Design Tokens
 *
 * These tokens are aligned with the Flutter app theme system.
 * See: libs/flutter-common/lib/theme/aivo_theme.dart
 * See: apps/mobile-parent/lib/theme/parent_theme.dart
 *
 * Usage: Import these for programmatic access to design values
 */

export const AivoColors = {
  // Primary Brand (AIVO Blue)
  primary: {
    DEFAULT: '#2D6BFF',
    50: '#EBF1FF',
    100: '#D6E4FF',
    200: '#ADC8FF',
    300: '#85ADFF',
    400: '#5C91FF',
    500: '#2D6BFF',
    600: '#2458DB',
    700: '#1B45B7',
    800: '#133293',
    900: '#0A1F6F',
    950: '#051247',
  },

  // Secondary CTA (AIVO Orange)
  orange: {
    DEFAULT: '#FF9C32',
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#FF9C32',
    600: '#EA7C0C',
    700: '#C2600C',
    800: '#9A4A0D',
    900: '#7C3A0E',
    950: '#431E06',
  },

  // Accent (Parent Purple)
  purple: {
    DEFAULT: '#7C3AED',
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7C3AED',
    800: '#6B21A8',
    900: '#581C87',
    950: '#3B0764',
  },

  // Accent (Learner Teal)
  teal: {
    DEFAULT: '#3FB4A5',
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#3FB4A5',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // Semantic Colors
  success: {
    DEFAULT: '#16A34A',
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  warning: {
    DEFAULT: '#D97706',
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  error: {
    DEFAULT: '#DC2626',
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutrals (from Flutter parent theme)
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceVariant: '#EEF5FF',
} as const;

export const AivoTypography = {
  // Matches Flutter G6-8 typography
  display: { size: 34, weight: 700, lineHeight: 1.2 },
  headline: { size: 28, weight: 700, lineHeight: 1.3 },
  title: { size: 22, weight: 600, lineHeight: 1.4 },
  body: { size: 17, weight: 400, lineHeight: 1.6 },
  label: { size: 14, weight: 600, lineHeight: 1.5 },
} as const;

export const AivoSpacing = {
  // Standard Flutter-like spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const AivoBorderRadius = {
  sm: 8,
  DEFAULT: 12, // Flutter standard
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

export const AivoShadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
  DEFAULT: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.1)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.16)',

  // Colored shadows for CTAs
  primary: '0 8px 24px rgba(45, 107, 255, 0.25)',
  orange: '0 8px 24px rgba(255, 156, 50, 0.3)',
  purple: '0 8px 24px rgba(124, 58, 237, 0.25)',
} as const;

// Grade band color variations (from Flutter aivo_theme.dart)
export const GradeBandColors = {
  k5: {
    primary: '#2D6BFF',
    secondary: '#FF9C32',
    background: '#F8FAFC',
    description: 'Kindergarten through 5th grade - Bright and engaging',
  },
  g6_8: {
    primary: '#2F6AE6',
    secondary: '#3FB4A5',
    background: '#F6F8FC',
    description: 'Grades 6-8 - Slightly muted, mature feel',
  },
  g9_12: {
    primary: '#2648A6',
    secondary: '#2E7D74',
    background: '#F4F6FA',
    description: 'Grades 9-12 - Professional and focused',
  },
} as const;

// Parent App Colors (from parent_theme.dart)
export const ParentColors = {
  primary: '#2563EB', // Blue-600
  secondary: '#7C3AED', // Purple-700
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
} as const;

// Accessibility-focused colors
export const AccessibilityColors = {
  highContrastPrimary: '#1E40AF', // Darker blue for high contrast
  highContrastPurple: '#5B21B6', // Darker purple
  highContrastText: '#000000',
  focusRing: '#2D6BFF',
  focusRingOffset: '#FFFFFF',
} as const;

// CSS Variable helpers for runtime theming
export const getCssVar = (name: string): string => `var(--${name})`;

export const rgbFromHex = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

export const hexToRgbString = (hex: string): string => {
  const { r, g, b } = rgbFromHex(hex);
  return `${r} ${g} ${b}`;
};

// Type exports for strict typing
export type AivoColorKey = keyof typeof AivoColors;
export type AivoPrimaryShade = keyof typeof AivoColors.primary;
export type GradeBand = keyof typeof GradeBandColors;
export type SpacingKey = keyof typeof AivoSpacing;
export type BorderRadiusKey = keyof typeof AivoBorderRadius;
export type ShadowKey = keyof typeof AivoShadows;
