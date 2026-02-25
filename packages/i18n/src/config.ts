/**
 * i18n Configuration
 *
 * Simplified configuration for the 10 primary UI locales.
 * Designed for use with next-intl and the LanguageSwitcher component.
 */

import type { SupportedLocale } from './types';
import { isRTLLocale } from './types';

/** The 10 primary locales exposed in the Language Switcher UI */
export const UI_LOCALES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'zh',
  'ja',
  'ko',
  'hi',
] as const;

export type UILocale = (typeof UI_LOCALES)[number];

/** Display metadata for each UI locale */
export const LOCALE_DISPLAY: Record<UILocale, { name: string; nativeName: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
};

/** Default locale when none can be detected */
export const UI_DEFAULT_LOCALE: UILocale = 'en';

/** Cookie name used to persist the user's chosen locale */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** HTTP header used by middleware to pass the detected locale */
export const LOCALE_HEADER = 'x-aivo-locale';

/**
 * Check whether a string is a valid UI locale code.
 */
export function isUILocale(value: string): value is UILocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}

/**
 * Get the text direction for a locale.
 */
export function getLocaleDirection(locale: string): 'ltr' | 'rtl' {
  if (isUILocale(locale)) {
    return LOCALE_DISPLAY[locale].dir;
  }
  // Fall back to the full SupportedLocale type check
  try {
    return isRTLLocale(locale as SupportedLocale) ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

/**
 * Resolve an Accept-Language header or browser locale string to the best
 * matching UI locale.
 */
export function resolveUILocale(acceptLanguage: string | null | undefined): UILocale {
  if (!acceptLanguage) return UI_DEFAULT_LOCALE;

  // Parse quality values: "en-US,en;q=0.9,fr;q=0.8"
  const candidates = acceptLanguage
    .split(',')
    .map((entry) => {
      const [lang, q] = entry.trim().split(';q=');
      return { lang: lang.trim().toLowerCase(), quality: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { lang } of candidates) {
    // Exact match
    if (isUILocale(lang)) return lang;
    // Language prefix match  (e.g. "pt-BR" → "pt")
    const prefix = lang.split('-')[0];
    if (isUILocale(prefix)) return prefix;
    // Map zh-* to zh
    if (prefix === 'zh') return 'zh';
  }

  return UI_DEFAULT_LOCALE;
}

/**
 * Load locale messages for a given locale code.
 * Returns the translation dictionary from the static JSON files.
 */
export async function loadLocaleMessages(locale: UILocale): Promise<Record<string, unknown>> {
  const { locales } = await import('./locales/index');
  return (locales[locale] ?? locales.en) as unknown as Record<string, unknown>;
}
