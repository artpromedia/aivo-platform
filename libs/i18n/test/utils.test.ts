import { describe, it, expect } from 'vitest';
import {
  isRTLLocale,
  getLocaleDirection,
  normalizeLocale,
  getSupportedLocale,
  formatMessageWithValues,
  interpolateMessage,
  getCurrencyForLocale,
  parseLocale,
  areLocalesCompatible,
  sortLocalesByName,
  groupLocalesByRegion,
} from '../src/utils/index.js';

// ============================================================================
// isRTLLocale
// ============================================================================
describe('isRTLLocale', () => {
  it('returns true for Arabic', () => {
    expect(isRTLLocale('ar')).toBe(true);
  });

  it('returns true for Hebrew', () => {
    expect(isRTLLocale('he')).toBe(true);
  });

  it('returns true for Persian', () => {
    expect(isRTLLocale('fa')).toBe(true);
  });

  it('returns true for Urdu', () => {
    expect(isRTLLocale('ur')).toBe(true);
  });

  it('returns false for English', () => {
    expect(isRTLLocale('en')).toBe(false);
  });

  it('returns false for French', () => {
    expect(isRTLLocale('fr')).toBe(false);
  });
});

// ============================================================================
// getLocaleDirection
// ============================================================================
describe('getLocaleDirection', () => {
  it('returns rtl for Arabic', () => {
    expect(getLocaleDirection('ar')).toBe('rtl');
  });

  it('returns ltr for English', () => {
    expect(getLocaleDirection('en')).toBe('ltr');
  });

  it('returns ltr for Japanese', () => {
    expect(getLocaleDirection('ja')).toBe('ltr');
  });
});

// ============================================================================
// normalizeLocale
// ============================================================================
describe('normalizeLocale', () => {
  it('returns exact match for supported locale', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('fr')).toBe('fr');
  });

  it('normalizes case for region codes', () => {
    expect(normalizeLocale('pt-br')).toBe('pt-BR');
    expect(normalizeLocale('en-gb')).toBe('en-GB');
  });

  it('replaces underscores with dashes', () => {
    expect(normalizeLocale('pt_BR')).toBe('pt-BR');
  });

  it('falls back to base language', () => {
    expect(normalizeLocale('fr-FR')).toBe('fr');
  });

  it('returns null for unsupported locales', () => {
    expect(normalizeLocale('xx')).toBeNull();
    expect(normalizeLocale('klingon')).toBeNull();
  });
});

// ============================================================================
// getSupportedLocale
// ============================================================================
describe('getSupportedLocale', () => {
  it('returns first matching supported locale', () => {
    expect(getSupportedLocale(['fr', 'en'])).toBe('fr');
  });

  it('skips unsupported locales', () => {
    expect(getSupportedLocale(['xx', 'yy', 'es'])).toBe('es');
  });

  it('returns default locale when none match', () => {
    expect(getSupportedLocale(['xx', 'yy'])).toBe('en');
  });

  it('returns default locale for empty list', () => {
    expect(getSupportedLocale([])).toBe('en');
  });
});

// ============================================================================
// formatMessageWithValues
// ============================================================================
describe('formatMessageWithValues', () => {
  it('replaces placeholders with values', () => {
    expect(formatMessageWithValues('Hello, {name}!', { name: 'World' })).toBe('Hello, World!');
  });

  it('replaces multiple placeholders', () => {
    expect(
      formatMessageWithValues('{greeting}, {name}!', {
        greeting: 'Hi',
        name: 'Alice',
      })
    ).toBe('Hi, Alice!');
  });

  it('handles numeric values', () => {
    expect(formatMessageWithValues('You have {count} items', { count: 5 })).toBe(
      'You have 5 items'
    );
  });

  it('leaves unmatched placeholders intact', () => {
    expect(formatMessageWithValues('Hello, {name}!', {})).toBe('Hello, {name}!');
  });

  it('handles string with no placeholders', () => {
    expect(formatMessageWithValues('No placeholders', { key: 'val' })).toBe('No placeholders');
  });
});

// ============================================================================
// interpolateMessage
// ============================================================================
describe('interpolateMessage', () => {
  it('replaces simple placeholders', () => {
    expect(interpolateMessage('Hi {name}', { name: 'Bob' })).toBe('Hi Bob');
  });

  it('returns message unchanged when no values provided', () => {
    expect(interpolateMessage('Hello world')).toBe('Hello world');
  });

  it('leaves unmatched keys unchanged', () => {
    expect(interpolateMessage('{unknown} key', {})).toBe('{unknown} key');
  });
});

// ============================================================================
// getCurrencyForLocale
// ============================================================================
describe('getCurrencyForLocale', () => {
  it('returns USD for en', () => {
    expect(getCurrencyForLocale('en')).toBe('USD');
  });

  it('returns a valid currency code', () => {
    const currency = getCurrencyForLocale('ja');
    expect(typeof currency).toBe('string');
    expect(currency.length).toBe(3);
  });
});

// ============================================================================
// parseLocale
// ============================================================================
describe('parseLocale', () => {
  it('parses simple language code', () => {
    expect(parseLocale('en')).toEqual({ language: 'en' });
  });

  it('parses language + region', () => {
    expect(parseLocale('en-US')).toEqual({ language: 'en', region: 'US' });
  });

  it('parses language + script + region', () => {
    const result = parseLocale('zh-Hans-CN');
    expect(result.language).toBe('zh');
    expect(result.script).toBe('Hans');
    expect(result.region).toBe('CN');
  });

  it('normalizes language to lowercase', () => {
    expect(parseLocale('EN').language).toBe('en');
  });
});

// ============================================================================
// areLocalesCompatible
// ============================================================================
describe('areLocalesCompatible', () => {
  it('returns true for same base language', () => {
    expect(areLocalesCompatible('en-US', 'en-GB')).toBe(true);
  });

  it('returns false for different languages', () => {
    expect(areLocalesCompatible('en', 'fr')).toBe(false);
  });

  it('returns true for exact same locale', () => {
    expect(areLocalesCompatible('de', 'de')).toBe(true);
  });
});

// ============================================================================
// sortLocalesByName
// ============================================================================
describe('sortLocalesByName', () => {
  it('returns sorted array without modifying original', () => {
    const original = ['fr', 'en', 'de'] as const;
    const sorted = sortLocalesByName([...original]);
    expect(sorted).not.toBe(original);
    expect(sorted.length).toBe(3);
  });

  it('sorts by native name', () => {
    const sorted = sortLocalesByName(['fr', 'de', 'en']);
    // The sort order depends on native names in LOCALE_METADATA
    expect(sorted.length).toBe(3);
  });
});

// ============================================================================
// groupLocalesByRegion
// ============================================================================
describe('groupLocalesByRegion', () => {
  it('groups locales by their region metadata', () => {
    const groups = groupLocalesByRegion(['en', 'fr', 'de']);
    const regionNames = Object.keys(groups);
    expect(regionNames.length).toBeGreaterThan(0);

    // Each region should have at least one locale
    for (const region of regionNames) {
      expect(groups[region].length).toBeGreaterThan(0);
    }
  });

  it('returns empty object for empty input', () => {
    expect(groupLocalesByRegion([])).toEqual({});
  });
});
