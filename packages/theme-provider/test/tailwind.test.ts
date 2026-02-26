/**
 * Theme Provider — Tailwind Helpers Tests
 *
 * Tests for Tailwind CSS v4 color, font, and radius helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  aivoThemeColors,
  aivoThemeFonts,
  aivoThemeRadius,
  aivoThemeExtension,
} from '../src/tailwind';

// =============================================================================
// aivoThemeColors
// =============================================================================

describe('aivoThemeColors', () => {
  it('should define all brand colors', () => {
    expect(aivoThemeColors.brand).toBeDefined();
    expect(aivoThemeColors.brand.primary).toBeDefined();
    expect(aivoThemeColors.brand.secondary).toBeDefined();
    expect(aivoThemeColors.brand.accent).toBeDefined();
    expect(aivoThemeColors.brand.background).toBeDefined();
    expect(aivoThemeColors.brand.surface).toBeDefined();
    expect(aivoThemeColors.brand.text).toBeDefined();
    expect(aivoThemeColors.brand['text-on-primary']).toBeDefined();
    expect(aivoThemeColors.brand.muted).toBeDefined();
    expect(aivoThemeColors.brand.border).toBeDefined();
  });

  it('should use CSS custom properties with alpha channel support', () => {
    expect(aivoThemeColors.brand.primary).toContain('var(--aivo-color-primary)');
    expect(aivoThemeColors.brand.primary).toContain('<alpha-value>');
    expect(aivoThemeColors.brand.primary).toMatch(/^rgb\(var\(--aivo-color-primary\) \/ <alpha-value>\)$/);
  });

  it('should reference correct CSS variable for each color', () => {
    expect(aivoThemeColors.brand.secondary).toContain('--aivo-color-secondary');
    expect(aivoThemeColors.brand.accent).toContain('--aivo-color-accent');
    expect(aivoThemeColors.brand.background).toContain('--aivo-color-background');
    expect(aivoThemeColors.brand.surface).toContain('--aivo-color-surface');
    expect(aivoThemeColors.brand.text).toContain('--aivo-color-text');
    expect(aivoThemeColors.brand.muted).toContain('--aivo-color-muted');
    expect(aivoThemeColors.brand.border).toContain('--aivo-color-border');
  });

  it('should have exactly 9 brand colors', () => {
    expect(Object.keys(aivoThemeColors.brand)).toHaveLength(9);
  });
});

// =============================================================================
// aivoThemeFonts
// =============================================================================

describe('aivoThemeFonts', () => {
  it('should define brand font family', () => {
    expect(aivoThemeFonts.brand).toBe('var(--aivo-font-family)');
  });

  it('should reference CSS custom property', () => {
    expect(aivoThemeFonts.brand).toMatch(/^var\(--aivo-font-family\)$/);
  });
});

// =============================================================================
// aivoThemeRadius
// =============================================================================

describe('aivoThemeRadius', () => {
  it('should define brand border radius', () => {
    expect(aivoThemeRadius.brand).toBe('var(--aivo-border-radius)');
  });

  it('should reference CSS custom property', () => {
    expect(aivoThemeRadius.brand).toMatch(/^var\(--aivo-border-radius\)$/);
  });
});

// =============================================================================
// aivoThemeExtension
// =============================================================================

describe('aivoThemeExtension', () => {
  it('should combine colors, fonts, and border radius', () => {
    expect(aivoThemeExtension.colors).toBe(aivoThemeColors);
    expect(aivoThemeExtension.fontFamily).toBe(aivoThemeFonts);
    expect(aivoThemeExtension.borderRadius).toBe(aivoThemeRadius);
  });

  it('should have exactly 3 keys', () => {
    expect(Object.keys(aivoThemeExtension)).toHaveLength(3);
    expect(Object.keys(aivoThemeExtension)).toEqual(
      expect.arrayContaining(['colors', 'fontFamily', 'borderRadius']),
    );
  });

  it('should be usable as a Tailwind theme extension', () => {
    // Simulate tailwind.config.ts usage
    const config = {
      theme: {
        extend: { ...aivoThemeExtension },
      },
    };
    expect(config.theme.extend.colors.brand.primary).toBeDefined();
    expect(config.theme.extend.fontFamily.brand).toBeDefined();
    expect(config.theme.extend.borderRadius.brand).toBeDefined();
  });
});
