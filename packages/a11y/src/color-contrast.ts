/**
 * Color Contrast Utilities
 *
 * Provides tools for checking and ensuring WCAG color contrast compliance:
 * - AA: 4.5:1 for normal text, 3:1 for large text and UI components
 * - AAA: 7:1 for normal text, 4.5:1 for large text
 */

import { RGB, HSL, ContrastResult } from './types';

/**
 * Named colors map
 */
const NAMED_COLORS: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  teal: '#008080',
  navy: '#000080',
  fuchsia: '#ff00ff',
  purple: '#800080',
  orange: '#ffa500',
  transparent: '#00000000',
};

/**
 * Parse a color string to RGB values
 */
export function parseColor(color: string): RGB | null {
  if (!color) return null;

  const trimmed = color.trim().toLowerCase();

  // Handle hex colors
  if (trimmed.startsWith('#')) {
    return hexToRgb(trimmed);
  }

  // Handle rgb/rgba
  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // Handle hsl/hsla
  const hslMatch = trimmed.match(
    /hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/
  );
  if (hslMatch) {
    return hslToRgb({
      h: parseInt(hslMatch[1], 10),
      s: parseInt(hslMatch[2], 10),
      l: parseInt(hslMatch[3], 10),
    });
  }

  // Handle named colors
  if (NAMED_COLORS[trimmed]) {
    return hexToRgb(NAMED_COLORS[trimmed]);
  }

  return null;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }

  // Handle 6-digit hex
  if (cleanHex.length === 6 || cleanHex.length === 8) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }

  return null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format');
  }

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check contrast compliance
 */
export function checkContrast(
  foreground: string,
  background: string
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);

  const result: ContrastResult = {
    ratio: Math.round(ratio * 100) / 100,
    aa: {
      normalText: ratio >= 4.5,
      largeText: ratio >= 3,
      uiComponents: ratio >= 3,
    },
    aaa: {
      normalText: ratio >= 7,
      largeText: ratio >= 4.5,
    },
    level: 'Fail',
  };

  if (result.aaa.normalText) {
    result.level = 'AAA';
  } else if (result.aa.normalText) {
    result.level = 'AA';
  }

  return result;
}

/**
 * Find a color that meets contrast requirements
 */
export function findAccessibleColor(
  color: string,
  background: string,
  targetRatio = 4.5
): string {
  const rgb = parseColor(color);
  const bgRgb = parseColor(background);

  if (!rgb || !bgRgb) {
    throw new Error('Invalid color format');
  }

  const bgLuminance = getRelativeLuminance(bgRgb);
  const isLightBg = bgLuminance > 0.5;

  // Adjust color until we meet the target ratio
  let adjustedRgb = { ...rgb };
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const currentRatio = getContrastRatio(
      rgbToHex(adjustedRgb),
      background
    );

    if (currentRatio >= targetRatio) {
      return rgbToHex(adjustedRgb);
    }

    // Darken or lighten based on background
    const adjustment = isLightBg ? -5 : 5;
    adjustedRgb = {
      r: Math.max(0, Math.min(255, adjustedRgb.r + adjustment)),
      g: Math.max(0, Math.min(255, adjustedRgb.g + adjustment)),
      b: Math.max(0, Math.min(255, adjustedRgb.b + adjustment)),
    };

    attempts++;
  }

  // Fallback to black or white
  return isLightBg ? '#000000' : '#ffffff';
}

/**
 * Generate accessible color palette
 */
export function generateAccessiblePalette(
  baseColor: string,
  backgroundColor = '#ffffff'
): {
  primary: string;
  hover: string;
  focus: string;
  text: string;
} {
  const rgb = parseColor(baseColor);
  if (!rgb) {
    throw new Error('Invalid color format');
  }

  const primary = findAccessibleColor(baseColor, backgroundColor, 4.5);

  // Generate hover (slightly darker/lighter)
  const primaryRgb = parseColor(primary)!;
  const bgLuminance = getRelativeLuminance(parseColor(backgroundColor)!);
  const adjustment = bgLuminance > 0.5 ? -20 : 20;

  const hover = rgbToHex({
    r: Math.max(0, Math.min(255, primaryRgb.r + adjustment)),
    g: Math.max(0, Math.min(255, primaryRgb.g + adjustment)),
    b: Math.max(0, Math.min(255, primaryRgb.b + adjustment)),
  });

  return {
    primary,
    hover: findAccessibleColor(hover, backgroundColor, 4.5),
    focus: primary,
    text: findAccessibleColor(primary, backgroundColor, 4.5),
  };
}

/**
 * Check if text is "large" according to WCAG
 * Large text: 18pt (24px) or 14pt (18.5px) bold
 */
export function isLargeText(fontSize: number, isBold = false): boolean {
  if (isBold) {
    return fontSize >= 18.5; // 14pt
  }
  return fontSize >= 24; // 18pt
}

/**
 * Get required contrast ratio based on text size
 */
export function getRequiredContrastRatio(
  fontSize: number,
  isBold = false,
  level: 'AA' | 'AAA' = 'AA'
): number {
  const isLarge = isLargeText(fontSize, isBold);

  if (level === 'AAA') {
    return isLarge ? 4.5 : 7;
  }
  return isLarge ? 3 : 4.5;
}

/**
 * Lighten a color by a percentage
 */
export function lighten(color: string, percent: number): string {
  const rgb = parseColor(color);
  if (!rgb) throw new Error('Invalid color');

  const hsl = rgbToHsl(rgb);
  hsl.l = Math.min(100, hsl.l + percent);

  return rgbToHex(hslToRgb(hsl));
}

/**
 * Darken a color by a percentage
 */
export function darken(color: string, percent: number): string {
  const rgb = parseColor(color);
  if (!rgb) throw new Error('Invalid color');

  const hsl = rgbToHsl(rgb);
  hsl.l = Math.max(0, hsl.l - percent);

  return rgbToHex(hslToRgb(hsl));
}

/**
 * Get a contrasting color (black or white)
 */
export function getContrastingColor(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return '#000000';

  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Validate color contrast for WCAG compliance
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  options: {
    level?: 'AA' | 'AAA';
    fontSize?: number;
    isBold?: boolean;
    isUIComponent?: boolean;
  } = {}
): {
  valid: boolean;
  ratio: number;
  requiredRatio: number;
  message: string;
} {
  const {
    level = 'AA',
    fontSize = 16,
    isBold = false,
    isUIComponent = false,
  } = options;

  const ratio = getContrastRatio(foreground, background);
  let requiredRatio: number;

  if (isUIComponent) {
    requiredRatio = 3;
  } else {
    requiredRatio = getRequiredContrastRatio(fontSize, isBold, level);
  }

  const valid = ratio >= requiredRatio;

  let message = '';
  if (valid) {
    message = `Contrast ratio ${ratio.toFixed(2)}:1 meets WCAG ${level} requirements (${requiredRatio}:1 required)`;
  } else {
    message = `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG ${level} requirements (${requiredRatio}:1 required)`;
  }

  return {
    valid,
    ratio: Math.round(ratio * 100) / 100,
    requiredRatio,
    message,
  };
}
