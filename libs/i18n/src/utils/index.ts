/**
 * Internationalization Utilities
 *
 * Helper functions for locale detection, message loading, and formatting.
 */

import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_METADATA,
  type Locale,
  type TranslationMessages,
} from '../constants/index';

/**
 * Check if a locale is RTL
 */
export function isRTLLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}

/**
 * Get text direction for a locale
 */
export function getLocaleDirection(locale: string): 'ltr' | 'rtl' {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Normalize a locale string to a supported locale
 *
 * @example
 * normalizeLocale('en-US') // 'en'
 * normalizeLocale('pt-BR') // 'pt-BR'
 * normalizeLocale('fr-FR') // 'fr'
 */
export function normalizeLocale(locale: string): Locale | null {
  const normalized = locale.toLowerCase().replace('_', '-');

  // Exact match
  if (SUPPORTED_LOCALES.includes(normalized as Locale)) {
    return normalized as Locale;
  }

  // Try with proper casing (e.g., en-GB, pt-BR)
  const parts = normalized.split('-');
  if (parts.length === 2) {
    const cased = `${parts[0]}-${parts[1].toUpperCase()}`;
    if (SUPPORTED_LOCALES.includes(cased as Locale)) {
      return cased as Locale;
    }
  }

  // Fall back to base language
  const baseLanguage = parts[0];
  if (SUPPORTED_LOCALES.includes(baseLanguage as Locale)) {
    return baseLanguage as Locale;
  }

  return null;
}

/**
 * Get the best supported locale from a list of preferred locales
 */
export function getSupportedLocale(preferredLocales: string[]): Locale {
  for (const locale of preferredLocales) {
    const normalized = normalizeLocale(locale);
    if (normalized) {
      return normalized;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Get browser's preferred locale
 */
export function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  // navigator.languages returns an array of preferred languages
  if (navigator.languages && navigator.languages.length > 0) {
    return navigator.languages[0];
  }

  // Fallback to navigator.language
  return navigator.language || DEFAULT_LOCALE;
}

/**
 * Get the best locale based on browser preference and supported locales
 */
export function getPreferredLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLocales = navigator.languages
    ? [...navigator.languages]
    : [navigator.language].filter(Boolean);

  return getSupportedLocale(browserLocales);
}

/**
 * Get the native name of a language
 */
export function getLanguageName(locale: Locale, displayLocale?: Locale): string {
  const metadata = LOCALE_METADATA[locale];
  if (metadata) {
    return displayLocale === 'en' ? metadata.englishName : metadata.name;
  }

  // Fallback to Intl.DisplayNames
  try {
    const displayNames = new Intl.DisplayNames([displayLocale || locale], { type: 'language' });
    return displayNames.of(locale) || locale;
  } catch {
    return locale;
  }
}

/**
 * Get the name of a region/country
 */
export function getRegionName(regionCode: string, locale?: Locale): string {
  try {
    const displayNames = new Intl.DisplayNames([locale || DEFAULT_LOCALE], { type: 'region' });
    return displayNames.of(regionCode) || regionCode;
  } catch {
    return regionCode;
  }
}

/**
 * Synchronously load messages (for pre-loaded bundles)
 */
export function loadMessages(locale: Locale): TranslationMessages {
  // This will be replaced by the actual import at build time
  // For runtime, we return empty and expect async loading
  console.warn(
    `Synchronous message loading for ${locale} not available. Use loadMessagesAsync instead.`
  );
  return {};
}

/**
 * Asynchronously load messages for a locale
 *
 * Uses dynamic imports to lazy-load translation files.
 */
export async function loadMessagesAsync(locale: Locale): Promise<TranslationMessages> {
  try {
    // Dynamic import based on locale
    const messages = await import(`../messages/${locale}.json`);
    return messages.default || messages;
  } catch (error) {
    // If specific locale not found, try base language
    const baseLocale = locale.split('-')[0] as Locale;
    if (baseLocale !== locale) {
      try {
        const messages = await import(`../messages/${baseLocale}.json`);
        return messages.default || messages;
      } catch {
        // Fall through to default
      }
    }

    // Fall back to English
    if (locale !== DEFAULT_LOCALE) {
      console.warn(`Messages for locale ${locale} not found, falling back to ${DEFAULT_LOCALE}`);
      try {
        const messages = await import(`../messages/${DEFAULT_LOCALE}.json`);
        return messages.default || messages;
      } catch {
        // Return empty messages
      }
    }

    console.error(`Failed to load messages for locale ${locale}:`, error);
    return {};
  }
}

/**
 * Format a message with values (simple interpolation without ICU)
 *
 * @example
 * formatMessageWithValues('Hello, {name}!', { name: 'World' }) // 'Hello, World!'
 */
export function formatMessageWithValues(
  message: string,
  values: Record<string, string | number>
): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

/**
 * Simple message interpolation for use outside React context
 *
 * @example
 * interpolateMessage('You have {count} items', { count: 5 }) // 'You have 5 items'
 */
export function interpolateMessage(message: string, values?: Record<string, unknown>): string {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)(?:,\s*\w+(?:,\s*\{[^}]+\})?)?\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined) return match;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }
    return match;
  });
}

/**
 * Get currency code for a locale
 */
export function getCurrencyForLocale(locale: Locale): string {
  const metadata = LOCALE_METADATA[locale];
  return metadata?.currency || 'USD';
}

/**
 * Format a number according to locale (standalone utility)
 */
export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency according to locale (standalone utility)
 */
export function formatCurrency(
  value: number,
  currency: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format date according to locale (standalone utility)
 */
export function formatDate(
  value: Date | number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

/**
 * Format relative time (standalone utility)
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: Locale = DEFAULT_LOCALE
): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
}

/**
 * Parse a locale string into components
 */
export function parseLocale(locale: string): {
  language: string;
  region?: string;
  script?: string;
} {
  const parts = locale.split('-');
  const result: { language: string; region?: string; script?: string } = {
    language: parts[0].toLowerCase(),
  };

  if (parts.length >= 2) {
    // Check if second part is a script (4 letters) or region (2 letters)
    if (parts[1].length === 4) {
      result.script = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
      if (parts.length >= 3) {
        result.region = parts[2].toUpperCase();
      }
    } else {
      result.region = parts[1].toUpperCase();
    }
  }

  return result;
}

/**
 * Check if two locales are compatible (same base language)
 */
export function areLocalesCompatible(locale1: string, locale2: string): boolean {
  const parsed1 = parseLocale(locale1);
  const parsed2 = parseLocale(locale2);
  return parsed1.language === parsed2.language;
}

/**
 * Sort locales by their native names
 */
export function sortLocalesByName(locales: Locale[]): Locale[] {
  return [...locales].sort((a, b) => {
    const nameA = LOCALE_METADATA[a]?.name || a;
    const nameB = LOCALE_METADATA[b]?.name || b;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Group locales by region
 */
export function groupLocalesByRegion(locales: Locale[]): Record<string, Locale[]> {
  return locales.reduce<Record<string, Locale[]>>((groups, locale) => {
    const region = LOCALE_METADATA[locale]?.region || 'Other';
    if (!groups[region]) {
      groups[region] = [];
    }
    groups[region].push(locale);
    return groups;
  }, {});
}
