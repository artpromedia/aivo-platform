/**
 * List Formatter
 *
 * Locale-aware list formatting (e.g., "A, B, and C" or "A, B, o C").
 * Uses Intl.ListFormat for maximum compatibility.
 */

import type { SupportedLocale } from '../types';

/**
 * Formatter cache for performance
 */
const formatterCache = new Map<string, Intl.ListFormat>();

/**
 * List format options
 */
export interface ListFormatOptions {
  /** List type: 'conjunction' (and), 'disjunction' (or), 'unit' */
  type?: 'conjunction' | 'disjunction' | 'unit';
  /** Style: 'long', 'short', 'narrow' */
  style?: 'long' | 'short' | 'narrow';
}

/**
 * Get cached or create ListFormat
 */
function getFormatter(
  locale: SupportedLocale,
  options: Intl.ListFormatOptions = {}
): Intl.ListFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;

  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.ListFormat(locale, options);
    formatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

/**
 * Format a list of items
 */
export function formatList(
  items: string[],
  locale: SupportedLocale,
  options: ListFormatOptions = {}
): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  const formatter = getFormatter(locale, {
    type: options.type ?? 'conjunction',
    style: options.style ?? 'long',
  });

  return formatter.format(items);
}

/**
 * Format a list with "and" conjunction (A, B, and C)
 */
export function formatConjunction(
  items: string[],
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  return formatList(items, locale, { type: 'conjunction', style });
}

/**
 * Format a list with "or" disjunction (A, B, or C)
 */
export function formatDisjunction(
  items: string[],
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  return formatList(items, locale, { type: 'disjunction', style });
}

/**
 * Format a list of units (3 ft, 7 in)
 */
export function formatUnitList(
  items: string[],
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'short'
): string {
  return formatList(items, locale, { type: 'unit', style });
}

/**
 * Format list to parts
 */
export function formatListToParts(
  items: string[],
  locale: SupportedLocale,
  options: ListFormatOptions = {}
): Intl.ListFormatPart[] {
  if (items.length === 0) {
    return [];
  }

  if (items.length === 1) {
    return [{ type: 'element', value: items[0] }];
  }

  const formatter = getFormatter(locale, {
    type: options.type ?? 'conjunction',
    style: options.style ?? 'long',
  });

  return formatter.formatToParts(items);
}

/**
 * Format a list with a custom separator
 */
export function formatWithSeparator(items: string[], separator: string): string {
  return items.join(separator);
}

/**
 * Format a list with comma separator (locale-aware)
 */
export function formatCommaSeparated(items: string[], locale: SupportedLocale): string {
  if (items.length === 0) {
    return '';
  }

  // Get the locale's list separator
  const parts = formatListToParts(['a', 'b'], locale, { type: 'unit' });
  const separator = parts.find((p) => p.type === 'literal')?.value ?? ', ';

  return items.join(separator);
}

/**
 * Truncate a list with "and X more"
 */
export function formatTruncatedList(
  items: string[],
  maxItems: number,
  locale: SupportedLocale,
  options: ListFormatOptions & {
    moreText?: (count: number) => string;
  } = {}
): string {
  if (items.length <= maxItems) {
    return formatList(items, locale, options);
  }

  const visibleItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  const moreText = options.moreText ? options.moreText(remainingCount) : `+${remainingCount} more`;

  return formatList([...visibleItems, moreText], locale, options);
}

/**
 * Format a list with Oxford comma (for supported languages)
 * Note: This is primarily for English; other languages have their own rules
 */
export function formatWithOxfordComma(items: string[], locale: SupportedLocale): string {
  // Intl.ListFormat handles this automatically for supported locales
  return formatConjunction(items, locale, 'long');
}

/**
 * Format as bullet list
 */
export function formatBulletList(items: string[], bullet = '•'): string {
  return items.map((item) => `${bullet} ${item}`).join('\n');
}

/**
 * Format as numbered list
 */
export function formatNumberedList(
  items: string[],
  locale: SupportedLocale,
  options: { startFrom?: number; parenthesis?: boolean } = {}
): string {
  const { startFrom = 1, parenthesis = false } = options;
  const numberFormatter = new Intl.NumberFormat(locale);

  return items
    .map((item, index) => {
      const num = numberFormatter.format(startFrom + index);
      const prefix = parenthesis ? `${num})` : `${num}.`;
      return `${prefix} ${item}`;
    })
    .join('\n');
}

/**
 * Format as inline options (e.g., "Choose: A | B | C")
 */
export function formatInlineOptions(items: string[], separator = ' | '): string {
  return items.join(separator);
}

/**
 * Clear formatter cache
 */
export function clearListFormatterCache(): void {
  formatterCache.clear();
}
