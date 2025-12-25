/**
 * I18n React Hooks
 *
 * Custom hooks for translation, formatting, and locale management.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';

import {
  formatDate,
  formatTime,
  formatDateRange,
  getMonthNames,
  getWeekdayNames,
} from '../formatters/date-formatter';
import { formatList, formatConjunction, formatDisjunction } from '../formatters/list-formatter';
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatUnit,
  formatFileSize,
} from '../formatters/number-formatter';
import {
  formatRelativeDate,
  formatTimeAgo,
  formatSmartRelative,
} from '../formatters/relative-time';
import type { SupportedLocale, TFunction, TranslationNamespace } from '../types';

import { useI18nContext } from './provider';

/**
 * Main translation hook
 */
export function useTranslation(namespace?: TranslationNamespace): {
  t: TFunction;
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  isLoading: boolean;
} {
  const { t, locale, direction, isLoading, loadNamespace, i18n } = useI18nContext();
  const [namespaceLoaded, setNamespaceLoaded] = useState(!namespace);

  // Load namespace if specified
  useEffect(() => {
    if (namespace && !namespaceLoaded) {
      loadNamespace(namespace).then(() => {
        setNamespaceLoaded(true);
      });
    }
  }, [namespace, namespaceLoaded, loadNamespace]);

  // Create namespaced t function
  const namespacedT = useCallback<TFunction>(
    (key, options) => {
      return t(key, { ...options, ns: namespace ?? options?.ns });
    },
    [t, namespace]
  );

  return {
    t: namespacedT,
    locale,
    direction,
    isLoading: isLoading || !namespaceLoaded,
  };
}

/**
 * Hook for locale management
 */
export function useLocale(): {
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  supportedLocales: SupportedLocale[];
  isRTL: boolean;
  metadata: ReturnType<typeof useI18nContext>['getLocaleMetadata'];
} {
  const { locale, direction, changeLocale, supportedLocales, getLocaleMetadata } = useI18nContext();

  return {
    locale,
    direction,
    changeLocale,
    supportedLocales,
    isRTL: direction === 'rtl',
    metadata: getLocaleMetadata(),
  };
}

/**
 * Hook for date formatting
 */
export function useDateFormatter() {
  const { locale } = useI18nContext();

  return useMemo(
    () => ({
      formatDate: (date: Date | number | string, options?: Parameters<typeof formatDate>[2]) =>
        formatDate(date, locale, options),

      formatTime: (date: Date | number | string, style?: 'short' | 'medium' | 'long') =>
        formatTime(date, locale, style),

      formatRange: (
        start: Date | number | string,
        end: Date | number | string,
        options?: Parameters<typeof formatDateRange>[3]
      ) => formatDateRange(start, end, locale, options),

      monthNames: (style?: 'long' | 'short' | 'narrow') => getMonthNames(locale, style),

      weekdayNames: (style?: 'long' | 'short' | 'narrow') => getWeekdayNames(locale, style),
    }),
    [locale]
  );
}

/**
 * Hook for number formatting
 */
export function useNumberFormatter() {
  const { locale } = useI18nContext();

  return useMemo(
    () => ({
      formatNumber: (value: number, options?: Parameters<typeof formatNumber>[2]) =>
        formatNumber(value, locale, options),

      formatCurrency: (
        value: number,
        currency?: string,
        options?: Parameters<typeof formatCurrency>[3]
      ) => formatCurrency(value, locale, currency, options),

      formatPercent: (value: number, options?: Parameters<typeof formatPercent>[2]) =>
        formatPercent(value, locale, options),

      formatCompact: (value: number, options?: Parameters<typeof formatCompact>[2]) =>
        formatCompact(value, locale, options),

      formatUnit: (value: number, unit: string, options?: Parameters<typeof formatUnit>[3]) =>
        formatUnit(value, unit, locale, options),

      formatFileSize: (bytes: number, options?: Parameters<typeof formatFileSize>[2]) =>
        formatFileSize(bytes, locale, options),
    }),
    [locale]
  );
}

/**
 * Hook for relative time formatting
 */
export function useRelativeTimeFormatter() {
  const { locale } = useI18nContext();

  return useMemo(
    () => ({
      formatRelative: (
        date: Date | number | string,
        options?: Parameters<typeof formatRelativeDate>[2]
      ) => formatRelativeDate(date, locale, options),

      formatTimeAgo: (
        date: Date | number | string,
        options?: Parameters<typeof formatTimeAgo>[2]
      ) => formatTimeAgo(date, locale, options),

      formatSmart: (
        date: Date | number | string,
        options?: Parameters<typeof formatSmartRelative>[2]
      ) => formatSmartRelative(date, locale, options),
    }),
    [locale]
  );
}

/**
 * Hook for list formatting
 */
export function useListFormatter() {
  const { locale } = useI18nContext();

  return useMemo(
    () => ({
      formatList: (items: string[], options?: Parameters<typeof formatList>[2]) =>
        formatList(items, locale, options),

      formatAnd: (items: string[], style?: 'long' | 'short' | 'narrow') =>
        formatConjunction(items, locale, style),

      formatOr: (items: string[], style?: 'long' | 'short' | 'narrow') =>
        formatDisjunction(items, locale, style),
    }),
    [locale]
  );
}

/**
 * Combined hook for all formatters
 */
export function useFormatters() {
  const date = useDateFormatter();
  const number = useNumberFormatter();
  const relativeTime = useRelativeTimeFormatter();
  const list = useListFormatter();

  return { date, number, relativeTime, list };
}

/**
 * Hook for direction-aware styles
 */
export function useDirectionStyles<T extends Record<string, any>>(
  ltrStyles: T,
  rtlStyles?: Partial<T>
): T {
  const { direction } = useI18nContext();

  return useMemo(() => {
    if (direction === 'rtl' && rtlStyles) {
      return { ...ltrStyles, ...rtlStyles };
    }
    return ltrStyles;
  }, [direction, ltrStyles, rtlStyles]);
}

/**
 * Hook for direction-aware values
 */
export function useDirectionValue<T>(ltrValue: T, rtlValue: T): T {
  const { direction } = useI18nContext();
  return direction === 'rtl' ? rtlValue : ltrValue;
}

/**
 * Hook for plural-aware translation
 */
export function usePlural() {
  const { t, locale } = useI18nContext();

  return useCallback(
    (key: string, count: number, options?: Record<string, any>): string => {
      return t(key, { ...options, count });
    },
    [t, locale]
  );
}

/**
 * Hook for checking translation existence
 */
export function useTranslationExists() {
  const { i18n } = useI18nContext();

  return useCallback(
    (key: string, namespace?: TranslationNamespace): boolean => {
      return i18n.exists(key, namespace);
    },
    [i18n]
  );
}

/**
 * Hook for auto-updating relative time
 */
export function useLiveRelativeTime(
  date: Date | number | string,
  options?: {
    interval?: number;
    maxUpdates?: number;
  }
): string {
  const { locale } = useI18nContext();
  const [, forceUpdate] = useState({});
  const { interval = 60000, maxUpdates = 60 } = options ?? {};

  useEffect(() => {
    let updates = 0;

    const timer = setInterval(() => {
      updates++;
      if (updates >= maxUpdates) {
        clearInterval(timer);
      } else {
        forceUpdate({});
      }
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [interval, maxUpdates]);

  return formatRelativeDate(date, locale);
}
