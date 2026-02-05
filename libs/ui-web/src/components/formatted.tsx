/**
 * Formatted Components
 *
 * React components for displaying localized numbers, dates, currencies, and more.
 * These components integrate with the LocaleProvider to automatically format
 * values according to the current locale.
 */

import React, { useMemo } from 'react';
import {
  FormattedNumber,
  FormattedDate,
  FormattedRelativeTime,
  FormattedList,
  FormattedDisplayName,
  FormattedPlural,
} from 'react-intl';

import { useLocale } from '../providers/LocaleProvider';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export interface FormattedCurrencyProps {
  /** The numeric value to format */
  value: number;
  /** Currency code (ISO 4217, e.g., 'USD', 'EUR', 'GBP') */
  currency: string;
  /** How to display the currency (default: 'symbol') */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Whether to use grouping separators (default: true) */
  useGrouping?: boolean;
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedPercentProps {
  /** The numeric value to format (0.15 = 15%) */
  value: number;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedCompactNumberProps {
  /** The numeric value to format */
  value: number;
  /** Compact notation type (default: 'short') */
  compactDisplay?: 'short' | 'long';
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedDateTimeProps {
  /** The date value (Date object, timestamp, or ISO string) */
  value: Date | number | string;
  /** Predefined format or custom options */
  format?: 'short' | 'medium' | 'long' | 'full' | Intl.DateTimeFormatOptions;
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedTimeAgoProps {
  /** The date/time to compare against now */
  value: Date | number | string;
  /** Update interval in milliseconds (0 = no updates) */
  updateIntervalInSeconds?: number;
  /** Whether to add "ago" suffix automatically */
  numeric?: 'always' | 'auto';
  /** The unit style (default: 'long') */
  style?: 'long' | 'short' | 'narrow';
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedOrdinalProps {
  /** The numeric value */
  value: number;
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedUnitProps {
  /** The numeric value */
  value: number;
  /** The unit to display (e.g., 'kilometer', 'hour', 'byte') */
  unit: string;
  /** Unit display style (default: 'long') */
  unitDisplay?: 'long' | 'short' | 'narrow';
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedRangeProps {
  /** Start of the range */
  start: number;
  /** End of the range */
  end: number;
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedLanguageNameProps {
  /** Language code (e.g., 'en', 'es', 'fr') */
  code: string;
  /** Display style (default: 'language') */
  type?: 'language' | 'region' | 'script' | 'currency';
  /** Display style (default: 'long') */
  style?: 'long' | 'short' | 'narrow';
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedListItemsProps {
  /** Array of items to format as a list */
  items: React.ReactNode[];
  /** List style (default: 'conjunction' = "and") */
  type?: 'conjunction' | 'disjunction' | 'unit';
  /** List style (default: 'long') */
  style?: 'long' | 'short' | 'narrow';
  /** Custom class name for styling */
  className?: string;
}

export interface FormattedPluralTextProps {
  /** The count value */
  value: number;
  /** Text for zero (optional) */
  zero?: React.ReactNode;
  /** Text for one */
  one: React.ReactNode;
  /** Text for two (optional, for languages with dual form) */
  two?: React.ReactNode;
  /** Text for few (optional, for languages with paucal form) */
  few?: React.ReactNode;
  /** Text for many (optional, for languages with many form) */
  many?: React.ReactNode;
  /** Text for other (default/plural) */
  other: React.ReactNode;
  /** Custom class name for styling */
  className?: string;
}

/* ==========================================================================
   Currency Component
   ========================================================================== */

/**
 * Formats a number as currency according to the current locale
 *
 * @example
 * <FormattedCurrency value={1234.56} currency="USD" />
 * // Output: $1,234.56 (in en-US) or 1.234,56 $ (in de-DE)
 */
export function FormattedCurrency({
  value,
  currency,
  currencyDisplay = 'symbol',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  useGrouping = true,
  className,
}: FormattedCurrencyProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedNumber
        value={value}
        style="currency"
        currency={currency}
        currencyDisplay={currencyDisplay}
        minimumFractionDigits={minimumFractionDigits}
        maximumFractionDigits={maximumFractionDigits}
        useGrouping={useGrouping}
      />
    </span>
  );
}

/* ==========================================================================
   Percent Component
   ========================================================================== */

/**
 * Formats a number as a percentage
 *
 * @example
 * <FormattedPercent value={0.856} />
 * // Output: 85.6%
 */
export function FormattedPercent({
  value,
  minimumFractionDigits = 0,
  maximumFractionDigits = 1,
  className,
}: FormattedPercentProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedNumber
        value={value}
        style="percent"
        minimumFractionDigits={minimumFractionDigits}
        maximumFractionDigits={maximumFractionDigits}
      />
    </span>
  );
}

/* ==========================================================================
   Compact Number Component
   ========================================================================== */

/**
 * Formats a number in compact notation (1K, 1M, etc.)
 *
 * @example
 * <FormattedCompactNumber value={1500000} />
 * // Output: 1.5M (in en-US)
 */
export function FormattedCompactNumber({
  value,
  compactDisplay = 'short',
  minimumFractionDigits = 0,
  maximumFractionDigits = 1,
  className,
}: FormattedCompactNumberProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedNumber
        value={value}
        notation="compact"
        compactDisplay={compactDisplay}
        minimumFractionDigits={minimumFractionDigits}
        maximumFractionDigits={maximumFractionDigits}
      />
    </span>
  );
}

/* ==========================================================================
   DateTime Component
   ========================================================================== */

const DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short' },
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  full: { dateStyle: 'full' },
};

/**
 * Formats a date according to the current locale
 *
 * @example
 * <FormattedDateTime value={new Date()} format="long" />
 * // Output: January 15, 2025 (in en-US) or 15 janvier 2025 (in fr-FR)
 */
export function FormattedDateTime({
  value,
  format = 'medium',
  className,
}: FormattedDateTimeProps): React.ReactElement {
  const dateValue = useMemo(() => {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    return new Date(value);
  }, [value]);

  const options = typeof format === 'string' ? DATE_FORMATS[format] : format;

  return (
    <span className={className}>
      <FormattedDate value={dateValue} {...options} />
    </span>
  );
}

/* ==========================================================================
   Time Ago Component
   ========================================================================== */

/**
 * Helper to calculate relative time difference
 */
function getRelativeTime(date: Date): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const sign = diff < 0 ? -1 : 1;

  if (years > 0) return { value: sign * years, unit: 'year' };
  if (months > 0) return { value: sign * months, unit: 'month' };
  if (weeks > 0) return { value: sign * weeks, unit: 'week' };
  if (days > 0) return { value: sign * days, unit: 'day' };
  if (hours > 0) return { value: sign * hours, unit: 'hour' };
  if (minutes > 0) return { value: sign * minutes, unit: 'minute' };
  return { value: sign * seconds, unit: 'second' };
}

/**
 * Formats a date as relative time (e.g., "2 hours ago", "in 3 days")
 *
 * @example
 * <FormattedTimeAgo value={new Date(Date.now() - 3600000)} />
 * // Output: 1 hour ago
 */
export function FormattedTimeAgo({
  value,
  numeric = 'auto',
  style = 'long',
  className,
}: FormattedTimeAgoProps): React.ReactElement {
  const dateValue = useMemo(() => {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    return new Date(value);
  }, [value]);

  const { value: relValue, unit } = useMemo(() => getRelativeTime(dateValue), [dateValue]);

  return (
    <span className={className}>
      <FormattedRelativeTime value={relValue} unit={unit} numeric={numeric} style={style} />
    </span>
  );
}

/* ==========================================================================
   Ordinal Component
   ========================================================================== */

/**
 * Formats a number as an ordinal (1st, 2nd, 3rd, etc.)
 *
 * @example
 * <FormattedOrdinal value={3} />
 * // Output: 3rd (in en) or 3. (in de)
 */
export function FormattedOrdinal({ value, className }: FormattedOrdinalProps): React.ReactElement {
  const { locale } = useLocale();

  const ordinal = useMemo(() => {
    // Use Intl.PluralRules for ordinal suffixes
    const pr = new Intl.PluralRules(locale, { type: 'ordinal' });
    const rule = pr.select(value);

    // English ordinal suffixes
    const suffixes: Record<string, string> = {
      one: 'st',
      two: 'nd',
      few: 'rd',
      other: 'th',
    };

    // For English-like languages, add suffix
    if (locale.startsWith('en')) {
      return `${value}${suffixes[rule]}`;
    }

    // For other languages, use the locale's number format
    // Many languages just use the number with a period (e.g., German: 1., 2., 3.)
    if (['de', 'fr', 'es', 'it', 'pt', 'nl'].some((l) => locale.startsWith(l))) {
      return `${value}.`;
    }

    // Fallback to just the number
    return value.toString();
  }, [value, locale]);

  return <span className={className}>{ordinal}</span>;
}

/* ==========================================================================
   Unit Component
   ========================================================================== */

/**
 * Formats a number with a unit
 *
 * @example
 * <FormattedUnit value={25} unit="kilometer" />
 * // Output: 25 kilometers (in en) or 25 Kilometer (in de)
 */
export function FormattedUnit({
  value,
  unit,
  unitDisplay = 'long',
  className,
}: FormattedUnitProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedNumber value={value} style="unit" unit={unit} unitDisplay={unitDisplay} />
    </span>
  );
}

/* ==========================================================================
   Range Component
   ========================================================================== */

/**
 * Formats a range of numbers
 *
 * @example
 * <FormattedRange start={10} end={20} />
 * // Output: 10–20
 */
export function FormattedRange({ start, end, className }: FormattedRangeProps): React.ReactElement {
  const { locale } = useLocale();

  const formattedRange = useMemo(() => {
    if (typeof (Intl.NumberFormat.prototype as any).formatRange === 'function') {
      const formatter = new Intl.NumberFormat(locale);
      return (formatter as any).formatRange(start, end);
    }
    // Fallback for older browsers
    const formatter = new Intl.NumberFormat(locale);
    return `${formatter.format(start)}–${formatter.format(end)}`;
  }, [start, end, locale]);

  return <span className={className}>{formattedRange}</span>;
}

/* ==========================================================================
   Language Name Component
   ========================================================================== */

/**
 * Displays a language name in the current locale
 *
 * @example
 * <FormattedLanguageName code="es" />
 * // Output: Spanish (in en) or Español (in es)
 */
export function FormattedLanguageName({
  code,
  type = 'language',
  style = 'long',
  className,
}: FormattedLanguageNameProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedDisplayName type={type} value={code} style={style} />
    </span>
  );
}

/* ==========================================================================
   List Items Component
   ========================================================================== */

/**
 * Formats a list of items with proper conjunctions
 *
 * @example
 * <FormattedListItems items={['Apple', 'Banana', 'Cherry']} />
 * // Output: Apple, Banana, and Cherry (in en)
 */
export function FormattedListItems({
  items,
  type = 'conjunction',
  style = 'long',
  className,
}: FormattedListItemsProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedList type={type} style={style} value={items} />
    </span>
  );
}

/* ==========================================================================
   Plural Text Component
   ========================================================================== */

/**
 * Renders different text based on a count value
 *
 * @example
 * <FormattedPluralText
 *   value={messageCount}
 *   zero="No messages"
 *   one="1 message"
 *   other="{count} messages"
 * />
 */
export function FormattedPluralText({
  value,
  zero,
  one,
  two,
  few,
  many,
  other,
  className,
}: FormattedPluralTextProps): React.ReactElement {
  return (
    <span className={className}>
      <FormattedPlural
        value={value}
        zero={zero}
        one={one}
        two={two}
        few={few}
        many={many}
        other={other}
      />
    </span>
  );
}

/* ==========================================================================
   Score Display Component (Education-specific)
   ========================================================================== */

export interface FormattedScoreProps {
  /** The score value (0-100) */
  value: number;
  /** Maximum score (default: 100) */
  max?: number;
  /** Whether to show as percentage */
  asPercent?: boolean;
  /** Custom class name for styling */
  className?: string;
  /** Whether to include color coding */
  colorCoded?: boolean;
}

/**
 * Formats a score for educational contexts
 *
 * @example
 * <FormattedScore value={85} colorCoded />
 * // Output: 85% with green color
 */
export function FormattedScore({
  value,
  max = 100,
  asPercent = true,
  className,
  colorCoded = false,
}: FormattedScoreProps): React.ReactElement {
  const normalizedValue = max !== 100 ? value / max : value / 100;

  const colorClass = useMemo(() => {
    if (!colorCoded) return '';
    const percent = normalizedValue * 100;
    if (percent >= 90) return 'text-green-600 dark:text-green-400';
    if (percent >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (percent >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percent >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }, [normalizedValue, colorCoded]);

  if (asPercent) {
    return (
      <span className={`${className || ''} ${colorClass}`.trim()}>
        <FormattedNumber
          value={normalizedValue}
          style="percent"
          minimumFractionDigits={0}
          maximumFractionDigits={0}
        />
      </span>
    );
  }

  return (
    <span className={`${className || ''} ${colorClass}`.trim()}>
      <FormattedNumber value={value} /> / <FormattedNumber value={max} />
    </span>
  );
}

/* ==========================================================================
   Time Duration Component (Education-specific)
   ========================================================================== */

export interface FormattedDurationProps {
  /** Duration in seconds */
  seconds: number;
  /** Format style */
  format?: 'short' | 'long' | 'digital';
  /** Custom class name for styling */
  className?: string;
}

/**
 * Formats a duration for display
 *
 * @example
 * <FormattedDuration seconds={3665} format="short" />
 * // Output: 1h 1m (in short) or 1 hour, 1 minute (in long) or 1:01:05 (in digital)
 */
export function FormattedDuration({
  seconds,
  format = 'short',
  className,
}: FormattedDurationProps): React.ReactElement {
  const { locale } = useLocale();

  const formatted = useMemo(() => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (format === 'digital') {
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    const parts: string[] = [];
    const listFormatter = new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' });

    if (format === 'short') {
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (secs > 0 && hours === 0) parts.push(`${secs}s`);
      return parts.join(' ') || '0s';
    }

    // Long format
    if (hours > 0) {
      const hourFormatter = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'hour',
        unitDisplay: 'long',
      });
      parts.push(hourFormatter.format(hours));
    }
    if (minutes > 0) {
      const minFormatter = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'minute',
        unitDisplay: 'long',
      });
      parts.push(minFormatter.format(minutes));
    }
    if (secs > 0 && hours === 0) {
      const secFormatter = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'long',
      });
      parts.push(secFormatter.format(secs));
    }

    return (
      listFormatter.format(parts) ||
      new Intl.NumberFormat(locale, { style: 'unit', unit: 'second', unitDisplay: 'long' }).format(
        0
      )
    );
  }, [seconds, format, locale]);

  return <span className={className}>{formatted}</span>;
}

/* ==========================================================================
   XP/Points Display Component (Gamification)
   ========================================================================== */

export interface FormattedXPProps {
  /** XP value */
  value: number;
  /** Label to show (default: 'XP') */
  label?: string;
  /** Whether to use compact notation for large numbers */
  compact?: boolean;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Custom class name for styling */
  className?: string;
}

/**
 * Formats XP/points for gamification displays
 *
 * @example
 * <FormattedXP value={12500} compact />
 * // Output: 12.5K XP
 */
export function FormattedXP({
  value,
  label = 'XP',
  compact = false,
  showLabel = true,
  className,
}: FormattedXPProps): React.ReactElement {
  return (
    <span className={className}>
      {compact ? (
        <FormattedCompactNumber value={value} maximumFractionDigits={1} />
      ) : (
        <FormattedNumber value={value} />
      )}
      {showLabel && <span className="ms-1 text-sm font-medium">{label}</span>}
    </span>
  );
}

/* ==========================================================================
   Exports
   ========================================================================== */

export default {
  FormattedCurrency,
  FormattedPercent,
  FormattedCompactNumber,
  FormattedDateTime,
  FormattedTimeAgo,
  FormattedOrdinal,
  FormattedUnit,
  FormattedRange,
  FormattedLanguageName,
  FormattedListItems,
  FormattedPluralText,
  FormattedScore,
  FormattedDuration,
  FormattedXP,
};
