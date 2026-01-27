/**
 * CSS Custom Properties Generation System
 *
 * Generates CSS custom properties from theme configuration for runtime theming.
 * Supports SSR, print styles, and accessibility overrides.
 */

import type { GradeTheme, SensoryProfile } from './grade-themes';
import { gradeThemes, K5Theme, MSTheme, HSTheme, HSDarkTheme } from './grade-themes';

/**
 * Convert hex color to RGB channels for Tailwind opacity support
 */
export function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Convert any color value to RGB channels
 */
export function colorToRgbChannels(value: string): string {
  if (value.startsWith('#')) {
    return hexToRgbChannels(value);
  }
  // Handle rgba()/rgb() values
  const match = /rgba?\(([^)]+)\)/i.exec(value);
  if (match?.[1]) {
    const parts = match[1].split(',').slice(0, 3);
    const [r, g, b] = parts.map((segment) => Number.parseFloat(segment.trim()));
    return `${r} ${g} ${b}`;
  }
  return value;
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * CSS variable mapping for colors
 */
const colorVariableMap: Record<string, string> = {
  primary: '--color-primary',
  primaryHover: '--color-primary-hover',
  secondary: '--color-secondary',
  secondaryHover: '--color-secondary-hover',
  accent: '--color-accent',
  background: '--color-background',
  surface: '--color-surface',
  surfaceMuted: '--color-surface-muted',
  surfaceElevated: '--color-surface-elevated',
  text: '--color-text',
  textMuted: '--color-text-muted',
  textOnPrimary: '--color-on-primary',
  textOnAccent: '--color-on-accent',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  info: '--color-info',
  border: '--color-border',
  borderMuted: '--color-border-muted',
  focus: '--color-focus',
  focusRing: '--color-focus-ring',
  backdrop: '--color-backdrop',
};

/**
 * Generate CSS variables object from a theme
 */
export function generateCSSVariablesObject(
  theme: GradeTheme,
  sensoryProfile?: SensoryProfile
): Record<string, string> {
  const vars: Record<string, string> = {};
  const useHighContrast = sensoryProfile?.highContrast;
  const useDyslexia = sensoryProfile?.dyslexia;
  const useLargeText = sensoryProfile?.largeText;
  const useIncreasedSpacing = sensoryProfile?.increasedSpacing;

  // Color variables
  for (const [colorKey, cssVar] of Object.entries(colorVariableMap)) {
    const colorValue =
      useHighContrast && theme.colorsHighContrast[colorKey as keyof typeof theme.colors]
        ? theme.colorsHighContrast[colorKey as keyof typeof theme.colors]
        : theme.colors[colorKey as keyof typeof theme.colors];

    if (colorValue) {
      // Keep rgba values as-is for backdrop and focusRing
      if (colorKey === 'backdrop' || colorKey === 'focusRing') {
        vars[cssVar] = colorValue;
      } else {
        vars[cssVar] = colorToRgbChannels(colorValue);
      }
    }
  }

  // Font family
  const fontFamily = useDyslexia ? theme.typography.dyslexiaFontFamily : theme.typography.fontFamily;
  vars['--font-family-default'] = fontFamily;
  vars['--font-family-heading'] = useDyslexia
    ? theme.typography.dyslexiaFontFamily
    : theme.typography.headingFontFamily;
  vars['--font-family-dyslexia'] = theme.typography.dyslexiaFontFamily;

  // Font sizes (with optional large text scaling)
  const textScale = useLargeText ? 1.2 : 1;
  for (const [sizeKey, sizeValue] of Object.entries(theme.typography.fontSizes)) {
    const numValue = Number.parseFloat(sizeValue);
    vars[`--font-size-${toKebabCase(sizeKey)}`] = `${numValue * textScale}px`;
  }

  // Line heights (scaled with large text)
  for (const [sizeKey, sizeValue] of Object.entries(theme.typography.lineHeights)) {
    const numValue = Number.parseFloat(sizeValue);
    vars[`--line-height-${toKebabCase(sizeKey)}`] = `${numValue * textScale}px`;
  }

  // Letter spacing
  vars['--letter-spacing'] = theme.typography.letterSpacing;

  // Spacing (with optional increased spacing)
  const spacingScale = useIncreasedSpacing ? theme.spacing.scale * 1.25 : theme.spacing.scale;
  vars['--spacing-unit'] = `${theme.spacing.unit * spacingScale}px`;
  vars['--spacing-scale'] = String(spacingScale);

  // Generate spacing scale
  for (let i = 0; i <= 10; i++) {
    vars[`--space-${i}`] = `${i * theme.spacing.unit * spacingScale}px`;
  }

  // Border radii
  vars['--radius-button'] = theme.spacing.buttonBorderRadius;
  vars['--radius-card'] = theme.spacing.cardBorderRadius;
  vars['--radius-input'] = theme.spacing.inputBorderRadius;
  vars['--radius-modal'] = theme.spacing.modalBorderRadius;

  // Padding values
  vars['--padding-button'] = theme.spacing.buttonPadding;
  vars['--padding-button-sm'] = theme.spacing.buttonPaddingSm;
  vars['--padding-button-lg'] = theme.spacing.buttonPaddingLg;
  vars['--padding-card'] = theme.spacing.cardPadding;

  // Animation variables (respect reduced motion)
  const useReducedMotion = sensoryProfile?.reducedMotion;
  if (useReducedMotion) {
    vars['--animation-duration'] = '0ms';
    vars['--animation-duration-fast'] = '0ms';
    vars['--animation-duration-slow'] = '0ms';
    vars['--animation-easing'] = 'linear';
    vars['--hover-scale'] = '1';
    vars['--press-scale'] = '1';
  } else {
    vars['--animation-duration'] = theme.animations.duration;
    vars['--animation-duration-fast'] = theme.animations.durationFast;
    vars['--animation-duration-slow'] = theme.animations.durationSlow;
    vars['--animation-easing'] = theme.animations.easing;
    vars['--animation-easing-bounce'] = theme.animations.easingBounce;
    vars['--hover-scale'] = theme.animations.hoverScale;
    vars['--press-scale'] = theme.animations.pressScale;
  }

  // Component-specific variables
  vars['--shadow-card'] = theme.components.cardShadow;
  vars['--shadow-card-hover'] = theme.components.cardShadowHover;
  vars['--touch-target-min'] = theme.components.touchTargetMin;

  // Icon size
  vars['--icon-size'] = theme.icons.sizeValue;

  // Theme metadata
  vars['--theme-name'] = `"${theme.name}"`;
  vars['--theme-id'] = `"${theme.id}"`;

  return vars;
}

/**
 * Generate CSS variables as a CSS string
 */
export function generateCSSVariables(
  theme: GradeTheme,
  sensoryProfile?: SensoryProfile
): string {
  const vars = generateCSSVariablesObject(theme, sensoryProfile);
  return Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

/**
 * Generate complete CSS stylesheet with all theme variants
 */
export function generateThemeStylesheet(): string {
  const themes = [
    { theme: K5Theme, selector: '[data-grade-theme="K5"]', isDefault: false },
    { theme: MSTheme, selector: '[data-grade-theme="MS"]', isDefault: true },
    { theme: HSTheme, selector: '[data-grade-theme="HS"]', isDefault: false },
    { theme: HSDarkTheme, selector: '[data-grade-theme="HSDark"]', isDefault: false },
  ];

  let css = '/* AIVO Grade Theme CSS Variables - Auto-generated */\n\n';

  // Root defaults (Navigator/MS theme)
  css += ':root {\n';
  css += generateCSSVariables(MSTheme);
  css += '\n}\n\n';

  // Theme-specific selectors
  for (const { theme, selector } of themes) {
    css += `${selector},\n`;
    css += `[data-theme="${theme.id.toLowerCase()}"] {\n`;
    css += generateCSSVariables(theme);
    css += '\n}\n\n';
  }

  // High contrast variants
  for (const { theme, selector } of themes) {
    css += `${selector}[data-high-contrast="true"],\n`;
    css += `[data-theme="${theme.id.toLowerCase()}"][data-high-contrast="true"] {\n`;
    css += generateCSSVariables(theme, { highContrast: true });
    css += '\n}\n\n';
  }

  // Dyslexia-friendly overrides
  css += `[data-dyslexia="true"] {\n`;
  css += `  --font-family-default: var(--font-family-dyslexia);\n`;
  css += `  --font-family-heading: var(--font-family-dyslexia);\n`;
  css += `  --letter-spacing: 0.05em;\n`;
  css += `}\n\n`;

  // Reduced motion overrides
  css += `[data-reduced-motion="true"],\n`;
  css += `@media (prefers-reduced-motion: reduce) {\n`;
  css += `  :root {\n`;
  css += `    --animation-duration: 0ms;\n`;
  css += `    --animation-duration-fast: 0ms;\n`;
  css += `    --animation-duration-slow: 0ms;\n`;
  css += `    --hover-scale: 1;\n`;
  css += `    --press-scale: 1;\n`;
  css += `  }\n`;
  css += `}\n\n`;

  // Large text overrides
  css += `[data-large-text="true"] {\n`;
  css += `  --font-size-scale: 1.2;\n`;
  css += `}\n\n`;

  // Print-friendly styles
  css += `@media print {\n`;
  css += `  :root {\n`;
  css += `    --color-background: 255 255 255;\n`;
  css += `    --color-surface: 255 255 255;\n`;
  css += `    --color-text: 0 0 0;\n`;
  css += `    --color-text-muted: 51 51 51;\n`;
  css += `    --shadow-card: none;\n`;
  css += `    --shadow-card-hover: none;\n`;
  css += `    --animation-duration: 0ms;\n`;
  css += `  }\n`;
  css += `}\n`;

  return css;
}

/**
 * Apply CSS variables to document root
 */
export function applyCSSVariables(
  theme: GradeTheme,
  sensoryProfile?: SensoryProfile
): void {
  if (typeof document === 'undefined') return;

  const vars = generateCSSVariablesObject(theme, sensoryProfile);
  const root = document.documentElement;

  for (const [property, value] of Object.entries(vars)) {
    root.style.setProperty(property, value);
  }
}

/**
 * Remove all theme CSS variables from document root
 */
export function clearCSSVariables(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const style = root.style;
  const toRemove: string[] = [];

  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop && (
      prop.startsWith('--color-') || prop.startsWith('--font-') || prop.startsWith('--space-') ||
      prop.startsWith('--radius-') || prop.startsWith('--animation-') || prop.startsWith('--shadow-') ||
      prop.startsWith('--padding-') || prop.startsWith('--line-height-') || prop.startsWith('--icon-') ||
      prop.startsWith('--theme-') || prop.startsWith('--touch-') || prop.startsWith('--hover-') ||
      prop.startsWith('--press-') || prop.startsWith('--letter-') || prop.startsWith('--spacing-')
    )) {
      toRemove.push(prop);
    }
  }

  for (const prop of toRemove) {
    root.style.removeProperty(prop);
  }
}

/**
 * Get CSS variables for SSR/head injection
 */
export function getSSRStyleTag(defaultTheme: keyof typeof gradeThemes = 'MS'): string {
  const theme = gradeThemes[defaultTheme];
  const vars = generateCSSVariables(theme);
  return `<style id="aivo-theme-vars">:root {\n${vars}\n}</style>`;
}

/**
 * Create a style element with theme variables
 */
export function createThemeStyleElement(
  theme: GradeTheme,
  sensoryProfile?: SensoryProfile
): HTMLStyleElement {
  const style = document.createElement('style');
  style.id = 'aivo-grade-theme';
  style.textContent = `:root {\n${generateCSSVariables(theme, sensoryProfile)}\n}`;
  return style;
}

/**
 * Inject or update theme style element
 */
export function injectThemeStyles(
  theme: GradeTheme,
  sensoryProfile?: SensoryProfile
): void {
  if (typeof document === 'undefined') return;

  let styleElement = document.getElementById('aivo-grade-theme') as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'aivo-grade-theme';
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = `:root {\n${generateCSSVariables(theme, sensoryProfile)}\n}`;
}
