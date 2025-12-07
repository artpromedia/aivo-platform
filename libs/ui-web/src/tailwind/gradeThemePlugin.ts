import plugin from 'tailwindcss/plugin';

import type { GradeBand } from '../theme/tokens.js';
import { tokens } from '../theme/tokens.js';

const colorEntries = [
  { token: 'background', name: 'background' },
  { token: 'surface', name: 'surface' },
  { token: 'surfaceMuted', name: 'surface-muted' },
  { token: 'primary', name: 'primary' },
  { token: 'secondary', name: 'secondary' },
  { token: 'accent', name: 'accent' },
  { token: 'info', name: 'info' },
  { token: 'success', name: 'success' },
  { token: 'warning', name: 'warning' },
  { token: 'error', name: 'error' },
  { token: 'border', name: 'border' },
  { token: 'focus', name: 'focus' },
  { token: 'textPrimary', name: 'text' },
  { token: 'textSecondary', name: 'muted' },
  { token: 'textOnAccent', name: 'on-accent' },
] as const;

const fontSizeKeys = ['display', 'headline', 'title', 'body', 'label', 'caption'] as const;

function kebab(input: string): string {
  return input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
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

function buildThemeVariables(grade: GradeBand): Record<string, string> {
  const theme = tokens.gradeThemes[grade];
  if (!theme) {
    throw new Error(`Unknown grade theme: ${grade}`);
  }
  const vars: Record<string, string> = {};

  for (const entry of colorEntries) {
    const color = theme.color[entry.token];
    if (color) {
      vars[`--color-${entry.name}`] = colorToRgbChannels(color);
    }
  }

  // backdrop keeps alpha as-is for overlays
  if (theme.color.backdrop) {
    vars['--color-backdrop'] = theme.color.backdrop;
  }

  for (const size of fontSizeKeys) {
    vars[`--font-size-${kebab(size)}`] = `${theme.fontSize[size]}px`;
    vars[`--line-height-${kebab(size)}`] = `${theme.lineHeight[size]}px`;
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
  vars['--font-family-default'] = defaultFamily;
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

  for (const [durationName, duration] of Object.entries(tokens.base.motion.duration)) {
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
    base[`[data-grade-theme="${grade}"]`] = buildThemeVariables(grade);
  }
  return base;
}

export function createGradeThemePlugin(defaultGrade: GradeBand = 'G6_8') {
  const colorTheme = Object.fromEntries(
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
