/**
 * Message Format Utilities
 *
 * ICU MessageFormat helpers for pluralization, selection, and interpolation.
 */

import IntlMessageFormat from 'intl-messageformat';

import type { SupportedLocale, PluralCategory } from '../types';

/**
 * Cache for compiled message formats
 */
const formatCache = new Map<string, IntlMessageFormat>();

/**
 * Maximum cache size to prevent memory leaks
 */
const MAX_CACHE_SIZE = 1000;

/**
 * Get cached or compile message format
 */
export function getMessageFormat(message: string, locale: SupportedLocale): IntlMessageFormat {
  const cacheKey = `${locale}:${message}`;

  let format = formatCache.get(cacheKey);
  if (!format) {
    // Evict old entries if cache is full
    if (formatCache.size >= MAX_CACHE_SIZE) {
      const firstKey = formatCache.keys().next().value;
      if (firstKey) {
        formatCache.delete(firstKey);
      }
    }

    format = new IntlMessageFormat(message, locale);
    formatCache.set(cacheKey, format);
  }

  return format;
}

/**
 * Format a message with values
 */
export function formatMessage(
  message: string,
  values: Record<string, any>,
  locale: SupportedLocale
): string {
  try {
    const format = getMessageFormat(message, locale);
    return format.format(values) as string;
  } catch (error) {
    console.error('Failed to format message:', message, error);
    return message;
  }
}

/**
 * Get plural category for a number
 */
export function getPluralCategory(
  count: number,
  locale: SupportedLocale,
  options: { type?: 'cardinal' | 'ordinal' } = {}
): PluralCategory {
  const pluralRules = new Intl.PluralRules(locale, { type: options.type ?? 'cardinal' });
  return pluralRules.select(count) as PluralCategory;
}

/**
 * Format a plural message
 */
export function formatPlural(
  count: number,
  forms: Partial<Record<PluralCategory, string>>,
  locale: SupportedLocale
): string {
  const category = getPluralCategory(count, locale);
  return forms[category] ?? forms.other ?? String(count);
}

/**
 * Create an ICU plural message string
 */
export function createPluralMessage(
  forms: Partial<Record<PluralCategory, string>>,
  variable = 'count'
): string {
  const parts = Object.entries(forms)
    .map(([category, text]) => `${category} {${text}}`)
    .join(' ');

  return `{${variable}, plural, ${parts}}`;
}

/**
 * Create an ICU select message string
 */
export function createSelectMessage(options: Record<string, string>, variable = 'type'): string {
  const parts = Object.entries(options)
    .map(([key, text]) => `${key} {${text}}`)
    .join(' ');

  return `{${variable}, select, ${parts}}`;
}

/**
 * Create an ICU selectordinal message string
 */
export function createOrdinalMessage(
  forms: Partial<Record<PluralCategory, string>>,
  variable = 'count'
): string {
  const parts = Object.entries(forms)
    .map(([category, text]) => `${category} {${text}}`)
    .join(' ');

  return `{${variable}, selectordinal, ${parts}}`;
}

/**
 * Parse an ICU message to extract variable names
 */
export function extractVariables(message: string): string[] {
  const variables = new Set<string>();
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)/g;

  let match;
  while ((match = regex.exec(message)) !== null) {
    // Skip ICU format keywords
    const keyword = match[1];
    if (!['plural', 'select', 'selectordinal', 'number', 'date', 'time'].includes(keyword)) {
      variables.add(keyword);
    }
  }

  return Array.from(variables);
}

/**
 * Validate ICU message syntax
 */
export function validateMessage(
  message: string,
  locale: SupportedLocale = 'en'
): { valid: boolean; error?: string } {
  try {
    new IntlMessageFormat(message, locale);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid message format',
    };
  }
}

/**
 * Escape special characters in interpolation values
 */
export function escapeValue(value: string): string {
  return value.replace(/'/g, "''").replace(/\{/g, "'{").replace(/\}/g, "}'");
}

/**
 * Unescape special characters
 */
export function unescapeValue(value: string): string {
  return value.replace(/''/g, "'").replace(/'\{/g, '{').replace(/\}'/g, '}');
}

/**
 * Convert simple template syntax to ICU format
 * e.g., "Hello {{name}}" -> "Hello {name}"
 */
export function convertToICU(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, '{$1}');
}

/**
 * Convert ICU format to simple template syntax
 * e.g., "Hello {name}" -> "Hello {{name}}"
 */
export function convertFromICU(message: string): string {
  // Only convert simple variable interpolation, not ICU patterns
  return message.replace(
    /\{(\w+)\}(?!\s*,\s*(plural|select|selectordinal|number|date|time))/g,
    '{{$1}}'
  );
}

/**
 * Clear the message format cache
 */
export function clearCache(): void {
  formatCache.clear();
}

/**
 * Get current cache size
 */
export function getCacheSize(): number {
  return formatCache.size;
}
