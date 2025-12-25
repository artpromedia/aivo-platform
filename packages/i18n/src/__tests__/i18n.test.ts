/**
 * @aivo/i18n - Unit Tests
 *
 * Tests for the core i18n functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  I18nManager,
  createI18n,
  isRTLLocale,
  parseLocale,
  getBestMatchingLocale,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  formatList,
} from '../src';
import type { SupportedLocale, I18nConfig } from '../src/types';

describe('I18nManager', () => {
  let i18n: I18nManager;

  beforeEach(() => {
    i18n = createI18n({
      defaultLocale: 'en',
      fallbackLocale: 'en',
    });
  });

  describe('initialization', () => {
    it('should initialize with default locale', () => {
      expect(i18n.getLocale()).toBe('en');
    });

    it('should allow changing locale', async () => {
      await i18n.changeLocale('es');
      expect(i18n.getLocale()).toBe('es');
    });

    it('should emit locale change events', async () => {
      const listener = vi.fn();
      i18n.onLocaleChange(listener);

      await i18n.changeLocale('es');

      expect(listener).toHaveBeenCalledWith('es');
    });
  });

  describe('translation', () => {
    beforeEach(async () => {
      await i18n.loadTranslations('en', 'common', {
        greeting: 'Hello, {name}!',
        items: '{count, plural, =0 {No items} one {# item} other {# items}}',
        nested: {
          key: 'Nested value',
        },
      });
    });

    it('should translate simple keys', () => {
      expect(i18n.t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should handle nested keys', () => {
      expect(i18n.t('nested.key')).toBe('Nested value');
    });

    it('should handle pluralization', () => {
      expect(i18n.t('items', { count: 0 })).toBe('No items');
      expect(i18n.t('items', { count: 1 })).toBe('1 item');
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });

    it('should return key when translation not found', () => {
      expect(i18n.t('unknown.key')).toBe('unknown.key');
    });

    it('should fallback to default locale', async () => {
      await i18n.changeLocale('es');
      expect(i18n.t('greeting', { name: 'Mundo' })).toBe('Hello, Mundo!');
    });
  });

  describe('namespaces', () => {
    it('should load and use namespaces', async () => {
      await i18n.loadTranslations('en', 'auth', {
        login: 'Sign In',
        logout: 'Sign Out',
      });

      expect(i18n.t('login', {}, { namespace: 'auth' })).toBe('Sign In');
    });
  });
});

describe('Locale Utils', () => {
  describe('isRTLLocale', () => {
    it('should identify RTL locales', () => {
      expect(isRTLLocale('ar')).toBe(true);
      expect(isRTLLocale('ar-SA')).toBe(true);
      expect(isRTLLocale('he')).toBe(true);
    });

    it('should identify LTR locales', () => {
      expect(isRTLLocale('en')).toBe(false);
      expect(isRTLLocale('es')).toBe(false);
      expect(isRTLLocale('zh-CN')).toBe(false);
    });
  });

  describe('parseLocale', () => {
    it('should parse simple locale', () => {
      const result = parseLocale('en');
      expect(result.language).toBe('en');
      expect(result.region).toBeUndefined();
    });

    it('should parse locale with region', () => {
      const result = parseLocale('en-US');
      expect(result.language).toBe('en');
      expect(result.region).toBe('US');
    });

    it('should parse locale with script', () => {
      const result = parseLocale('zh-Hans-CN');
      expect(result.language).toBe('zh');
      expect(result.script).toBe('Hans');
      expect(result.region).toBe('CN');
    });
  });

  describe('getBestMatchingLocale', () => {
    const supported: SupportedLocale[] = ['en', 'en-US', 'en-GB', 'es', 'es-MX', 'ar'];

    it('should return exact match', () => {
      expect(getBestMatchingLocale('en-US', supported)).toBe('en-US');
    });

    it('should fallback to base language', () => {
      expect(getBestMatchingLocale('en-AU', supported)).toBe('en');
    });

    it('should return default for unsupported', () => {
      expect(getBestMatchingLocale('fr', supported, 'en')).toBe('en');
    });
  });
});

describe('Date Formatter', () => {
  const date = new Date('2024-03-15T10:30:00Z');

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const result = formatDate(date, 'en-US');
      expect(result).toMatch(/March|Mar|3/);
    });

    it('should format date with short style', () => {
      const result = formatDate(date, 'en-US', { style: 'short' });
      expect(result).toMatch(/\d+\/\d+\/\d+/);
    });

    it('should format date with long style', () => {
      const result = formatDate(date, 'en-US', { style: 'long' });
      expect(result).toContain('March');
    });

    it('should format date in different locales', () => {
      const enResult = formatDate(date, 'en-US');
      const deResult = formatDate(date, 'de');
      expect(enResult).not.toBe(deResult);
    });
  });
});

describe('Number Formatter', () => {
  describe('formatNumber', () => {
    it('should format integer', () => {
      const result = formatNumber(1234567, 'en-US');
      expect(result).toBe('1,234,567');
    });

    it('should format decimal', () => {
      const result = formatNumber(1234.56, 'en-US', { maximumFractionDigits: 2 });
      expect(result).toBe('1,234.56');
    });

    it('should format in different locales', () => {
      const enResult = formatNumber(1234.56, 'en-US');
      const deResult = formatNumber(1234.56, 'de');
      expect(enResult).not.toBe(deResult);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD', () => {
      const result = formatCurrency(1234.56, 'en-US', 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format EUR', () => {
      const result = formatCurrency(1234.56, 'de', 'EUR');
      expect(result).toContain('€');
    });
  });
});

describe('Relative Time Formatter', () => {
  describe('formatRelativeTime', () => {
    it('should format past time', () => {
      const result = formatRelativeTime(-1, 'day', 'en-US');
      expect(result).toMatch(/yesterday|1 day ago/i);
    });

    it('should format future time', () => {
      const result = formatRelativeTime(1, 'day', 'en-US');
      expect(result).toMatch(/tomorrow|in 1 day/i);
    });

    it('should format hours', () => {
      const result = formatRelativeTime(-2, 'hour', 'en-US');
      expect(result).toMatch(/2 hours? ago/i);
    });
  });
});

describe('List Formatter', () => {
  describe('formatList', () => {
    it('should format conjunction list', () => {
      const result = formatList(['apple', 'banana', 'orange'], 'en-US', 'conjunction');
      expect(result).toBe('apple, banana, and orange');
    });

    it('should format disjunction list', () => {
      const result = formatList(['apple', 'banana', 'orange'], 'en-US', 'disjunction');
      expect(result).toBe('apple, banana, or orange');
    });

    it('should format unit list', () => {
      const result = formatList(['apple', 'banana'], 'en-US', 'unit');
      expect(result).toMatch(/apple.*banana/);
    });

    it('should handle single item', () => {
      const result = formatList(['apple'], 'en-US', 'conjunction');
      expect(result).toBe('apple');
    });

    it('should handle empty list', () => {
      const result = formatList([], 'en-US', 'conjunction');
      expect(result).toBe('');
    });
  });
});
