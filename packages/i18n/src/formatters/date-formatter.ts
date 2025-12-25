/**
 * Date Formatter
 *
 * Locale-aware date and time formatting using Intl.DateTimeFormat.
 * Supports relative dates, durations, and various format styles.
 */

import { LOCALE_METADATA } from '../constants';
import type { SupportedLocale, DateFormatOptions } from '../types';

/**
 * Formatter cache for performance
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Get cached or create DateTimeFormat
 */
function getFormatter(
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;

  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

/**
 * Preset format options
 */
const FORMAT_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short' },
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  full: { dateStyle: 'full' },
  timeShort: { timeStyle: 'short' },
  timeMedium: { timeStyle: 'medium' },
  timeLong: { timeStyle: 'long' },
  dateTime: { dateStyle: 'medium', timeStyle: 'short' },
  dateTimeLong: { dateStyle: 'long', timeStyle: 'medium' },
  monthYear: { month: 'long', year: 'numeric' },
  monthDay: { month: 'long', day: 'numeric' },
  weekdayMonthDay: { weekday: 'long', month: 'long', day: 'numeric' },
  yearOnly: { year: 'numeric' },
  monthOnly: { month: 'long' },
  dayOnly: { day: 'numeric' },
  weekdayOnly: { weekday: 'long' },
  iso: { year: 'numeric', month: '2-digit', day: '2-digit' },
};

/**
 * Format a date with locale-specific formatting
 */
export function formatDate(
  date: Date | number | string,
  locale: SupportedLocale,
  options: DateFormatOptions = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDate:', date);
    return String(date);
  }

  // Handle preset styles
  if (options.preset && FORMAT_PRESETS[options.preset]) {
    const formatter = getFormatter(locale, {
      ...FORMAT_PRESETS[options.preset],
      calendar: options.calendar,
      numberingSystem: options.numberingSystem,
      timeZone: options.timeZone,
    });
    return formatter.format(dateObj);
  }

  // Build Intl options from our options
  const intlOptions: Intl.DateTimeFormatOptions = {
    dateStyle: options.dateStyle,
    timeStyle: options.timeStyle,
    calendar: options.calendar ?? LOCALE_METADATA[locale]?.calendar,
    numberingSystem: options.numberingSystem ?? LOCALE_METADATA[locale]?.numberSystem,
    timeZone: options.timeZone,
    hour12: options.hour12,
    weekday: options.weekday,
    era: options.era,
    year: options.year,
    month: options.month,
    day: options.day,
    hour: options.hour,
    minute: options.minute,
    second: options.second,
    fractionalSecondDigits: options.fractionalSecondDigits,
    timeZoneName: options.timeZoneName,
    dayPeriod: options.dayPeriod,
  };

  // Remove undefined values
  const cleanOptions = Object.fromEntries(
    Object.entries(intlOptions).filter(([_, v]) => v !== undefined)
  );

  const formatter = getFormatter(locale, cleanOptions);
  return formatter.format(dateObj);
}

/**
 * Format date to parts
 */
export function formatDateToParts(
  date: Date | number | string,
  locale: SupportedLocale,
  options: DateFormatOptions = {}
): Intl.DateTimeFormatPart[] {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return [{ type: 'literal', value: String(date) }];
  }

  const intlOptions: Intl.DateTimeFormatOptions = {
    dateStyle: options.dateStyle,
    timeStyle: options.timeStyle,
    calendar: options.calendar,
    numberingSystem: options.numberingSystem,
    timeZone: options.timeZone,
  };

  const formatter = getFormatter(locale, intlOptions);
  return formatter.formatToParts(dateObj);
}

/**
 * Format a date range
 */
export function formatDateRange(
  startDate: Date | number | string,
  endDate: Date | number | string,
  locale: SupportedLocale,
  options: DateFormatOptions = {}
): string {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return `${String(startDate)} - ${String(endDate)}`;
  }

  const intlOptions: Intl.DateTimeFormatOptions = {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle,
    timeZone: options.timeZone,
  };

  const formatter = getFormatter(locale, intlOptions);

  // Use formatRange if available (modern browsers)
  if ('formatRange' in formatter) {
    return (formatter as any).formatRange(start, end);
  }

  // Fallback for older browsers
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | number | string,
  locale: SupportedLocale,
  style: 'short' | 'medium' | 'long' = 'short',
  options: Pick<DateFormatOptions, 'timeZone' | 'hour12'> = {}
): string {
  return formatDate(date, locale, {
    timeStyle: style,
    timeZone: options.timeZone,
    hour12: options.hour12,
  });
}

/**
 * Format to ISO 8601 string
 */
export function formatISO(date: Date | number | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString();
}

/**
 * Format to ISO date only (YYYY-MM-DD)
 */
export function formatISODate(date: Date | number | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Format to ISO time only (HH:mm:ss)
 */
export function formatISOTime(date: Date | number | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().split('T')[1].split('.')[0];
}

/**
 * Get day name
 */
export function getDayName(
  date: Date | number | string,
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const formatter = getFormatter(locale, { weekday: style });
  return formatter.format(dateObj);
}

/**
 * Get month name
 */
export function getMonthName(
  date: Date | number | string,
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const formatter = getFormatter(locale, { month: style });
  return formatter.format(dateObj);
}

/**
 * Get all month names for a locale
 */
export function getMonthNames(
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string[] {
  const formatter = getFormatter(locale, { month: style });
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return formatter.format(date);
  });
}

/**
 * Get all weekday names for a locale
 */
export function getWeekdayNames(
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string[] {
  const formatter = getFormatter(locale, { weekday: style });
  // Start from Sunday (Jan 7, 2024 is a Sunday)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, 7 + i);
    return formatter.format(date);
  });
}

/**
 * Check if date is today
 */
export function isToday(date: Date | number | string): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date | number | string): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date | number | string): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    dateObj.getDate() === tomorrow.getDate() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getFullYear() === tomorrow.getFullYear()
  );
}

/**
 * Check if date is in the current week
 */
export function isThisWeek(date: Date | number | string): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return dateObj >= weekStart && dateObj < weekEnd;
}

/**
 * Clear formatter cache
 */
export function clearDateFormatterCache(): void {
  formatterCache.clear();
}
