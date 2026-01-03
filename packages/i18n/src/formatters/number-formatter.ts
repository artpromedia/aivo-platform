/**
 * Number Formatter
 *
 * Locale-aware number formatting including currencies, percentages, and units.
 * Uses Intl.NumberFormat for maximum compatibility.
 */

import { LOCALE_CURRENCIES, LOCALE_METADATA } from '../constants';
import type { SupportedLocale, NumberFormatOptions } from '../types';

/**
 * Formatter cache for performance
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Get cached or create NumberFormat
 */
function getFormatter(
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;

  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

/**
 * Format a number with locale-specific formatting
 */
export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options: NumberFormatOptions = {}
): string {
  const intlOptions: Intl.NumberFormatOptions = {
    style: options.style ?? 'decimal',
    currency: options.currency,
    currencyDisplay: options.currencyDisplay,
    currencySign: options.currencySign,
    notation: options.notation,
    compactDisplay: options.compactDisplay,
    signDisplay: options.signDisplay,
    unit: options.unit,
    unitDisplay: options.unitDisplay,
    minimumIntegerDigits: options.minimumIntegerDigits,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    minimumSignificantDigits: options.minimumSignificantDigits,
    maximumSignificantDigits: options.maximumSignificantDigits,
    useGrouping: options.useGrouping,
    numberingSystem: options.numberingSystem ?? LOCALE_METADATA[locale]?.numberSystem,
    roundingMode: options.roundingMode,
  };

  // Remove undefined values
  const cleanOptions = Object.fromEntries(
    Object.entries(intlOptions).filter(([_, v]) => v !== undefined)
  );

  const formatter = getFormatter(locale, cleanOptions);
  return formatter.format(value);
}

/**
 * Format number to parts
 */
export function formatNumberToParts(
  value: number,
  locale: SupportedLocale,
  options: NumberFormatOptions = {}
): Intl.NumberFormatPart[] {
  const intlOptions: Intl.NumberFormatOptions = {
    style: options.style ?? 'decimal',
    currency: options.currency,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  };

  const formatter = getFormatter(locale, intlOptions);
  return formatter.formatToParts(value);
}

/**
 * Format currency with locale-specific formatting
 */
export function formatCurrency(
  value: number,
  locale: SupportedLocale,
  currency?: string,
  options: Omit<NumberFormatOptions, 'style' | 'currency'> = {}
): string {
  const currencyCode = currency ?? LOCALE_CURRENCIES[locale] ?? 'USD';

  return formatNumber(value, locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    ...options,
  });
}

/**
 * Format currency with narrow symbol
 */
export function formatCurrencyNarrow(
  value: number,
  locale: SupportedLocale,
  currency?: string
): string {
  const currencyCode = currency ?? LOCALE_CURRENCIES[locale] ?? 'USD';

  return formatNumber(value, locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
  });
}

/**
 * Format currency with code
 */
export function formatCurrencyCode(
  value: number,
  locale: SupportedLocale,
  currency?: string
): string {
  const currencyCode = currency ?? LOCALE_CURRENCIES[locale] ?? 'USD';

  return formatNumber(value, locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'code',
  });
}

/**
 * Format as percentage
 */
export function formatPercent(
  value: number,
  locale: SupportedLocale,
  options: Pick<
    NumberFormatOptions,
    'minimumFractionDigits' | 'maximumFractionDigits' | 'signDisplay'
  > = {}
): string {
  return formatNumber(value, locale, {
    style: 'percent',
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    signDisplay: options.signDisplay,
  });
}

/**
 * Format with unit
 */
export function formatUnit(
  value: number,
  unit: string,
  locale: SupportedLocale,
  options: Pick<
    NumberFormatOptions,
    'unitDisplay' | 'minimumFractionDigits' | 'maximumFractionDigits'
  > = {}
): string {
  return formatNumber(value, locale, {
    style: 'unit',
    unit,
    unitDisplay: options.unitDisplay ?? 'short',
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  });
}

/**
 * Format as compact notation (1K, 1M, etc.)
 */
export function formatCompact(
  value: number,
  locale: SupportedLocale,
  options: Pick<NumberFormatOptions, 'compactDisplay' | 'maximumFractionDigits'> = {}
): string {
  return formatNumber(value, locale, {
    notation: 'compact',
    compactDisplay: options.compactDisplay ?? 'short',
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  });
}

/**
 * Format as scientific notation
 */
export function formatScientific(
  value: number,
  locale: SupportedLocale,
  options: Pick<NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> = {}
): string {
  return formatNumber(value, locale, {
    notation: 'scientific',
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
}

/**
 * Format as engineering notation
 */
export function formatEngineering(
  value: number,
  locale: SupportedLocale,
  options: Pick<NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> = {}
): string {
  return formatNumber(value, locale, {
    notation: 'engineering',
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
}

/**
 * Format as ordinal (1st, 2nd, 3rd, etc.)
 * Note: This uses Intl.PluralRules for proper ordinal selection
 */
export function formatOrdinal(value: number, locale: SupportedLocale): string {
  const pluralRules = new Intl.PluralRules(locale, { type: 'ordinal' });
  const ordinalCategory = pluralRules.select(value);

  // English ordinal suffixes
  const englishSuffixes: Record<Intl.LDMLPluralRule, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th',
    zero: 'th',
    many: 'th',
  };

  // For non-English locales, just use the number with a period (common pattern)
  const baseLocale = locale.split('-')[0];
  if (baseLocale !== 'en') {
    return `${formatNumber(value, locale)}.`;
  }

  return `${formatNumber(value, locale)}${englishSuffixes[ordinalCategory]}`;
}

/**
 * Format number with explicit sign
 */
export function formatWithSign(
  value: number,
  locale: SupportedLocale,
  options: Pick<NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> = {}
): string {
  return formatNumber(value, locale, {
    signDisplay: 'always',
    ...options,
  });
}

/**
 * Format as accounting (negative in parentheses)
 */
export function formatAccounting(
  value: number,
  locale: SupportedLocale,
  currency?: string
): string {
  const currencyCode = currency ?? LOCALE_CURRENCIES[locale] ?? 'USD';

  return formatNumber(value, locale, {
    style: 'currency',
    currency: currencyCode,
    currencySign: 'accounting',
  });
}

/**
 * Format file size
 */
export function formatFileSize(
  bytes: number,
  locale: SupportedLocale,
  options: { binary?: boolean; maximumFractionDigits?: number } = {}
): string {
  const { binary = false, maximumFractionDigits = 1 } = options;
  const base = binary ? 1024 : 1000;
  const units = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  if (bytes === 0) return `0 ${units[0]}`;

  const exponent = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(base)),
    units.length - 1
  );
  const value = bytes / Math.pow(base, exponent);
  const unit = units[exponent];

  // Try to use unit format if available
  try {
    return formatNumber(value, locale, {
      style: 'unit',
      unit: binary ? 'byte' : 'byte',
      unitDisplay: 'narrow',
      maximumFractionDigits,
    }).replace('B', unit);
  } catch {
    // Fallback if unit not supported
    return `${formatNumber(value, locale, { maximumFractionDigits })} ${unit}`;
  }
}

/**
 * Format duration in milliseconds to human-readable
 */
export function formatDurationMs(
  milliseconds: number,
  locale: SupportedLocale,
  options: { style?: 'long' | 'short' | 'narrow' } = {}
): string {
  const { style = 'short' } = options;

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const mins = minutes % 60;
    const hrFormat = formatUnit(hours, 'hour', locale, { unitDisplay: style });
    const minFormat = formatUnit(mins, 'minute', locale, { unitDisplay: style });
    return mins > 0 ? `${hrFormat} ${minFormat}` : hrFormat;
  }

  if (minutes > 0) {
    const secs = seconds % 60;
    const minFormat = formatUnit(minutes, 'minute', locale, { unitDisplay: style });
    const secFormat = formatUnit(secs, 'second', locale, { unitDisplay: style });
    return secs > 0 ? `${minFormat} ${secFormat}` : minFormat;
  }

  return formatUnit(seconds, 'second', locale, { unitDisplay: style });
}

/**
 * Parse a locale-formatted number back to a number
 */
export function parseNumber(value: string, locale: SupportedLocale): number | null {
  // Get the locale's number format parts
  const formatter = getFormatter(locale, { style: 'decimal' });
  const parts = formatter.formatToParts(1234.5);

  // Find group and decimal separators
  const groupSeparator = parts.find((p) => p.type === 'group')?.value ?? ',';
  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value ?? '.';

  // Remove group separators and normalize decimal separator
  const normalized = value
    .replace(new RegExp(`[${groupSeparator}]`, 'g'), '')
    .replace(decimalSeparator, '.')
    .replace(/[^\d.-]/g, '');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Clear formatter cache
 */
export function clearNumberFormatterCache(): void {
  formatterCache.clear();
}
