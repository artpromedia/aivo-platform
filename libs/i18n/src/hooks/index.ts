/**
 * Internationalization Hooks
 *
 * React hooks for accessing translation and formatting functionality.
 */

import { useCallback, useMemo } from 'react';
import {
  useIntl,
  type MessageDescriptor,
  type FormatNumberOptions,
  type FormatDateOptions,
  type FormatListOptions,
  type FormatRelativeTimeOptions,
} from 'react-intl';
import { useLocaleContext } from '../provider/index.js';
import { RTL_LOCALES, type Locale, LOCALE_METADATA } from '../constants/index.js';

/**
 * Hook for accessing the current locale and locale utilities
 */
export function useLocale() {
  const context = useLocaleContext();
  const { locale } = useIntl();

  return {
    ...context,
    locale: locale as Locale,
    metadata: LOCALE_METADATA[locale as Locale],
  };
}

/**
 * Hook for formatting messages with ICU MessageFormat support
 *
 * @example
 * ```tsx
 * const { formatMessage, t } = useFormatMessage();
 *
 * // Using formatMessage
 * const text = formatMessage({ id: 'welcome.greeting' }, { name: 'John' });
 *
 * // Using shorthand t()
 * const text2 = t('welcome.greeting', { name: 'John' });
 * ```
 */
export function useFormatMessage() {
  const intl = useIntl();

  const formatMessage = useCallback(
    (descriptor: MessageDescriptor, values?: Record<string, unknown>) => {
      return intl.formatMessage(descriptor, values);
    },
    [intl]
  );

  // Shorthand function for common use case
  const t = useCallback(
    (id: string, values?: Record<string, unknown>, defaultMessage?: string) => {
      return intl.formatMessage({ id, defaultMessage }, values);
    },
    [intl]
  );

  return { formatMessage, t, intl };
}

/**
 * Comprehensive translation hook combining locale and formatting
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale, isRTL } = useTranslation();
 *
 * return (
 *   <div dir={isRTL ? 'rtl' : 'ltr'}>
 *     <h1>{t('page.title')}</h1>
 *     <p>{t('items.count', { count: 5 })}</p>
 *   </div>
 * );
 * ```
 */
export function useTranslation() {
  const { formatMessage, t, intl } = useFormatMessage();
  const localeContext = useLocaleContext();

  return {
    t,
    formatMessage,
    intl,
    ...localeContext,
  };
}

/**
 * Hook for formatting numbers according to locale
 *
 * @example
 * ```tsx
 * const { formatNumber, formatPercent, formatCompact } = useFormatNumber();
 *
 * formatNumber(1234567); // "1,234,567" (en) or "1.234.567" (de)
 * formatPercent(0.15); // "15%"
 * formatCompact(1500000); // "1.5M"
 * ```
 */
export function useFormatNumber() {
  const intl = useIntl();

  const formatNumber = useCallback(
    (value: number, options?: FormatNumberOptions) => {
      return intl.formatNumber(value, options);
    },
    [intl]
  );

  const formatPercent = useCallback(
    (value: number, options?: Omit<FormatNumberOptions, 'style'>) => {
      return intl.formatNumber(value, { style: 'percent', ...options });
    },
    [intl]
  );

  const formatCompact = useCallback(
    (value: number, options?: Omit<FormatNumberOptions, 'notation'>) => {
      return intl.formatNumber(value, { notation: 'compact', ...options });
    },
    [intl]
  );

  const formatDecimal = useCallback(
    (value: number, decimals: number = 2) => {
      return intl.formatNumber(value, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    [intl]
  );

  return { formatNumber, formatPercent, formatCompact, formatDecimal };
}

/**
 * Hook for formatting dates according to locale
 *
 * @example
 * ```tsx
 * const { formatDate, formatTime, formatDateTime } = useFormatDate();
 *
 * formatDate(new Date()); // "1/28/2026" (en-US) or "28/01/2026" (en-GB)
 * formatTime(new Date()); // "3:45 PM"
 * formatDateTime(new Date()); // "Jan 28, 2026, 3:45 PM"
 * ```
 */
export function useFormatDate() {
  const intl = useIntl();

  const formatDate = useCallback(
    (value: Date | number, options?: FormatDateOptions) => {
      return intl.formatDate(value, options);
    },
    [intl]
  );

  const formatTime = useCallback(
    (value: Date | number, options?: FormatDateOptions) => {
      return intl.formatTime(value, options);
    },
    [intl]
  );

  const formatDateTime = useCallback(
    (value: Date | number, options?: FormatDateOptions) => {
      return intl.formatDate(value, {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...options,
      });
    },
    [intl]
  );

  const formatDateShort = useCallback(
    (value: Date | number) => {
      return intl.formatDate(value, { dateStyle: 'short' });
    },
    [intl]
  );

  const formatDateLong = useCallback(
    (value: Date | number) => {
      return intl.formatDate(value, { dateStyle: 'long' });
    },
    [intl]
  );

  const formatDateFull = useCallback(
    (value: Date | number) => {
      return intl.formatDate(value, { dateStyle: 'full' });
    },
    [intl]
  );

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatDateShort,
    formatDateLong,
    formatDateFull,
  };
}

/**
 * Hook for formatting currency according to locale
 *
 * @example
 * ```tsx
 * const { formatCurrency, formatCurrencyCompact } = useFormatCurrency();
 *
 * formatCurrency(1234.56, 'USD'); // "$1,234.56"
 * formatCurrency(1234.56, 'EUR'); // "€1,234.56" (en) or "1.234,56 €" (de)
 * formatCurrencyCompact(1500000, 'USD'); // "$1.5M"
 * ```
 */
export function useFormatCurrency() {
  const intl = useIntl();

  const formatCurrency = useCallback(
    (value: number, currency: string, options?: Omit<FormatNumberOptions, 'style' | 'currency'>) => {
      return intl.formatNumber(value, {
        style: 'currency',
        currency,
        ...options,
      });
    },
    [intl]
  );

  const formatCurrencyCompact = useCallback(
    (value: number, currency: string) => {
      return intl.formatNumber(value, {
        style: 'currency',
        currency,
        notation: 'compact',
      });
    },
    [intl]
  );

  const formatCurrencyNarrow = useCallback(
    (value: number, currency: string) => {
      return intl.formatNumber(value, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      });
    },
    [intl]
  );

  return { formatCurrency, formatCurrencyCompact, formatCurrencyNarrow };
}

/**
 * Hook for formatting relative time (e.g., "3 days ago", "in 2 hours")
 *
 * @example
 * ```tsx
 * const { formatRelativeTime, formatTimeAgo } = useFormatRelativeTime();
 *
 * formatRelativeTime(-3, 'day'); // "3 days ago"
 * formatRelativeTime(2, 'hour'); // "in 2 hours"
 * formatTimeAgo(new Date('2026-01-25')); // "3 days ago"
 * ```
 */
export function useFormatRelativeTime() {
  const intl = useIntl();

  const formatRelativeTime = useCallback(
    (
      value: number,
      unit: Intl.RelativeTimeFormatUnit,
      options?: FormatRelativeTimeOptions
    ) => {
      return intl.formatRelativeTime(value, unit, options);
    },
    [intl]
  );

  const formatTimeAgo = useCallback(
    (date: Date | number, options?: FormatRelativeTimeOptions) => {
      const now = Date.now();
      const time = typeof date === 'number' ? date : date.getTime();
      const diff = time - now;
      const seconds = Math.round(diff / 1000);
      const minutes = Math.round(diff / 60000);
      const hours = Math.round(diff / 3600000);
      const days = Math.round(diff / 86400000);
      const weeks = Math.round(diff / 604800000);
      const months = Math.round(diff / 2628000000);
      const years = Math.round(diff / 31536000000);

      if (Math.abs(seconds) < 60) {
        return intl.formatRelativeTime(seconds, 'second', options);
      }
      if (Math.abs(minutes) < 60) {
        return intl.formatRelativeTime(minutes, 'minute', options);
      }
      if (Math.abs(hours) < 24) {
        return intl.formatRelativeTime(hours, 'hour', options);
      }
      if (Math.abs(days) < 7) {
        return intl.formatRelativeTime(days, 'day', options);
      }
      if (Math.abs(weeks) < 4) {
        return intl.formatRelativeTime(weeks, 'week', options);
      }
      if (Math.abs(months) < 12) {
        return intl.formatRelativeTime(months, 'month', options);
      }
      return intl.formatRelativeTime(years, 'year', options);
    },
    [intl]
  );

  return { formatRelativeTime, formatTimeAgo };
}

/**
 * Hook for formatting lists
 *
 * @example
 * ```tsx
 * const { formatList, formatListAnd, formatListOr } = useFormatList();
 *
 * formatListAnd(['Apple', 'Banana', 'Orange']); // "Apple, Banana, and Orange"
 * formatListOr(['Red', 'Blue', 'Green']); // "Red, Blue, or Green"
 * ```
 */
export function useFormatList() {
  const intl = useIntl();

  const formatList = useCallback(
    (values: string[], options?: FormatListOptions) => {
      return intl.formatList(values, options);
    },
    [intl]
  );

  const formatListAnd = useCallback(
    (values: string[]) => {
      return intl.formatList(values, { type: 'conjunction' });
    },
    [intl]
  );

  const formatListOr = useCallback(
    (values: string[]) => {
      return intl.formatList(values, { type: 'disjunction' });
    },
    [intl]
  );

  const formatListUnit = useCallback(
    (values: string[]) => {
      return intl.formatList(values, { type: 'unit' });
    },
    [intl]
  );

  return { formatList, formatListAnd, formatListOr, formatListUnit };
}

/**
 * Hook for plural rules
 *
 * @example
 * ```tsx
 * const { select } = usePluralRules();
 *
 * select(0); // "zero" or "other"
 * select(1); // "one"
 * select(2); // "two" (for Arabic) or "other"
 * select(5); // "few" (for Slavic languages) or "other"
 * ```
 */
export function usePluralRules() {
  const { locale } = useIntl();

  const pluralRules = useMemo(() => {
    return new Intl.PluralRules(locale);
  }, [locale]);

  const select = useCallback(
    (value: number) => {
      return pluralRules.select(value);
    },
    [pluralRules]
  );

  return { pluralRules, select };
}

/**
 * Hook for RTL support
 *
 * @example
 * ```tsx
 * const { isRTL, direction, flipForRTL } = useRTL();
 *
 * <div dir={direction}>
 *   <span style={{ marginLeft: flipForRTL('10px', '0'), marginRight: flipForRTL('0', '10px') }}>
 *     Content
 *   </span>
 * </div>
 * ```
 */
export function useRTL() {
  const { locale } = useIntl();

  const isRTL = useMemo(() => {
    return RTL_LOCALES.includes(locale as Locale);
  }, [locale]);

  const direction = useMemo(() => {
    return isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  const flipForRTL = useCallback(
    <T>(ltrValue: T, rtlValue: T): T => {
      return isRTL ? rtlValue : ltrValue;
    },
    [isRTL]
  );

  const getLogicalProperty = useCallback(
    (property: 'start' | 'end'): 'left' | 'right' => {
      if (property === 'start') {
        return isRTL ? 'right' : 'left';
      }
      return isRTL ? 'left' : 'right';
    },
    [isRTL]
  );

  return { isRTL, direction, flipForRTL, getLogicalProperty };
}

export { useIntl };
