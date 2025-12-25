/**
 * Relative Time Formatter
 *
 * Locale-aware relative time formatting (e.g., "2 days ago", "in 3 hours").
 * Uses Intl.RelativeTimeFormat for maximum compatibility.
 */

import type { SupportedLocale } from '../types';

/**
 * Formatter cache for performance
 */
const formatterCache = new Map<string, Intl.RelativeTimeFormat>();

/**
 * Time units in descending order of magnitude
 */
const TIME_UNITS: {
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}[] = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

/**
 * Relative time format options
 */
export interface RelativeTimeOptions {
  /** Style of formatting: 'long', 'short', or 'narrow' */
  style?: 'long' | 'short' | 'narrow';
  /** Whether to use numeric ('1 day ago') or auto ('yesterday') */
  numeric?: 'always' | 'auto';
  /** Maximum unit to use (won't go larger than this) */
  maxUnit?: Intl.RelativeTimeFormatUnit;
  /** Minimum unit to use (won't go smaller than this) */
  minUnit?: Intl.RelativeTimeFormatUnit;
  /** Round up to the next unit when close to threshold */
  roundUp?: boolean;
}

/**
 * Get cached or create RelativeTimeFormat
 */
function getFormatter(
  locale: SupportedLocale,
  options: Intl.RelativeTimeFormatOptions = {}
): Intl.RelativeTimeFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;

  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, options);
    formatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

/**
 * Find appropriate time unit for a given number of seconds
 */
function findAppropriateUnit(
  seconds: number,
  options: RelativeTimeOptions = {}
): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  const absSeconds = Math.abs(seconds);
  const { maxUnit, minUnit, roundUp } = options;

  // Find the max unit index (limit how large we can go)
  const maxUnitIndex = maxUnit ? TIME_UNITS.findIndex((u) => u.unit === maxUnit) : 0;

  // Find the min unit index (limit how small we can go)
  const minUnitIndex = minUnit
    ? TIME_UNITS.findIndex((u) => u.unit === minUnit)
    : TIME_UNITS.length - 1;

  // Find the appropriate unit
  for (let i = Math.max(0, maxUnitIndex); i <= minUnitIndex; i++) {
    const { unit, seconds: unitSeconds } = TIME_UNITS[i];

    if (absSeconds >= unitSeconds || i === minUnitIndex) {
      let value = seconds / unitSeconds;

      if (roundUp && Math.abs(value - Math.round(value)) > 0.1) {
        value = seconds > 0 ? Math.ceil(value) : Math.floor(value);
      } else {
        value = Math.round(value);
      }

      return { unit, value };
    }
  }

  return { unit: 'second', value: Math.round(seconds) };
}

/**
 * Format a relative time value
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: SupportedLocale,
  options: Pick<RelativeTimeOptions, 'style' | 'numeric'> = {}
): string {
  const formatter = getFormatter(locale, {
    style: options.style ?? 'long',
    numeric: options.numeric ?? 'auto',
  });

  return formatter.format(value, unit);
}

/**
 * Format relative time from a Date object
 */
export function formatRelativeDate(
  date: Date | number | string,
  locale: SupportedLocale,
  options: RelativeTimeOptions & { relativeTo?: Date } = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = options.relativeTo ?? new Date();

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatRelativeDate:', date);
    return String(date);
  }

  const diffSeconds = Math.round((dateObj.getTime() - now.getTime()) / 1000);
  const { unit, value } = findAppropriateUnit(diffSeconds, options);

  return formatRelativeTime(value, unit, locale, {
    style: options.style,
    numeric: options.numeric,
  });
}

/**
 * Format time elapsed since a date
 */
export function formatTimeAgo(
  date: Date | number | string,
  locale: SupportedLocale,
  options: RelativeTimeOptions = {}
): string {
  return formatRelativeDate(date, locale, {
    ...options,
    numeric: options.numeric ?? 'always',
  });
}

/**
 * Format time until a date
 */
export function formatTimeUntil(
  date: Date | number | string,
  locale: SupportedLocale,
  options: RelativeTimeOptions = {}
): string {
  return formatRelativeDate(date, locale, options);
}

/**
 * Format a duration (difference between two dates)
 */
export function formatDuration(
  startDate: Date | number | string,
  endDate: Date | number | string,
  locale: SupportedLocale,
  options: Omit<RelativeTimeOptions, 'numeric'> = {}
): string {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn('Invalid dates provided to formatDuration');
    return '';
  }

  const diffSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
  const { unit, value } = findAppropriateUnit(Math.abs(diffSeconds), options);

  const formatter = getFormatter(locale, {
    style: options.style ?? 'long',
    numeric: 'always',
  });

  // Format as positive (we just want the duration, not direction)
  const parts = formatter.formatToParts(Math.abs(value), unit);

  // Remove direction indicators and join
  return parts
    .filter(
      (part) => part.type !== 'literal' || !/^(in |ago|après|hace|vor|fra|)/i.exec(part.value)
    )
    .map((part) => part.value)
    .join('')
    .trim();
}

/**
 * Get smart relative date string
 * Returns "today", "yesterday", "tomorrow" when applicable
 */
export function formatSmartRelative(
  date: Date | number | string,
  locale: SupportedLocale,
  options: RelativeTimeOptions & {
    includeTime?: boolean;
    dateFormatter?: (date: Date) => string;
  } = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  // Check for today, yesterday, tomorrow
  const diffDays = Math.floor(
    (dateObj.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );

  // Restore date object
  const originalDate = date instanceof Date ? date : new Date(date);

  if (diffDays === 0) {
    // Today - show time only or "today"
    if (options.includeTime) {
      return formatRelativeTime(0, 'day', locale, { numeric: 'auto' });
    }
    return formatRelativeTime(0, 'day', locale, { numeric: 'auto' });
  }

  if (diffDays === -1) {
    return formatRelativeTime(-1, 'day', locale, { numeric: 'auto' });
  }

  if (diffDays === 1) {
    return formatRelativeTime(1, 'day', locale, { numeric: 'auto' });
  }

  // For dates within a week, use relative format
  if (Math.abs(diffDays) <= 7) {
    return formatRelativeDate(originalDate, locale, options);
  }

  // For older dates, use custom formatter or default relative
  if (options.dateFormatter) {
    return options.dateFormatter(originalDate);
  }

  return formatRelativeDate(originalDate, locale, { ...options, maxUnit: 'month' });
}

/**
 * Format relative time with threshold
 * Falls back to absolute date after a certain threshold
 */
export function formatRelativeWithThreshold(
  date: Date | number | string,
  locale: SupportedLocale,
  threshold: { value: number; unit: Intl.RelativeTimeFormatUnit },
  fallbackFormatter: (date: Date, locale: SupportedLocale) => string,
  options: RelativeTimeOptions = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const thresholdUnit = TIME_UNITS.find((u) => u.unit === threshold.unit);
  if (!thresholdUnit) {
    return formatRelativeDate(date, locale, options);
  }

  const thresholdMs = threshold.value * thresholdUnit.seconds * 1000;
  const diffMs = Math.abs(dateObj.getTime() - now.getTime());

  if (diffMs > thresholdMs) {
    return fallbackFormatter(dateObj, locale);
  }

  return formatRelativeDate(date, locale, options);
}

/**
 * Get all parts of a relative time format
 */
export function formatRelativeTimeToParts(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: SupportedLocale,
  options: Pick<RelativeTimeOptions, 'style' | 'numeric'> = {}
): Intl.RelativeTimeFormatPart[] {
  const formatter = getFormatter(locale, {
    style: options.style ?? 'long',
    numeric: options.numeric ?? 'auto',
  });

  return formatter.formatToParts(value, unit);
}

/**
 * Clear formatter cache
 */
export function clearRelativeTimeFormatterCache(): void {
  formatterCache.clear();
}
