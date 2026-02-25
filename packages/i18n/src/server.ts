/**
 * Server-side locale detection for Next.js server components and layouts.
 *
 * Reads the locale from cookies (set by middleware or LanguageSwitcher)
 * and falls back to 'en'.
 *
 * Usage in layout.tsx:
 *   import { getLocale, getDirection } from '@aivo/i18n/server';
 *   const locale = getLocale();
 *   <html lang={locale} dir={getDirection(locale)}>
 */

import { cookies, headers } from 'next/headers';

const UI_LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'] as const;
type UILocale = (typeof UI_LOCALES)[number];

const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_HEADER = 'x-aivo-locale';
const RTL_LOCALES = new Set<string>(['ar']);

function isUILocale(value: string): value is UILocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}

/**
 * Get the current locale from request context (cookie → header → 'en').
 */
export async function getLocale(): Promise<UILocale> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(LOCALE_COOKIE)?.value;
    if (cookieVal && isUILocale(cookieVal)) return cookieVal;
  } catch {
    // cookies() not available (e.g. static generation)
  }

  try {
    const headerStore = await headers();
    const headerVal = headerStore.get(LOCALE_HEADER);
    if (headerVal && isUILocale(headerVal)) return headerVal;
  } catch {
    // headers() not available
  }

  return 'en';
}

/**
 * Get text direction for a locale code.
 */
export function getDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

export { LOCALE_COOKIE, LOCALE_HEADER, UI_LOCALES, isUILocale };
export type { UILocale };
