/**
 * Grade-Based Theme System
 *
 * Provides age-appropriate UI experiences for K-5 (Explorer), Middle School (Navigator),
 * and High School (Scholar) learners with full type safety and accessibility support.
 */

/**
 * Sensory profile for accessibility overrides
 */
export interface SensoryProfile {
  /** Enable high contrast mode for visual impairment */
  highContrast?: boolean;
  /** Enable dyslexia-friendly fonts and spacing */
  dyslexia?: boolean;
  /** Reduce or disable animations for vestibular disorders */
  reducedMotion?: boolean;
  /** Color vision deficiency type */
  colorBlindness?: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' | null;
  /** Increase text size for low vision */
  largeText?: boolean;
  /** Increase spacing for easier reading */
  increasedSpacing?: boolean;
}

/**
 * Complete theme configuration for grade-band theming
 */
export interface GradeTheme {
  /** Theme display name */
  name: string;
  /** Grade range label (e.g., "K-5", "6-8", "9-12") */
  gradeRange: string;
  /** Theme identifier for internal use */
  id: 'K5' | 'MS' | 'HS';
  /** Color palette */
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    accent: string;
    background: string;
    surface: string;
    surfaceMuted: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    textOnPrimary: string;
    textOnAccent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    border: string;
    borderMuted: string;
    focus: string;
    focusRing: string;
    backdrop: string;
  };
  /** High contrast color overrides */
  colorsHighContrast: Partial<GradeTheme['colors']>;
  /** Typography settings */
  typography: {
    fontFamily: string;
    headingFontFamily: string;
    dyslexiaFontFamily: string;
    baseFontSize: string;
    headingScale: number;
    lineHeight: number;
    letterSpacing: string;
    fontSizes: {
      display: string;
      headline: string;
      title: string;
      body: string;
      label: string;
      caption: string;
    };
    lineHeights: {
      display: string;
      headline: string;
      title: string;
      body: string;
      label: string;
      caption: string;
    };
  };
  /** Spacing settings */
  spacing: {
    unit: number;
    scale: number;
    buttonPadding: string;
    buttonPaddingSm: string;
    buttonPaddingLg: string;
    cardPadding: string;
    cardBorderRadius: string;
    inputBorderRadius: string;
    buttonBorderRadius: string;
    modalBorderRadius: string;
  };
  /** Icon styling preferences */
  icons: {
    style: 'emoji' | 'illustrated' | 'modern-flat' | 'minimal';
    size: 'large' | 'medium' | 'small';
    sizeValue: string;
  };
  /** Animation preferences */
  animations: {
    style: 'playful' | 'subtle' | 'professional' | 'none';
    duration: string;
    durationFast: string;
    durationSlow: string;
    easing: string;
    easingBounce: string;
    hoverScale: string;
    pressScale: string;
  };
  /** Component-specific styling */
  components: {
    buttonVariant: 'rounded' | 'pill' | 'sharp';
    cardShadow: string;
    cardShadowHover: string;
    inputStyle: 'outlined' | 'filled' | 'underlined';
    touchTargetMin: string;
  };
  /** Gamification elements styling */
  gamification: {
    achievementStyle: 'playful' | 'badge' | 'minimal';
    progressBarStyle: 'animated' | 'gradient' | 'simple';
    celebrationIntensity: 'high' | 'medium' | 'low' | 'none';
    rewardAnimations: boolean;
  };
}

/**
 * K-5 (Elementary/Explorer) Theme
 *
 * Designed for Pre-K through 5th grade learners with:
 * - Bright, engaging colors
 * - Larger text and touch targets
 * - Playful animations and rounded corners
 * - Emoji-style icons
 * - High gamification support
 */
export const K5Theme: GradeTheme = {
  name: 'Explorer',
  gradeRange: 'K-5',
  id: 'K5',
  colors: {
    primary: '#FF6B6B',
    primaryHover: '#FF5252',
    secondary: '#4ECDC4',
    secondaryHover: '#3DBDB5',
    accent: '#FFE66D',
    background: '#FFF9F0',
    surface: '#FFFFFF',
    surfaceMuted: '#FFF5E6',
    surfaceElevated: '#FFFFFF',
    text: '#2D3436',
    textMuted: '#636E72',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#2D3436',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E17055',
    info: '#74B9FF',
    border: '#FFD8D8',
    borderMuted: '#FFE8E8',
    focus: '#74B9FF',
    focusRing: 'rgba(116, 185, 255, 0.5)',
    backdrop: 'rgba(45, 52, 54, 0.5)',
  },
  colorsHighContrast: {
    primary: '#CC0000',
    primaryHover: '#990000',
    secondary: '#007D75',
    text: '#000000',
    textMuted: '#333333',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#000000',
    focus: '#0000CC',
  },
  typography: {
    fontFamily: '"Nunito", "Comic Neue", "Comic Sans MS", cursive, sans-serif',
    headingFontFamily: '"Fredoka One", "Nunito", cursive, sans-serif',
    dyslexiaFontFamily: '"Atkinson Hyperlegible", "OpenDyslexic", sans-serif',
    baseFontSize: '18px',
    headingScale: 1.4,
    lineHeight: 1.8,
    letterSpacing: '0.02em',
    fontSizes: {
      display: '42px',
      headline: '34px',
      title: '26px',
      body: '18px',
      label: '16px',
      caption: '14px',
    },
    lineHeights: {
      display: '52px',
      headline: '44px',
      title: '36px',
      body: '28px',
      label: '24px',
      caption: '20px',
    },
  },
  spacing: {
    unit: 8,
    scale: 1.15,
    buttonPadding: '16px 32px',
    buttonPaddingSm: '12px 24px',
    buttonPaddingLg: '20px 40px',
    cardPadding: '24px',
    cardBorderRadius: '24px',
    inputBorderRadius: '16px',
    buttonBorderRadius: '20px',
    modalBorderRadius: '28px',
  },
  icons: {
    style: 'emoji',
    size: 'large',
    sizeValue: '32px',
  },
  animations: {
    style: 'playful',
    duration: '0.4s',
    durationFast: '0.2s',
    durationSlow: '0.6s',
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    hoverScale: '1.05',
    pressScale: '0.95',
  },
  components: {
    buttonVariant: 'pill',
    cardShadow: '0 8px 32px rgba(255, 107, 107, 0.2)',
    cardShadowHover: '0 12px 40px rgba(255, 107, 107, 0.3)',
    inputStyle: 'filled',
    touchTargetMin: '56px',
  },
  gamification: {
    achievementStyle: 'playful',
    progressBarStyle: 'animated',
    celebrationIntensity: 'high',
    rewardAnimations: true,
  },
};

/**
 * Middle School (Navigator) Theme
 *
 * Designed for 6th through 8th grade learners with:
 * - Cool, teal-based color palette
 * - Balanced text and spacing
 * - Subtle animations
 * - Modern flat icons
 * - Moderate gamification
 */
export const MSTheme: GradeTheme = {
  name: 'Navigator',
  gradeRange: '6-8',
  id: 'MS',
  colors: {
    primary: '#0891B2',
    primaryHover: '#0E7490',
    secondary: '#22D3EE',
    secondaryHover: '#06B6D4',
    accent: '#10B981',
    background: '#F8FAFB',
    surface: '#FFFFFF',
    surfaceMuted: '#ECFEFF',
    surfaceElevated: '#FFFFFF',
    text: '#1A1A2E',
    textMuted: '#52525B',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    border: '#A5F3FC',
    borderMuted: '#CFFAFE',
    focus: '#3B82F6',
    focusRing: 'rgba(59, 130, 246, 0.5)',
    backdrop: 'rgba(26, 26, 46, 0.45)',
  },
  colorsHighContrast: {
    primary: '#065F73',
    primaryHover: '#044D5E',
    secondary: '#0891B2',
    text: '#000000',
    textMuted: '#1A1A1A',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#065F73',
    focus: '#0000CC',
  },
  typography: {
    fontFamily: '"Nunito", "Inter", system-ui, sans-serif',
    headingFontFamily: '"Nunito", "Inter", system-ui, sans-serif',
    dyslexiaFontFamily: '"Atkinson Hyperlegible", "OpenDyslexic", sans-serif',
    baseFontSize: '16px',
    headingScale: 1.3,
    lineHeight: 1.6,
    letterSpacing: '0.01em',
    fontSizes: {
      display: '36px',
      headline: '28px',
      title: '22px',
      body: '16px',
      label: '14px',
      caption: '12px',
    },
    lineHeights: {
      display: '44px',
      headline: '36px',
      title: '30px',
      body: '24px',
      label: '20px',
      caption: '18px',
    },
  },
  spacing: {
    unit: 8,
    scale: 1.06,
    buttonPadding: '12px 24px',
    buttonPaddingSm: '8px 16px',
    buttonPaddingLg: '16px 32px',
    cardPadding: '20px',
    cardBorderRadius: '16px',
    inputBorderRadius: '10px',
    buttonBorderRadius: '12px',
    modalBorderRadius: '20px',
  },
  icons: {
    style: 'modern-flat',
    size: 'medium',
    sizeValue: '24px',
  },
  animations: {
    style: 'subtle',
    duration: '0.25s',
    durationFast: '0.15s',
    durationSlow: '0.4s',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    easingBounce: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
    hoverScale: '1.02',
    pressScale: '0.98',
  },
  components: {
    buttonVariant: 'rounded',
    cardShadow: '0 4px 16px rgba(8, 145, 178, 0.12)',
    cardShadowHover: '0 8px 24px rgba(8, 145, 178, 0.18)',
    inputStyle: 'outlined',
    touchTargetMin: '48px',
  },
  gamification: {
    achievementStyle: 'badge',
    progressBarStyle: 'gradient',
    celebrationIntensity: 'medium',
    rewardAnimations: true,
  },
};

/**
 * High School (Scholar) Theme
 *
 * Designed for 9th through 12th grade learners with:
 * - Professional, muted color palette
 * - Compact text and spacing
 * - Minimal animations
 * - Clean minimal icons
 * - Subtle gamification
 */
export const HSTheme: GradeTheme = {
  name: 'Scholar',
  gradeRange: '9-12',
  id: 'HS',
  colors: {
    primary: '#1A1A2E',
    primaryHover: '#2D2D47',
    secondary: '#47476F',
    secondaryHover: '#5A5A85',
    accent: '#7C3AED',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F4F5',
    surfaceElevated: '#FFFFFF',
    text: '#1A1A2E',
    textMuted: '#52525B',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    border: '#E4E4E7',
    borderMuted: '#F4F4F5',
    focus: '#3B82F6',
    focusRing: 'rgba(59, 130, 246, 0.5)',
    backdrop: 'rgba(26, 26, 46, 0.4)',
  },
  colorsHighContrast: {
    primary: '#000000',
    primaryHover: '#1A1A1A',
    secondary: '#333333',
    text: '#000000',
    textMuted: '#1A1A1A',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#000000',
    focus: '#0000CC',
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    headingFontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    dyslexiaFontFamily: '"Atkinson Hyperlegible", "OpenDyslexic", sans-serif',
    baseFontSize: '15px',
    headingScale: 1.25,
    lineHeight: 1.5,
    letterSpacing: '0',
    fontSizes: {
      display: '32px',
      headline: '24px',
      title: '20px',
      body: '15px',
      label: '13px',
      caption: '11px',
    },
    lineHeights: {
      display: '40px',
      headline: '32px',
      title: '28px',
      body: '24px',
      label: '18px',
      caption: '16px',
    },
  },
  spacing: {
    unit: 8,
    scale: 1.0,
    buttonPadding: '10px 20px',
    buttonPaddingSm: '6px 12px',
    buttonPaddingLg: '14px 28px',
    cardPadding: '16px',
    cardBorderRadius: '8px',
    inputBorderRadius: '6px',
    buttonBorderRadius: '8px',
    modalBorderRadius: '12px',
  },
  icons: {
    style: 'minimal',
    size: 'small',
    sizeValue: '20px',
  },
  animations: {
    style: 'professional',
    duration: '0.15s',
    durationFast: '0.1s',
    durationSlow: '0.25s',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    easingBounce: 'cubic-bezier(0.34, 1.1, 0.64, 1)',
    hoverScale: '1.01',
    pressScale: '0.99',
  },
  components: {
    buttonVariant: 'sharp',
    cardShadow: '0 2px 8px rgba(26, 26, 46, 0.08)',
    cardShadowHover: '0 4px 12px rgba(26, 26, 46, 0.12)',
    inputStyle: 'outlined',
    touchTargetMin: '44px',
  },
  gamification: {
    achievementStyle: 'minimal',
    progressBarStyle: 'simple',
    celebrationIntensity: 'low',
    rewardAnimations: false,
  },
};

/**
 * High School Dark Mode Theme
 *
 * Dark variant of the Scholar theme for late-night studying
 */
export const HSDarkTheme: GradeTheme = {
  ...HSTheme,
  name: 'Scholar Dark',
  colors: {
    primary: '#A78BFA',
    primaryHover: '#C4B5FD',
    secondary: '#757593',
    secondaryHover: '#8A8AA8',
    accent: '#7C3AED',
    background: '#09090B',
    surface: '#18181B',
    surfaceMuted: '#27272A',
    surfaceElevated: '#27272A',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    textOnPrimary: '#09090B',
    textOnAccent: '#FFFFFF',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    border: '#3F3F46',
    borderMuted: '#27272A',
    focus: '#60A5FA',
    focusRing: 'rgba(96, 165, 250, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.6)',
  },
  colorsHighContrast: {
    primary: '#E9D5FF',
    primaryHover: '#F3E8FF',
    secondary: '#D4D4D8',
    text: '#FFFFFF',
    textMuted: '#E4E4E7',
    background: '#000000',
    surface: '#09090B',
    border: '#FFFFFF',
    focus: '#93C5FD',
  },
  components: {
    ...HSTheme.components,
    cardShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    cardShadowHover: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
};

/**
 * All available themes indexed by grade band
 */
export const gradeThemes = {
  K5: K5Theme,
  MS: MSTheme,
  HS: HSTheme,
  HSDark: HSDarkTheme,
} as const;

export type GradeLevel = keyof typeof gradeThemes;

/**
 * Default theme for each context
 */
export const defaultTheme: GradeTheme = MSTheme;
