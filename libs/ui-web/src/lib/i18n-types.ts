/**
 * Local i18n type definitions and utilities for ui-web.
 *
 * Provides the locale types, metadata, and utility functions used by
 * LocaleProvider and LocaleSwitcher components.
 */

export type Locale =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt-BR'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'hi'
  | 'id'
  | 'ru'
  | 'tr'
  | 'nl'
  | 'it'
  | 'sw';

export interface LocaleMetadata {
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  region?: string;
}

export type TranslationMessages = Record<string, string>;

export const SUPPORTED_LOCALES: Locale[] = [
  'en',
  'es',
  'fr',
  'de',
  'pt-BR',
  'zh',
  'ja',
  'ko',
  'ar',
  'hi',
  'id',
  'ru',
  'tr',
  'nl',
  'it',
  'sw',
];

export const DEFAULT_LOCALE: Locale = 'en';

export const RTL_LOCALES: Locale[] = ['ar'];

export const LOCALE_METADATA: Record<Locale, LocaleMetadata> = {
  en: { name: 'English', nativeName: 'English', flag: '\u{1F1FA}\u{1F1F8}', direction: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}', direction: 'ltr' },
  fr: { name: 'French', nativeName: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', direction: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}', direction: 'ltr' },
  'pt-BR': {
    name: 'Portuguese (Brazil)',
    nativeName: 'Portugu\u00eas (Brasil)',
    flag: '\u{1F1E7}\u{1F1F7}',
    direction: 'ltr',
  },
  zh: {
    name: 'Chinese',
    nativeName: '\u7B80\u4F53\u4E2D\u6587',
    flag: '\u{1F1E8}\u{1F1F3}',
    direction: 'ltr',
  },
  ja: {
    name: 'Japanese',
    nativeName: '\u65E5\u672C\u8A9E',
    flag: '\u{1F1EF}\u{1F1F5}',
    direction: 'ltr',
  },
  ko: {
    name: 'Korean',
    nativeName: '\uD55C\uAD6D\uC5B4',
    flag: '\u{1F1F0}\u{1F1F7}',
    direction: 'ltr',
  },
  ar: {
    name: 'Arabic',
    nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
    flag: '\u{1F1F8}\u{1F1E6}',
    direction: 'rtl',
  },
  hi: {
    name: 'Hindi',
    nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940',
    flag: '\u{1F1EE}\u{1F1F3}',
    direction: 'ltr',
  },
  id: {
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '\u{1F1EE}\u{1F1E9}',
    direction: 'ltr',
  },
  ru: {
    name: 'Russian',
    nativeName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
    flag: '\u{1F1F7}\u{1F1FA}',
    direction: 'ltr',
  },
  tr: {
    name: 'Turkish',
    nativeName: 'T\u00FCrk\u00E7e',
    flag: '\u{1F1F9}\u{1F1F7}',
    direction: 'ltr',
  },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '\u{1F1F3}\u{1F1F1}', direction: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}', direction: 'ltr' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '\u{1F1F0}\u{1F1EA}', direction: 'ltr' },
};

export function isRTLLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale) || locale.startsWith('ar');
}

export function getBrowserLocale(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.languages?.[0] ?? navigator.language ?? null;
}

export function getSupportedLocale(locale: string): Locale | null {
  if (SUPPORTED_LOCALES.includes(locale as Locale)) return locale as Locale;
  const base = locale.split('-')[0];
  return SUPPORTED_LOCALES.find((l) => l === base || l.startsWith(base + '-')) ?? null;
}

export async function getMessages(_locale: Locale): Promise<TranslationMessages> {
  return {};
}
