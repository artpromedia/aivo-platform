/**
 * @aivo/theme-provider/tailwind
 *
 * Tailwind CSS v4 helpers for white-label theming.
 * Provides colour utilities that reference the CSS custom properties
 * set by <ThemeProvider>.
 *
 * Usage in tailwind.config.ts:
 *
 *   import { aivoThemeColors } from '@aivo/theme-provider/tailwind';
 *
 *   export default {
 *     theme: {
 *       extend: {
 *         colors: aivoThemeColors,
 *       },
 *     },
 *   };
 *
 * Then use in JSX:  className="bg-brand-primary text-brand-text-on-primary"
 */

/**
 * Tailwind colour config using CSS custom properties.
 *
 * Colours use the `rgb(var(--aivo-color-*) / <alpha-value>)` pattern
 * so opacity modifiers (e.g. `bg-brand-primary/50`) work correctly.
 */
export const aivoThemeColors = {
  brand: {
    primary: 'rgb(var(--aivo-color-primary) / <alpha-value>)',
    secondary: 'rgb(var(--aivo-color-secondary) / <alpha-value>)',
    accent: 'rgb(var(--aivo-color-accent) / <alpha-value>)',
    background: 'rgb(var(--aivo-color-background) / <alpha-value>)',
    surface: 'rgb(var(--aivo-color-surface) / <alpha-value>)',
    text: 'rgb(var(--aivo-color-text) / <alpha-value>)',
    'text-on-primary':
      'rgb(var(--aivo-color-text-on-primary) / <alpha-value>)',
    muted: 'rgb(var(--aivo-color-muted) / <alpha-value>)',
    border: 'rgb(var(--aivo-color-border) / <alpha-value>)',
  },
} as const;

/**
 * Tailwind font-family extension referencing the CSS custom property.
 *
 * Usage:
 *   fontFamily: { ...aivoThemeFonts }
 *   →  className="font-brand"
 */
export const aivoThemeFonts = {
  brand: 'var(--aivo-font-family)',
} as const;

/**
 * Tailwind border-radius extension referencing the CSS custom property.
 *
 * Usage:
 *   borderRadius: { ...aivoThemeRadius }
 *   →  className="rounded-brand"
 */
export const aivoThemeRadius = {
  brand: 'var(--aivo-border-radius)',
} as const;

/**
 * All-in-one Tailwind theme extension object.
 * Spread into `theme.extend` for full white-label support.
 *
 *   theme: {
 *     extend: aivoThemeExtension,
 *   }
 */
export const aivoThemeExtension = {
  colors: aivoThemeColors,
  fontFamily: aivoThemeFonts,
  borderRadius: aivoThemeRadius,
} as const;
