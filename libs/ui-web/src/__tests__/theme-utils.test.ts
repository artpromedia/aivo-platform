import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  getThemeForGrade,
  getThemeIdForGrade,
  getThemeById,
  mergeThemeWithSensoryProfile,
  getContrastColor,
  getContrastRatio,
  meetsContrastRequirements,
  verifyThemeAccessibility,
  mergeThemeOverrides,
  getAvailableThemes,
  getThemeLabels,
} from '../themes/utils';

import {
  K5Theme,
  MSTheme,
  HSTheme,
  HSDarkTheme,
} from '../themes/grade-themes';

import type { SensoryProfile } from '../themes/grade-themes';

import {
  generateCSSVariables,
  generateCSSVariablesObject,
  hexToRgbChannels,
  colorToRgbChannels,
} from '../themes/css-variables';

describe('Theme Utilities', () => {
  describe('getThemeForGrade', () => {
    it('returns K5Theme for grades 0-5', () => {
      expect(getThemeForGrade(0)).toBe(K5Theme);
      expect(getThemeForGrade(1)).toBe(K5Theme);
      expect(getThemeForGrade(3)).toBe(K5Theme);
      expect(getThemeForGrade(5)).toBe(K5Theme);
    });

    it('returns MSTheme for grades 6-8', () => {
      expect(getThemeForGrade(6)).toBe(MSTheme);
      expect(getThemeForGrade(7)).toBe(MSTheme);
      expect(getThemeForGrade(8)).toBe(MSTheme);
    });

    it('returns HSTheme for grades 9-12', () => {
      expect(getThemeForGrade(9)).toBe(HSTheme);
      expect(getThemeForGrade(10)).toBe(HSTheme);
      expect(getThemeForGrade(11)).toBe(HSTheme);
      expect(getThemeForGrade(12)).toBe(HSTheme);
    });

    it('returns default theme for negative grades', () => {
      expect(getThemeForGrade(-1)).toBe(MSTheme);
    });
  });

  describe('getThemeIdForGrade', () => {
    it('returns correct theme ID for each grade range', () => {
      expect(getThemeIdForGrade(3)).toBe('K5');
      expect(getThemeIdForGrade(7)).toBe('MS');
      expect(getThemeIdForGrade(10)).toBe('HS');
    });
  });

  describe('getThemeById', () => {
    it('returns the correct theme for each ID', () => {
      expect(getThemeById('K5')).toBe(K5Theme);
      expect(getThemeById('MS')).toBe(MSTheme);
      expect(getThemeById('HS')).toBe(HSTheme);
      expect(getThemeById('HSDark')).toBe(HSDarkTheme);
    });
  });

  describe('getAvailableThemes', () => {
    it('returns all four themes', () => {
      const themes = getAvailableThemes();
      expect(themes).toHaveLength(4);
      expect(themes).toContain(K5Theme);
      expect(themes).toContain(MSTheme);
      expect(themes).toContain(HSTheme);
      expect(themes).toContain(HSDarkTheme);
    });
  });

  describe('getThemeLabels', () => {
    it('returns labels for all theme IDs', () => {
      const labels = getThemeLabels();
      expect(labels.K5).toBe('Explorer (K-5)');
      expect(labels.MS).toBe('Navigator (6-8)');
      expect(labels.HS).toBe('Scholar (9-12)');
      expect(labels.HSDark).toBe('Scholar Dark');
    });
  });
});

describe('Sensory Profile Integration', () => {
  describe('mergeThemeWithSensoryProfile', () => {
    it('applies high contrast colors when enabled', () => {
      const profile: SensoryProfile = { highContrast: true };
      const merged = mergeThemeWithSensoryProfile(K5Theme, profile);

      // High contrast should use the high contrast color overrides
      expect(merged.colors.primary).toBe(K5Theme.colorsHighContrast.primary);
      expect(merged.colors.text).toBe(K5Theme.colorsHighContrast.text);
    });

    it('applies dyslexia-friendly typography when enabled', () => {
      const profile: SensoryProfile = { dyslexia: true };
      const merged = mergeThemeWithSensoryProfile(MSTheme, profile);

      expect(merged.typography.fontFamily).toBe(MSTheme.typography.dyslexiaFontFamily);
      expect(merged.typography.letterSpacing).toBe('0.05em');
      expect(merged.typography.lineHeight).toBeGreaterThanOrEqual(1.8);
    });

    it('disables animations when reducedMotion is enabled', () => {
      const profile: SensoryProfile = { reducedMotion: true };
      const merged = mergeThemeWithSensoryProfile(K5Theme, profile);

      expect(merged.animations.style).toBe('none');
      expect(merged.animations.duration).toBe('0ms');
      expect(merged.animations.hoverScale).toBe('1');
      expect(merged.animations.pressScale).toBe('1');
      expect(merged.gamification.rewardAnimations).toBe(false);
    });

    it('scales font sizes when largeText is enabled', () => {
      const profile: SensoryProfile = { largeText: true };
      const merged = mergeThemeWithSensoryProfile(MSTheme, profile);

      // Font sizes should be scaled by 1.2
      const originalBody = parseInt(MSTheme.typography.fontSizes.body);
      const scaledBody = parseInt(merged.typography.fontSizes.body);
      expect(scaledBody).toBe(Math.round(originalBody * 1.2));
    });

    it('increases spacing when increasedSpacing is enabled', () => {
      const profile: SensoryProfile = { increasedSpacing: true };
      const merged = mergeThemeWithSensoryProfile(HSTheme, profile);

      expect(merged.spacing.scale).toBe(HSTheme.spacing.scale * 1.25);
    });

    it('handles multiple profile settings simultaneously', () => {
      const profile: SensoryProfile = {
        highContrast: true,
        dyslexia: true,
        reducedMotion: true,
      };
      const merged = mergeThemeWithSensoryProfile(K5Theme, profile);

      // All settings should be applied
      expect(merged.colors.primary).toBe(K5Theme.colorsHighContrast.primary);
      expect(merged.typography.fontFamily).toBe(K5Theme.typography.dyslexiaFontFamily);
      expect(merged.animations.duration).toBe('0ms');
    });
  });

  describe('mergeThemeOverrides', () => {
    it('merges custom color overrides', () => {
      const overrides = {
        colors: {
          primary: '#FF0000',
        },
      } as unknown as Partial<typeof MSTheme>;
      const merged = mergeThemeOverrides(MSTheme, overrides);

      expect(merged.colors.primary).toBe('#FF0000');
      // Other colors should remain unchanged
      expect(merged.colors.secondary).toBe(MSTheme.colors.secondary);
    });

    it('deep merges nested objects', () => {
      const overrides = {
        typography: {
          baseFontSize: '20px',
        },
      } as unknown as Partial<typeof K5Theme>;
      const merged = mergeThemeOverrides(K5Theme, overrides);

      expect(merged.typography.baseFontSize).toBe('20px');
      // Other typography settings should remain
      expect(merged.typography.fontFamily).toBe(K5Theme.typography.fontFamily);
    });
  });
});

describe('Color Utilities', () => {
  describe('hexToRgbChannels', () => {
    it('converts hex colors to RGB channels', () => {
      expect(hexToRgbChannels('#FF0000')).toBe('255 0 0');
      expect(hexToRgbChannels('#00FF00')).toBe('0 255 0');
      expect(hexToRgbChannels('#0000FF')).toBe('0 0 255');
      expect(hexToRgbChannels('#FFFFFF')).toBe('255 255 255');
      expect(hexToRgbChannels('#000000')).toBe('0 0 0');
    });

    it('handles hex without hash', () => {
      expect(hexToRgbChannels('FF6B6B')).toBe('255 107 107');
    });
  });

  describe('colorToRgbChannels', () => {
    it('handles hex colors', () => {
      expect(colorToRgbChannels('#4ECDC4')).toBe('78 205 196');
    });

    it('handles rgb() colors', () => {
      expect(colorToRgbChannels('rgb(255, 128, 64)')).toBe('255 128 64');
    });

    it('handles rgba() colors (ignores alpha)', () => {
      expect(colorToRgbChannels('rgba(100, 150, 200, 0.5)')).toBe('100 150 200');
    });
  });

  describe('getContrastColor', () => {
    it('returns white for dark backgrounds', () => {
      expect(getContrastColor('#000000')).toBe('#FFFFFF');
      expect(getContrastColor('#1A1A2E')).toBe('#FFFFFF');
      expect(getContrastColor('#2D3436')).toBe('#FFFFFF');
    });

    it('returns black for light backgrounds', () => {
      expect(getContrastColor('#FFFFFF')).toBe('#000000');
      expect(getContrastColor('#FFF9F0')).toBe('#000000');
      expect(getContrastColor('#F8FAFB')).toBe('#000000');
    });
  });

  describe('getContrastRatio', () => {
    it('calculates contrast ratio between colors', () => {
      // Black on white should be ~21:1
      const blackWhite = getContrastRatio('#000000', '#FFFFFF');
      expect(blackWhite).toBeCloseTo(21, 0);

      // Same color should be 1:1
      const same = getContrastRatio('#FF0000', '#FF0000');
      expect(same).toBeCloseTo(1, 1);
    });

    it('returns consistent ratio regardless of color order', () => {
      const ratio1 = getContrastRatio('#000000', '#FFFFFF');
      const ratio2 = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio1).toBeCloseTo(ratio2, 5);
    });
  });

  describe('meetsContrastRequirements', () => {
    it('returns true for sufficient contrast (normal text)', () => {
      // Black on white easily passes
      expect(meetsContrastRequirements('#000000', '#FFFFFF')).toBe(true);
    });

    it('returns false for insufficient contrast (normal text)', () => {
      // Light gray on white fails
      expect(meetsContrastRequirements('#AAAAAA', '#FFFFFF')).toBe(false);
    });

    it('has lower requirements for large text', () => {
      // Medium gray might fail for normal text but pass for large text
      const foreground = '#777777';
      const background = '#FFFFFF';

      // This might fail normal requirements but pass large text
      const ratio = getContrastRatio(foreground, background);
      const normalPass = ratio >= 4.5;
      const largePass = ratio >= 3;

      expect(meetsContrastRequirements(foreground, background, false)).toBe(normalPass);
      expect(meetsContrastRequirements(foreground, background, true)).toBe(largePass);
    });
  });

  describe('verifyThemeAccessibility', () => {
    it('validates K5Theme color combinations', () => {
      const result = verifyThemeAccessibility(K5Theme);
      // K5Theme should pass accessibility checks
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('validates MSTheme color combinations', () => {
      const result = verifyThemeAccessibility(MSTheme);
      expect(result.passed).toBe(true);
    });

    it('validates HSTheme color combinations', () => {
      const result = verifyThemeAccessibility(HSTheme);
      expect(result.passed).toBe(true);
    });

    it('reports issues for themes with poor contrast', () => {
      const badTheme = {
        ...MSTheme,
        colors: {
          ...MSTheme.colors,
          text: '#CCCCCC', // Light gray text on light background
          background: '#FFFFFF',
        },
      };
      const result = verifyThemeAccessibility(badTheme);
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});

describe('CSS Variables Generation', () => {
  describe('generateCSSVariablesObject', () => {
    it('generates all required CSS variables', () => {
      const vars = generateCSSVariablesObject(MSTheme);

      // Check color variables
      expect(vars['--color-primary']).toBeDefined();
      expect(vars['--color-secondary']).toBeDefined();
      expect(vars['--color-background']).toBeDefined();
      expect(vars['--color-text']).toBeDefined();

      // Check typography variables
      expect(vars['--font-family-default']).toBeDefined();
      expect(vars['--font-size-body']).toBeDefined();
      expect(vars['--line-height-body']).toBeDefined();

      // Check spacing variables
      expect(vars['--spacing-unit']).toBeDefined();
      expect(vars['--radius-button']).toBeDefined();

      // Check animation variables
      expect(vars['--animation-duration']).toBeDefined();
      expect(vars['--hover-scale']).toBeDefined();
    });

    it('applies sensory profile to generated variables', () => {
      const profile: SensoryProfile = { reducedMotion: true };
      const vars = generateCSSVariablesObject(MSTheme, profile);

      expect(vars['--animation-duration']).toBe('0ms');
      expect(vars['--hover-scale']).toBe('1');
    });

    it('generates different values for different themes', () => {
      const k5Vars = generateCSSVariablesObject(K5Theme);
      const hsVars = generateCSSVariablesObject(HSTheme);

      // K5 should have larger touch targets
      expect(k5Vars['--touch-target-min']).not.toBe(hsVars['--touch-target-min']);

      // K5 should have larger icons
      expect(k5Vars['--icon-size']).not.toBe(hsVars['--icon-size']);

      // K5 should have more rounded corners
      expect(k5Vars['--radius-button']).not.toBe(hsVars['--radius-button']);
    });
  });

  describe('generateCSSVariables', () => {
    it('generates a valid CSS string', () => {
      const css = generateCSSVariables(MSTheme);

      // Should be a string with CSS property declarations
      expect(typeof css).toBe('string');
      expect(css).toContain('--color-primary:');
      expect(css).toContain('--font-family-default:');
    });

    it('formats each variable on a new line', () => {
      const css = generateCSSVariables(K5Theme);
      const lines = css.split('\n');

      // Each line should be a CSS declaration
      lines.forEach((line) => {
        if (line.trim()) {
          expect(line.trim()).toMatch(/^--[\w-]+:.+;$/);
        }
      });
    });
  });
});

describe('Theme Structure', () => {
  const themes = [K5Theme, MSTheme, HSTheme, HSDarkTheme];

  themes.forEach((theme) => {
    describe(`${theme.name} Theme`, () => {
      it('has all required color properties', () => {
        expect(theme.colors.primary).toBeDefined();
        expect(theme.colors.secondary).toBeDefined();
        expect(theme.colors.accent).toBeDefined();
        expect(theme.colors.background).toBeDefined();
        expect(theme.colors.surface).toBeDefined();
        expect(theme.colors.text).toBeDefined();
        expect(theme.colors.textMuted).toBeDefined();
        expect(theme.colors.success).toBeDefined();
        expect(theme.colors.warning).toBeDefined();
        expect(theme.colors.error).toBeDefined();
        expect(theme.colors.info).toBeDefined();
      });

      it('has all required typography properties', () => {
        expect(theme.typography.fontFamily).toBeDefined();
        expect(theme.typography.baseFontSize).toBeDefined();
        expect(theme.typography.fontSizes).toBeDefined();
        expect(theme.typography.lineHeights).toBeDefined();
      });

      it('has all required spacing properties', () => {
        expect(theme.spacing.unit).toBeDefined();
        expect(theme.spacing.buttonPadding).toBeDefined();
        expect(theme.spacing.cardPadding).toBeDefined();
        expect(theme.spacing.buttonBorderRadius).toBeDefined();
      });

      it('has all required animation properties', () => {
        expect(theme.animations.duration).toBeDefined();
        expect(theme.animations.easing).toBeDefined();
        expect(theme.animations.hoverScale).toBeDefined();
      });

      it('has all required component properties', () => {
        expect(theme.components.buttonVariant).toBeDefined();
        expect(theme.components.cardShadow).toBeDefined();
        expect(theme.components.touchTargetMin).toBeDefined();
      });

      it('has high contrast color overrides', () => {
        expect(theme.colorsHighContrast).toBeDefined();
        expect(theme.colorsHighContrast.primary).toBeDefined();
      });
    });
  });
});
