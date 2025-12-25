/**
 * @aivo/i18n React Hooks - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  I18nProvider,
  useTranslation,
  useLocale,
  useDateFormatter,
  useNumberFormatter,
  useRelativeTimeFormatter,
  useListFormatter,
  useDirectionStyles,
} from '../react';
import { createI18n } from '../core/i18n-manager';

// Mock i18n instance
const mockI18n = createI18n({
  defaultLocale: 'en',
  fallbackLocale: 'en',
});

// Wrapper component
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider i18n={mockI18n}>{children}</I18nProvider>
);

describe('useTranslation', () => {
  beforeEach(async () => {
    await mockI18n.loadTranslations('en', 'common', {
      hello: 'Hello',
      greeting: 'Hello, {name}!',
      items: '{count, plural, =0 {No items} one {# item} other {# items}}',
    });
  });

  it('should return translation function', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t('hello')).toBe('Hello');
  });

  it('should interpolate variables', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t('greeting', { name: 'World' })).toBe('Hello, World!');
  });

  it('should handle pluralization', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t('items', { count: 0 })).toBe('No items');
    expect(result.current.t('items', { count: 1 })).toBe('1 item');
    expect(result.current.t('items', { count: 5 })).toBe('5 items');
  });

  it('should provide locale information', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.locale).toBe('en');
    expect(result.current.isRTL).toBe(false);
  });
});

describe('useLocale', () => {
  it('should return current locale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper });

    expect(result.current.locale).toBe('en');
  });

  it('should provide changeLocale function', async () => {
    const { result } = renderHook(() => useLocale(), { wrapper });

    await act(async () => {
      await result.current.changeLocale('es');
    });

    expect(result.current.locale).toBe('es');
  });

  it('should return direction', () => {
    const { result } = renderHook(() => useLocale(), { wrapper });

    expect(result.current.direction).toBe('ltr');
  });
});

describe('useDateFormatter', () => {
  const testDate = new Date('2024-03-15T10:30:00Z');

  it('should format date', () => {
    const { result } = renderHook(() => useDateFormatter(), { wrapper });

    const formatted = result.current.format(testDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should accept options', () => {
    const { result } = renderHook(() => useDateFormatter({ dateStyle: 'long' }), { wrapper });

    const formatted = result.current.format(testDate);
    expect(formatted).toContain('March');
  });
});

describe('useNumberFormatter', () => {
  it('should format number', () => {
    const { result } = renderHook(() => useNumberFormatter(), { wrapper });

    const formatted = result.current.format(1234567);
    expect(formatted).toBe('1,234,567');
  });

  it('should accept options', () => {
    const { result } = renderHook(
      () =>
        useNumberFormatter({
          style: 'currency',
          currency: 'USD',
        }),
      { wrapper }
    );

    const formatted = result.current.format(1234.56);
    expect(formatted).toContain('$');
  });
});

describe('useRelativeTimeFormatter', () => {
  it('should format relative time', () => {
    const { result } = renderHook(() => useRelativeTimeFormatter(), { wrapper });

    const formatted = result.current.format(-1, 'day');
    expect(formatted).toMatch(/yesterday|1 day ago/i);
  });
});

describe('useListFormatter', () => {
  it('should format list', () => {
    const { result } = renderHook(() => useListFormatter(), { wrapper });

    const formatted = result.current.format(['a', 'b', 'c']);
    expect(formatted).toBe('a, b, and c');
  });
});

describe('useDirectionStyles', () => {
  it('should return LTR styles for English', () => {
    const { result } = renderHook(() => useDirectionStyles(), { wrapper });

    expect(result.current.direction).toBe('ltr');
    expect(result.current.start).toBe('left');
    expect(result.current.end).toBe('right');
  });

  it('should return correct padding helpers', () => {
    const { result } = renderHook(() => useDirectionStyles(), { wrapper });

    expect(result.current.paddingStart(10)).toEqual({ paddingLeft: 10 });
    expect(result.current.paddingEnd(10)).toEqual({ paddingRight: 10 });
  });
});
