import plugin from 'tailwindcss/plugin';

import type { GradeBand } from '../theme/tokens';
import { tokens } from '../theme/tokens';

const colorEntries = [
  { token: 'background', name: 'background' },
  { token: 'surface', name: 'surface' },
  { token: 'surfaceMuted', name: 'surface-muted' },
  { token: 'surfaceElevated', name: 'surface-elevated' },
  { token: 'primary', name: 'primary' },
  { token: 'primaryHover', name: 'primary-hover' },
  { token: 'secondary', name: 'secondary' },
  { token: 'accent', name: 'accent' },
  { token: 'info', name: 'info' },
  { token: 'success', name: 'success' },
  { token: 'warning', name: 'warning' },
  { token: 'error', name: 'error' },
  { token: 'border', name: 'border' },
  { token: 'borderMuted', name: 'border-muted' },
  { token: 'focus', name: 'focus' },
  { token: 'textPrimary', name: 'text' },
  { token: 'textSecondary', name: 'muted' },
  { token: 'textMuted', name: 'text-muted' },
  { token: 'textOnPrimary', name: 'on-primary' },
  { token: 'textOnAccent', name: 'on-accent' },
] as const;

const fontSizeKeys = ['display', 'headline', 'title', 'body', 'label', 'caption'] as const;

interface ThemeOptions {
  highContrast?: boolean;
  dyslexia?: boolean;
  reducedMotion?: boolean;
}

function kebab(input: string): string {
  return input.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function colorToRgbChannels(value: string): string {
  if (value.startsWith('#')) {
    return hexToRgbChannels(value);
  }
  const match = /rgba?\(([^)]+)\)/i.exec(value);
  if (match?.[1]) {
    const [r, g, b] = match[1]
      .split(',')
      .slice(0, 3)
      .map((segment) => Number.parseFloat(segment.trim()));
    return `${r} ${g} ${b}`;
  }
  return value;
}

function buildThemeVariables(grade: GradeBand, options: ThemeOptions = {}): Record<string, string> {
  const theme = tokens.gradeThemes[grade];
  if (!theme) {
    throw new Error(`Unknown grade theme: ${grade}`);
  }
  const vars: Record<string, string> = {};

  const colorSource =
    options.highContrast && theme.colorHighContrast ? theme.colorHighContrast : theme.color;

  for (const entry of colorEntries) {
    const color = colorSource[entry.token];
    if (color) {
      vars[`--color-${entry.name}`] = colorToRgbChannels(color);
    }
  }

  // backdrop and focusRing keep their format for overlays
  if (colorSource.backdrop) {
    vars['--color-backdrop'] = colorSource.backdrop;
  }
  if (colorSource.focusRing) {
    vars['--color-focus-ring'] = colorSource.focusRing;
  }

  for (const size of fontSizeKeys) {
    vars[`--font-size-${kebab(size)}`] = `${theme.fontSize[size]}px`;
    vars[`--line-height-${kebab(size)}`] = `${theme.lineHeight[size]}px`;
  }

  // Theme-specific radius values
  if (theme.radius) {
    for (const [name, value] of Object.entries(theme.radius)) {
      vars[`--radius-${kebab(name)}`] = `${value}px`;
    }
  }

  // Touch target sizes
  if (theme.touchTarget) {
    for (const [name, value] of Object.entries(theme.touchTarget)) {
      vars[`--touch-target-${kebab(name)}`] = `${value}px`;
    }
  }

  const spacingScale = theme.scale.space;
  for (const [token, value] of Object.entries(tokens.base.space)) {
    const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
    vars[`--space-${token}`] = `${numeric * spacingScale}px`;
  }

  const formatFamily = (family: string[]) =>
    family.map((name) => (name.includes(' ') ? `"${name}"` : name)).join(', ');
  const defaultFamily = formatFamily(tokens.base.font.family.default);
  const dyslexiaFamily = formatFamily(tokens.base.font.family.dyslexia_friendly);
  vars['--font-family-default'] = options.dyslexia ? dyslexiaFamily : defaultFamily;
  vars['--font-family-dyslexia'] = dyslexiaFamily;

  for (const [name, radius] of Object.entries(tokens.base.radius)) {
    vars[`--radius-${kebab(name)}`] = `${radius}px`;
  }

  const shadows = tokens.base.shadow as Record<
    string,
    { color: string; x: number; y: number; blur: number; spread: number }
  >;
  for (const [name, shadow] of Object.entries(shadows)) {
    vars[`--shadow-${kebab(name)}`] =
      `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
  }

  const motionDurations = options.reducedMotion
    ? tokens.base.motion.durationReduced
    : tokens.base.motion.duration;
  for (const [durationName, duration] of Object.entries(motionDurations)) {
    vars[`--motion-duration-${kebab(durationName)}`] = `${duration}ms`;
  }
  for (const [durationName, duration] of Object.entries(tokens.base.motion.durationReduced)) {
    vars[`--motion-duration-reduced-${kebab(durationName)}`] = `${duration}ms`;
  }
  for (const [easingName, easing] of Object.entries(tokens.base.motion.easing)) {
    vars[`--motion-easing-${kebab(easingName)}`] = easing;
  }

  return vars;
}

function buildFontSizes(): Record<string, [string, { lineHeight: string }]> {
  const sizes: Record<string, [string, { lineHeight: string }]> = {};
  for (const key of fontSizeKeys) {
    sizes[key] = [
      `var(--font-size-${kebab(key)})`,
      { lineHeight: `var(--line-height-${kebab(key)})` },
    ];
  }
  return sizes;
}

const borderRadius = Object.fromEntries(
  Object.entries(tokens.base.radius).map(([name, radius]) => [name, `${radius}px`])
);

const boxShadow = Object.fromEntries(
  Object.keys(tokens.base.shadow).map((name) => [name, `var(--shadow-${kebab(name)})`])
);

function gradeThemeBase(defaultGrade: GradeBand) {
  const base: Record<string, Record<string, string>> = {
    ':root': buildThemeVariables(defaultGrade),
  };

  for (const grade of Object.keys(tokens.gradeThemes)) {
    // Support both data-grade-theme and data-theme attributes
    base[`[data-grade-theme="${grade}"]`] = buildThemeVariables(grade as GradeBand);
    base[`[data-theme="${grade}"]`] = buildThemeVariables(grade as GradeBand);

    // High contrast variants
    base[`[data-grade-theme="${grade}"][data-high-contrast="true"]`] = buildThemeVariables(
      grade as GradeBand,
      { highContrast: true }
    );
    base[`[data-theme="${grade}"][data-high-contrast="true"]`] = buildThemeVariables(
      grade as GradeBand,
      { highContrast: true }
    );
    // Legacy attribute support
    base[`[data-grade-theme="${grade}"][data-a11y-high-contrast="true"]`] = buildThemeVariables(
      grade as GradeBand,
      { highContrast: true }
    );
  }

  // Dyslexia-friendly font
  base['[data-dyslexia="true"]'] = {
    '--font-family-default': 'var(--font-family-dyslexia)',
  };
  base['[data-a11y-dyslexia="true"]'] = {
    '--font-family-default': 'var(--font-family-dyslexia)',
  };

  // Reduced motion
  const reducedMotionVars = buildThemeVariables(defaultGrade, { reducedMotion: true });
  const reducedMotionOverrides: Record<string, string> = Object.fromEntries(
    Object.entries(reducedMotionVars).filter(
      ([key]) => key.startsWith('--motion-duration') || key.startsWith('--motion-easing')
    )
  );
  base['[data-reduced-motion="true"]'] = reducedMotionOverrides;
  base['[data-a11y-reduced-motion="true"]'] = reducedMotionOverrides;

  return base;
}

export function createGradeThemePlugin(defaultGrade: GradeBand = 'navigator') {
  const colorTheme: Record<string, string> = Object.fromEntries(
    colorEntries.map((entry) => [entry.name, `rgb(var(--color-${entry.name}) / <alpha-value>)`])
  );

  return plugin(
    ({ addBase }: { addBase: (base: Record<string, Record<string, string>>) => void }) => {
      addBase(gradeThemeBase(defaultGrade));
    },
    {
      theme: {
        extend: {
          colors: colorTheme,
          fontSize: buildFontSizes(),
          fontFamily: {
            sans: ['var(--font-family-default)', 'system-ui', '-apple-system', 'sans-serif'],
            dyslexia: ['var(--font-family-dyslexia)', 'system-ui', '-apple-system', 'sans-serif'],
          },
          borderRadius,
          boxShadow,
        },
      },
    }
  );
}
