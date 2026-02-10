import { describe, it, expect } from 'vitest';
import {
  parseColor,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  getRelativeLuminance,
  getContrastRatio,
  checkContrast,
  findAccessibleColor,
  isLargeText,
  getRequiredContrastRatio,
  lighten,
  darken,
  getContrastingColor,
  validateColorContrast,
} from '../src/color-contrast.js';

// ============================================================================
// parseColor
// ============================================================================
describe('parseColor', () => {
  it('parses 6-digit hex colors', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseColor('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('parses 3-digit hex colors', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('parses hex without # prefix', () => {
    expect(parseColor('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses rgb() strings', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('rgb(128, 64, 32)')).toEqual({ r: 128, g: 64, b: 32 });
  });

  it('parses named colors', () => {
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('returns null for invalid input', () => {
    expect(parseColor('notacolor')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

// ============================================================================
// hexToRgb
// ============================================================================
describe('hexToRgb', () => {
  it('converts 6-digit hex to RGB', () => {
    expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('converts 3-digit hex to RGB', () => {
    expect(hexToRgb('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('handles hex without hash', () => {
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgb('gg')).toBeNull();
    expect(hexToRgb('12345')).toBeNull();
  });
});

// ============================================================================
// rgbToHex
// ============================================================================
describe('rgbToHex', () => {
  it('converts RGB to hex string', () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });

  it('clamps values to 0-255', () => {
    expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
  });
});

// ============================================================================
// rgbToHsl / hslToRgb round-trip
// ============================================================================
describe('rgbToHsl', () => {
  it('converts pure red', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('converts white', () => {
    const hsl = rgbToHsl({ r: 255, g: 255, b: 255 });
    expect(hsl.l).toBe(100);
    expect(hsl.s).toBe(0);
  });

  it('converts black', () => {
    const hsl = rgbToHsl({ r: 0, g: 0, b: 0 });
    expect(hsl.l).toBe(0);
    expect(hsl.s).toBe(0);
  });
});

describe('hslToRgb', () => {
  it('converts pure red HSL back to RGB', () => {
    const rgb = hslToRgb({ h: 0, s: 100, l: 50 });
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts achromatic (gray)', () => {
    const rgb = hslToRgb({ h: 0, s: 0, l: 50 });
    expect(rgb.r).toBe(rgb.g);
    expect(rgb.g).toBe(rgb.b);
    expect(rgb.r).toBe(128);
  });
});

describe('rgbToHsl / hslToRgb round-trip', () => {
  it('round-trips arbitrary colors', () => {
    const original = { r: 100, g: 150, b: 200 };
    const hsl = rgbToHsl(original);
    const back = hslToRgb(hsl);
    // Allow rounding tolerance
    expect(back.r).toBeCloseTo(original.r, 0);
    expect(back.g).toBeCloseTo(original.g, 0);
    expect(back.b).toBeCloseTo(original.b, 0);
  });
});

// ============================================================================
// getRelativeLuminance
// ============================================================================
describe('getRelativeLuminance', () => {
  it('returns 1 for white', () => {
    expect(getRelativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1.0, 2);
  });

  it('returns 0 for black', () => {
    expect(getRelativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it('returns correct value for mid-gray', () => {
    const lum = getRelativeLuminance({ r: 128, g: 128, b: 128 });
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.3);
  });
});

// ============================================================================
// getContrastRatio
// ============================================================================
describe('getContrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = getContrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same color', () => {
    const ratio = getContrastRatio('#ff0000', '#ff0000');
    expect(ratio).toBeCloseTo(1, 1);
  });

  it('throws for invalid colors', () => {
    expect(() => getContrastRatio('invalid', '#ffffff')).toThrow('Invalid color format');
  });
});

// ============================================================================
// checkContrast
// ============================================================================
describe('checkContrast', () => {
  it('black on white passes AAA', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.level).toBe('AAA');
    expect(result.aa.normalText).toBe(true);
    expect(result.aa.largeText).toBe(true);
    expect(result.aaa.normalText).toBe(true);
    expect(result.aaa.largeText).toBe(true);
  });

  it('light gray on white fails AA', () => {
    const result = checkContrast('#cccccc', '#ffffff');
    expect(result.level).toBe('Fail');
    expect(result.aa.normalText).toBe(false);
  });

  it('includes ratio in result', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.ratio).toBeGreaterThan(20);
  });
});

// ============================================================================
// isLargeText
// ============================================================================
describe('isLargeText', () => {
  it('returns true for 24px normal text', () => {
    expect(isLargeText(24)).toBe(true);
  });

  it('returns false for 16px normal text', () => {
    expect(isLargeText(16)).toBe(false);
  });

  it('returns true for 18.5px bold text', () => {
    expect(isLargeText(18.5, true)).toBe(true);
  });

  it('returns false for 14px bold text', () => {
    expect(isLargeText(14, true)).toBe(false);
  });
});

// ============================================================================
// getRequiredContrastRatio
// ============================================================================
describe('getRequiredContrastRatio', () => {
  it('returns 4.5 for normal AA text', () => {
    expect(getRequiredContrastRatio(16)).toBe(4.5);
  });

  it('returns 3 for large AA text', () => {
    expect(getRequiredContrastRatio(24)).toBe(3);
  });

  it('returns 7 for normal AAA text', () => {
    expect(getRequiredContrastRatio(16, false, 'AAA')).toBe(7);
  });

  it('returns 4.5 for large AAA text', () => {
    expect(getRequiredContrastRatio(24, false, 'AAA')).toBe(4.5);
  });
});

// ============================================================================
// lighten / darken
// ============================================================================
describe('lighten', () => {
  it('increases lightness', () => {
    const lightened = lighten('#808080', 20);
    const original = parseColor('#808080')!;
    const result = parseColor(lightened)!;
    expect(getRelativeLuminance(result)).toBeGreaterThan(getRelativeLuminance(original));
  });

  it('throws for invalid color', () => {
    expect(() => lighten('notacolor', 10)).toThrow('Invalid color');
  });
});

describe('darken', () => {
  it('decreases lightness', () => {
    const darkened = darken('#808080', 20);
    const original = parseColor('#808080')!;
    const result = parseColor(darkened)!;
    expect(getRelativeLuminance(result)).toBeLessThan(getRelativeLuminance(original));
  });

  it('throws for invalid color', () => {
    expect(() => darken('notacolor', 10)).toThrow('Invalid color');
  });
});

// ============================================================================
// getContrastingColor
// ============================================================================
describe('getContrastingColor', () => {
  it('returns black for white background', () => {
    expect(getContrastingColor('#ffffff')).toBe('#000000');
  });

  it('returns white for black background', () => {
    expect(getContrastingColor('#000000')).toBe('#ffffff');
  });

  it('returns black for invalid color', () => {
    expect(getContrastingColor('invalid')).toBe('#000000');
  });
});

// ============================================================================
// validateColorContrast
// ============================================================================
describe('validateColorContrast', () => {
  it('validates passing contrast', () => {
    const result = validateColorContrast('#000000', '#ffffff');
    expect(result.valid).toBe(true);
    expect(result.ratio).toBeGreaterThan(20);
    expect(result.requiredRatio).toBe(4.5);
    expect(result.message).toContain('meets WCAG');
  });

  it('validates failing contrast', () => {
    const result = validateColorContrast('#cccccc', '#ffffff');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('fails WCAG');
  });

  it('uses AAA level when specified', () => {
    const result = validateColorContrast('#000000', '#ffffff', { level: 'AAA' });
    expect(result.valid).toBe(true);
    expect(result.requiredRatio).toBe(7);
  });

  it('uses lower ratio for large text', () => {
    const result = validateColorContrast('#666666', '#ffffff', {
      fontSize: 24,
    });
    expect(result.requiredRatio).toBe(3);
  });

  it('uses 3:1 ratio for UI components', () => {
    const result = validateColorContrast('#666666', '#ffffff', {
      isUIComponent: true,
    });
    expect(result.requiredRatio).toBe(3);
  });
});

// ============================================================================
// findAccessibleColor
// ============================================================================
describe('findAccessibleColor', () => {
  it('returns a color meeting the target ratio', () => {
    const accessible = findAccessibleColor('#999999', '#ffffff');
    const ratio = getContrastRatio(accessible, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('throws for invalid color input', () => {
    expect(() => findAccessibleColor('invalid', '#ffffff')).toThrow('Invalid color format');
  });
});
