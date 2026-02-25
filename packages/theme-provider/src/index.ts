/**
 * @aivo/theme-provider
 *
 * White-label theming types and defaults for the AIVO platform.
 * Use `@aivo/theme-provider/react` for the React context provider.
 * Use `@aivo/theme-provider/tailwind` for Tailwind CSS helpers.
 */

/* -------------------------------------------------------------------------- */
/*  Core theme interface                                                       */
/* -------------------------------------------------------------------------- */

export interface AivoTheme {
  /** Tenant display name shown in tab title / nav */
  displayName: string;

  /** Full-size logo URL (nav bar, login page) */
  logoUrl: string | null;

  /** Small/icon logo URL (collapsed sidebar, mobile) */
  logoSmallUrl: string | null;

  /** Favicon URL */
  faviconUrl: string | null;

  /* -- Colour palette ---------------------------------------------------- */

  /** Primary brand colour (buttons, links, active states) */
  colorPrimary: string;

  /** Secondary/accent colour */
  colorSecondary: string;

  /** Accent colour for highlights */
  colorAccent: string;

  /** Page / app background colour */
  colorBackground: string;

  /** Raised surface colour (cards, modals) */
  colorSurface: string;

  /** Primary text colour */
  colorText: string;

  /** Text colour on primary-coloured backgrounds */
  colorTextOnPrimary: string;

  /** Muted/secondary text colour */
  colorMuted: string;

  /** Border / divider colour */
  colorBorder: string;

  /* -- Typography -------------------------------------------------------- */

  /** Primary font family stack */
  fontFamily: string;

  /** Border radius token (e.g. "0.5rem") */
  borderRadius: string;

  /* -- Login page -------------------------------------------------------- */

  /** Background image for login/signup page */
  loginBackgroundUrl: string | null;

  /** Welcome message shown on login page */
  loginMessage: string | null;

  /* -- Support links ----------------------------------------------------- */

  supportEmail: string | null;
  supportUrl: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Default theme (Aivo Learning branding)                                     */
/* -------------------------------------------------------------------------- */

export const DEFAULT_THEME: AivoTheme = {
  displayName: 'Aivo Learning',
  logoUrl: null,
  logoSmallUrl: null,
  faviconUrl: null,

  colorPrimary: '#6366F1', // indigo-500
  colorSecondary: '#8B5CF6', // violet-500
  colorAccent: '#F59E0B', // amber-500
  colorBackground: '#FFFFFF',
  colorSurface: '#F8FAFC', // slate-50
  colorText: '#0F172A', // slate-900
  colorTextOnPrimary: '#FFFFFF',
  colorMuted: '#64748B', // slate-500
  colorBorder: '#E2E8F0', // slate-200

  fontFamily: '"DM Sans", "Plus Jakarta Sans", system-ui, sans-serif',
  borderRadius: '0.5rem',

  loginBackgroundUrl: null,
  loginMessage: null,

  supportEmail: null,
  supportUrl: null,
  privacyPolicyUrl: null,
  termsOfServiceUrl: null,
};

/* -------------------------------------------------------------------------- */
/*  CSS custom property helpers                                                */
/* -------------------------------------------------------------------------- */

/** Map of CSS custom property names → AivoTheme keys */
export const CSS_VAR_MAP: Record<string, keyof AivoTheme> = {
  '--aivo-color-primary': 'colorPrimary',
  '--aivo-color-secondary': 'colorSecondary',
  '--aivo-color-accent': 'colorAccent',
  '--aivo-color-background': 'colorBackground',
  '--aivo-color-surface': 'colorSurface',
  '--aivo-color-text': 'colorText',
  '--aivo-color-text-on-primary': 'colorTextOnPrimary',
  '--aivo-color-muted': 'colorMuted',
  '--aivo-color-border': 'colorBorder',
  '--aivo-font-family': 'fontFamily',
  '--aivo-border-radius': 'borderRadius',
};

/**
 * Convert a hex colour (#RRGGBB) to an "R G B" string for use with
 * Tailwind's `rgb(var(--color) / <alpha-value>)` pattern.
 */
export function hexToRgbString(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Build a Record of CSS custom property → value from a theme,
 * converting hex colours to "R G B" format for Tailwind compatibility.
 */
export function themeToCssVars(theme: AivoTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [cssVar, themeKey] of Object.entries(CSS_VAR_MAP)) {
    const value = theme[themeKey];
    if (value == null) continue;

    const str = typeof value === 'string' ? value : String(value);

    // Convert hex colours to "R G B" format
    if (cssVar.startsWith('--aivo-color-') && str.startsWith('#')) {
      vars[cssVar] = hexToRgbString(str);
    } else {
      vars[cssVar] = str;
    }
  }

  return vars;
}
