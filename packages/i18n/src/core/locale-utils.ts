/**
 * Locale Utilities
 *
 * Helper functions for locale detection, parsing, and manipulation.
 */

import { LOCALE_METADATA, LOCALE_CURRENCIES, LOCALE_FLAGS } from '../constants';
import type { SupportedLocale } from '../types';
import { RTL_LOCALES, isRTLLocale } from '../types';

/**
 * Parse a BCP 47 locale tag
 */
export interface ParsedLocale {
  language: string;
  region?: string;
  script?: string;
  full: string;
}

/**
 * Parse a BCP 47 locale string
 */
export function parseLocale(locale: string): ParsedLocale {
  const parts = locale.split('-');
  const result: ParsedLocale = {
    language: parts[0].toLowerCase(),
    full: locale,
  };

  if (parts.length > 1) {
    const second = parts[1];
    // Script codes are 4 letters (e.g., Hans, Hant)
    if (second.length === 4) {
      result.script = second.charAt(0).toUpperCase() + second.slice(1).toLowerCase();
      if (parts[2]) {
        result.region = parts[2].toUpperCase();
      }
    } else {
      result.region = second.toUpperCase();
    }
  }

  return result;
}

/**
 * Normalize a locale string to BCP 47 format
 */
export function normalizeLocale(locale: string): string {
  const parsed = parseLocale(locale);
  let normalized = parsed.language;

  if (parsed.script) {
    normalized += `-${parsed.script}`;
  }

  if (parsed.region) {
    normalized += `-${parsed.region}`;
  }

  return normalized;
}

/**
 * Get the base language from a locale
 */
export function getBaseLanguage(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

/**
 * Check if two locales are compatible (same base language)
 */
export function areLocalesCompatible(locale1: string, locale2: string): boolean {
  return getBaseLanguage(locale1) === getBaseLanguage(locale2);
}

/**
 * Find the best matching supported locale
 */
export function findBestMatch(
  requestedLocale: string,
  supportedLocales: SupportedLocale[],
  fallback: SupportedLocale = 'en'
): SupportedLocale {
  const normalized = normalizeLocale(requestedLocale);

  // Exact match
  if (supportedLocales.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  // Try base language with common regions
  const parsed = parseLocale(normalized);
  const baseLanguage = parsed.language;

  // Find any locale that matches base language
  const baseMatch = supportedLocales.find((loc) => getBaseLanguage(loc) === baseLanguage);

  if (baseMatch) {
    return baseMatch;
  }

  return fallback;
}

/**
 * Get accept-language header locales in preference order
 */
export function parseAcceptLanguage(header: string): string[] {
  if (!header) return [];

  return header
    .split(',')
    .map((part) => {
      const [locale, q = 'q=1'] = part.trim().split(';');
      const quality = parseFloat(q.replace('q=', ''));
      return { locale: locale.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((item) => item.locale);
}

/**
 * Detect locale from browser
 */
export function detectBrowserLocale(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  // navigator.languages provides user's preferred languages
  if (navigator.languages?.length > 0) {
    return navigator.languages[0];
  }

  // Fallback to single language property
  return navigator.language || (navigator as any).userLanguage || null;
}

/**
 * Detect locale from request headers (server-side)
 */
export function detectRequestLocale(
  headers: Record<string, string | undefined>,
  supportedLocales: SupportedLocale[],
  fallback: SupportedLocale = 'en'
): SupportedLocale {
  const acceptLanguage = headers['accept-language'];
  if (!acceptLanguage) {
    return fallback;
  }

  const preferred = parseAcceptLanguage(acceptLanguage);
  for (const locale of preferred) {
    const match = findBestMatch(locale, supportedLocales, fallback);
    if (match !== fallback || locale === fallback) {
      return match;
    }
  }

  return fallback;
}

/**
 * Get locale display name in its native language
 */
export function getLocaleNativeName(locale: SupportedLocale): string {
  return LOCALE_METADATA[locale]?.name ?? locale;
}

/**
 * Get locale display name in English
 */
export function getLocaleEnglishName(locale: SupportedLocale): string {
  return LOCALE_METADATA[locale]?.englishName ?? locale;
}

/**
 * Get locale flag emoji
 */
export function getLocaleFlag(locale: SupportedLocale): string {
  return LOCALE_FLAGS[locale] ?? '🌐';
}

/**
 * Get locale currency code
 */
export function getLocaleCurrency(locale: SupportedLocale): string {
  return LOCALE_CURRENCIES[locale] ?? 'USD';
}

/**
 * Get locale text direction
 */
export function getLocaleDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Get locale number system
 */
export function getLocaleNumberSystem(locale: SupportedLocale): string {
  return LOCALE_METADATA[locale]?.numberSystem ?? 'latn';
}

/**
 * Get locale calendar system
 */
export function getLocaleCalendar(locale: SupportedLocale): string {
  return LOCALE_METADATA[locale]?.calendar ?? 'gregory';
}

/**
 * Get first day of week for locale (0 = Sunday, 1 = Monday, etc.)
 */
export function getFirstDayOfWeek(locale: SupportedLocale): number {
  return LOCALE_METADATA[locale]?.firstDayOfWeek ?? 0;
}

/**
 * Check if locale uses 12-hour time format
 */
export function uses12HourTime(locale: SupportedLocale): boolean {
  const timeFormat = LOCALE_METADATA[locale]?.timeFormat.short ?? '';
  return timeFormat.includes('a') || timeFormat.includes('h');
}

/**
 * Get locale for formatting numbers (e.g., 'en-US' uses ',' for thousands)
 */
export function getNumberLocale(locale: SupportedLocale): string {
  return locale;
}

/**
 * Sort locales by their native names
 */
export function sortLocalesByNativeName(locales: SupportedLocale[]): SupportedLocale[] {
  return [...locales].sort((a, b) => {
    const nameA = getLocaleNativeName(a);
    const nameB = getLocaleNativeName(b);
    return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
  });
}

/**
 * Sort locales by their English names
 */
export function sortLocalesByEnglishName(locales: SupportedLocale[]): SupportedLocale[] {
  return [...locales].sort((a, b) => {
    const nameA = getLocaleEnglishName(a);
    const nameB = getLocaleEnglishName(b);
    return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
  });
}

/**
 * Group locales by base language
 */
export function groupLocalesByLanguage(
  locales: SupportedLocale[]
): Record<string, SupportedLocale[]> {
  return locales.reduce<Record<string, SupportedLocale[]>>((groups, locale) => {
    const base = getBaseLanguage(locale);
    if (!groups[base]) {
      groups[base] = [];
    }
    groups[base].push(locale);
    return groups;
  }, {});
}

/**
 * Filter locales by region
 */
export function filterLocalesByRegion(
  locales: SupportedLocale[],
  region: string
): SupportedLocale[] {
  return locales.filter((locale) => {
    const parsed = parseLocale(locale);
    return parsed.region === region.toUpperCase();
  });
}

/**
 * Get RTL locales from a list
 */
export function getRTLLocales(locales: SupportedLocale[]): SupportedLocale[] {
  return locales.filter(isRTLLocale);
}

/**
 * Get LTR locales from a list
 */
export function getLTRLocales(locales: SupportedLocale[]): SupportedLocale[] {
  return locales.filter((locale) => !isRTLLocale(locale));
}

export { isRTLLocale, RTL_LOCALES };
