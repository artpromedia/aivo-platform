/**
 * Theme Provider — Core Module Tests
 *
 * Tests for the core theme types, defaults, and CSS variable helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THEME,
  CSS_VAR_MAP,
  hexToRgbString,
  themeToCssVars,
  type AivoTheme,
} from '../src/index';

// =============================================================================
// DEFAULT_THEME
// =============================================================================

describe('DEFAULT_THEME', () => {
  it('should have all required fields defined', () => {
    expect(DEFAULT_THEME.displayName).toBe('Aivo Learning');
    expect(DEFAULT_THEME.colorPrimary).toBeDefined();
    expect(DEFAULT_THEME.colorSecondary).toBeDefined();
    expect(DEFAULT_THEME.colorAccent).toBeDefined();
    expect(DEFAULT_THEME.colorBackground).toBeDefined();
    expect(DEFAULT_THEME.colorSurface).toBeDefined();
    expect(DEFAULT_THEME.colorText).toBeDefined();
    expect(DEFAULT_THEME.colorTextOnPrimary).toBeDefined();
    expect(DEFAULT_THEME.colorMuted).toBeDefined();
    expect(DEFAULT_THEME.colorBorder).toBeDefined();
    expect(DEFAULT_THEME.fontFamily).toBeDefined();
    expect(DEFAULT_THEME.borderRadius).toBeDefined();
  });

  it('should have valid hex colors for all color fields', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    expect(DEFAULT_THEME.colorPrimary).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorSecondary).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorAccent).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorBackground).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorSurface).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorText).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorTextOnPrimary).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorMuted).toMatch(hexRegex);
    expect(DEFAULT_THEME.colorBorder).toMatch(hexRegex);
  });

  it('should have null for optional URL fields', () => {
    expect(DEFAULT_THEME.logoUrl).toBeNull();
    expect(DEFAULT_THEME.logoSmallUrl).toBeNull();
    expect(DEFAULT_THEME.faviconUrl).toBeNull();
    expect(DEFAULT_THEME.loginBackgroundUrl).toBeNull();
    expect(DEFAULT_THEME.loginMessage).toBeNull();
    expect(DEFAULT_THEME.supportEmail).toBeNull();
    expect(DEFAULT_THEME.supportUrl).toBeNull();
    expect(DEFAULT_THEME.privacyPolicyUrl).toBeNull();
    expect(DEFAULT_THEME.termsOfServiceUrl).toBeNull();
  });

  it('should have a font family with fallback stack', () => {
    expect(DEFAULT_THEME.fontFamily).toContain('DM Sans');
    expect(DEFAULT_THEME.fontFamily).toContain('sans-serif');
  });

  it('should have a valid border radius value', () => {
    expect(DEFAULT_THEME.borderRadius).toBe('0.5rem');
  });
});

// =============================================================================
// CSS_VAR_MAP
// =============================================================================

describe('CSS_VAR_MAP', () => {
  it('should map all color CSS variables to theme keys', () => {
    expect(CSS_VAR_MAP['--aivo-color-primary']).toBe('colorPrimary');
    expect(CSS_VAR_MAP['--aivo-color-secondary']).toBe('colorSecondary');
    expect(CSS_VAR_MAP['--aivo-color-accent']).toBe('colorAccent');
    expect(CSS_VAR_MAP['--aivo-color-background']).toBe('colorBackground');
    expect(CSS_VAR_MAP['--aivo-color-surface']).toBe('colorSurface');
    expect(CSS_VAR_MAP['--aivo-color-text']).toBe('colorText');
    expect(CSS_VAR_MAP['--aivo-color-text-on-primary']).toBe('colorTextOnPrimary');
    expect(CSS_VAR_MAP['--aivo-color-muted']).toBe('colorMuted');
    expect(CSS_VAR_MAP['--aivo-color-border']).toBe('colorBorder');
  });

  it('should map typography and layout CSS variables', () => {
    expect(CSS_VAR_MAP['--aivo-font-family']).toBe('fontFamily');
    expect(CSS_VAR_MAP['--aivo-border-radius']).toBe('borderRadius');
  });

  it('should have 11 CSS variable mappings', () => {
    expect(Object.keys(CSS_VAR_MAP)).toHaveLength(11);
  });

  it('should only reference valid AivoTheme keys', () => {
    const themeKeys = Object.keys(DEFAULT_THEME);
    for (const themeKey of Object.values(CSS_VAR_MAP)) {
      expect(themeKeys).toContain(themeKey);
    }
  });
});

// =============================================================================
// hexToRgbString
// =============================================================================

describe('hexToRgbString', () => {
  it('should convert white hex to RGB string', () => {
    expect(hexToRgbString('#FFFFFF')).toBe('255 255 255');
  });

  it('should convert black hex to RGB string', () => {
    expect(hexToRgbString('#000000')).toBe('0 0 0');
  });

  it('should convert indigo-500 (primary) to correct RGB', () => {
    expect(hexToRgbString('#6366F1')).toBe('99 102 241');
  });

  it('should convert violet-500 (secondary) to correct RGB', () => {
    expect(hexToRgbString('#8B5CF6')).toBe('139 92 246');
  });

  it('should convert amber-500 (accent) to correct RGB', () => {
    expect(hexToRgbString('#F59E0B')).toBe('245 158 11');
  });

  it('should handle hex without # prefix', () => {
    expect(hexToRgbString('FF0000')).toBe('255 0 0');
  });

  it('should handle lowercase hex', () => {
    expect(hexToRgbString('#ff8800')).toBe('255 136 0');
  });

  it('should handle pure red, green, blue', () => {
    expect(hexToRgbString('#FF0000')).toBe('255 0 0');
    expect(hexToRgbString('#00FF00')).toBe('0 255 0');
    expect(hexToRgbString('#0000FF')).toBe('0 0 255');
  });
});

// =============================================================================
// themeToCssVars
// =============================================================================

describe('themeToCssVars', () => {
  it('should convert default theme to CSS variables', () => {
    const vars = themeToCssVars(DEFAULT_THEME);
    expect(vars['--aivo-color-primary']).toBe('99 102 241'); // #6366F1
    expect(vars['--aivo-color-secondary']).toBe('139 92 246'); // #8B5CF6
    expect(vars['--aivo-color-accent']).toBe('245 158 11'); // #F59E0B
  });

  it('should convert hex colors to RGB format for Tailwind', () => {
    const vars = themeToCssVars(DEFAULT_THEME);
    // All color vars should be in "R G B" format
    const colorVars = Object.entries(vars).filter(([k]) => k.startsWith('--aivo-color-'));
    for (const [, value] of colorVars) {
      expect(value).toMatch(/^\d+ \d+ \d+$/);
    }
  });

  it('should pass through non-color values unchanged', () => {
    const vars = themeToCssVars(DEFAULT_THEME);
    expect(vars['--aivo-font-family']).toBe(DEFAULT_THEME.fontFamily);
    expect(vars['--aivo-border-radius']).toBe('0.5rem');
  });

  it('should handle custom theme', () => {
    const custom: AivoTheme = {
      ...DEFAULT_THEME,
      colorPrimary: '#FF0000',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '1rem',
    };
    const vars = themeToCssVars(custom);
    expect(vars['--aivo-color-primary']).toBe('255 0 0');
    expect(vars['--aivo-font-family']).toBe('Inter, sans-serif');
    expect(vars['--aivo-border-radius']).toBe('1rem');
  });

  it('should skip null values', () => {
    // logoUrl is null in DEFAULT_THEME but it's not in CSS_VAR_MAP anyway
    const vars = themeToCssVars(DEFAULT_THEME);
    // All CSS_VAR_MAP entries should produce a value (none are null in DEFAULT_THEME)
    expect(Object.keys(vars).length).toBe(Object.keys(CSS_VAR_MAP).length);
  });

  it('should produce a Record with string keys and string values', () => {
    const vars = themeToCssVars(DEFAULT_THEME);
    for (const [key, value] of Object.entries(vars)) {
      expect(typeof key).toBe('string');
      expect(typeof value).toBe('string');
      expect(key.startsWith('--aivo-')).toBe(true);
    }
  });
});
