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
    primary: '#F472B6',
    primaryHover: '#FB923C',
    secondary: '#34D399',
    secondaryHover: '#6EE7B7',
    accent: '#FBBF24',
    background: '#0F0A28',
    surface: '#19123C',
    surfaceMuted: '#231A4B',
    surfaceElevated: '#2D245A',
    text: '#FFF1F2',
    textMuted: '#C8B4DC',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#0F0A28',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#FB7185',
    info: '#67E8F9',
    border: '#462E78',
    borderMuted: '#32265A',
    focus: '#F472B6',
    focusRing: 'rgba(244, 114, 182, 0.5)',
    backdrop: 'rgba(15, 10, 40, 0.7)',
  },
  colorsHighContrast: {
    primary: '#FBA4D0',
    primaryHover: '#FFD6E8',
    secondary: '#6EE7B7',
    text: '#FFFFFF',
    textMuted: '#E4E4E7',
    background: '#000000',
    surface: '#0A0818',
    border: '#FFFFFF',
    focus: '#FBA4D0',
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
    cardShadow: '0 8px 32px rgba(244, 114, 182, 0.15), 0 0 0 1px rgba(244, 114, 182, 0.08)',
    cardShadowHover: '0 12px 40px rgba(244, 114, 182, 0.25), 0 0 0 1px rgba(244, 114, 182, 0.15)',
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
    primary: '#8B5CF6',
    primaryHover: '#A78BFA',
    secondary: '#6366F1',
    secondaryHover: '#818CF8',
    accent: '#FB923C',
    background: '#0D0B24',
    surface: '#161238',
    surfaceMuted: '#1E1A48',
    surfaceElevated: '#282355',
    text: '#F1F0FF',
    textMuted: '#A3A0C8',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    border: '#37306B',
    borderMuted: '#2A2558',
    focus: '#8B5CF6',
    focusRing: 'rgba(139, 92, 246, 0.5)',
    backdrop: 'rgba(13, 11, 36, 0.7)',
  },
  colorsHighContrast: {
    primary: '#C4B5FD',
    primaryHover: '#E9D5FF',
    secondary: '#818CF8',
    text: '#FFFFFF',
    textMuted: '#E4E4E7',
    background: '#000000',
    surface: '#060410',
    border: '#C8C8DC',
    focus: '#C4B5FD',
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
    cardShadow: '0 4px 16px rgba(139, 92, 246, 0.12), 0 0 0 1px rgba(139, 92, 246, 0.06)',
    cardShadowHover: '0 8px 24px rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(139, 92, 246, 0.1)',
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
    primary: '#A78BFA',
    primaryHover: '#C4B5FD',
    secondary: '#6366F1',
    secondaryHover: '#818CF8',
    accent: '#60A5FA',
    background: '#090912',
    surface: '#12121E',
    surfaceMuted: '#1C1C2A',
    surfaceElevated: '#242434',
    text: '#F5F5FA',
    textMuted: '#8C8CAA',
    textOnPrimary: '#090912',
    textOnAccent: '#090912',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    border: '#303044',
    borderMuted: '#242434',
    focus: '#A78BFA',
    focusRing: 'rgba(167, 139, 250, 0.5)',
    backdrop: 'rgba(9, 9, 18, 0.7)',
  },
  colorsHighContrast: {
    primary: '#E9D5FF',
    primaryHover: '#F3E8FF',
    secondary: '#C7D2FE',
    text: '#FFFFFF',
    textMuted: '#E4E4E7',
    background: '#000000',
    surface: '#09090B',
    border: '#FFFFFF',
    focus: '#E9D5FF',
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
    cardShadow: '0 2px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(167, 139, 250, 0.04)',
    cardShadowHover: '0 4px 20px rgba(167, 139, 250, 0.15), 0 0 0 1px rgba(167, 139, 250, 0.08)',
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
  // Already dark-first — alias with identical colors
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
