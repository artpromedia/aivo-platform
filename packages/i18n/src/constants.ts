/**
 * Locale Metadata Constants
 *
 * Comprehensive metadata for all supported locales including:
 * - Native and English names
 * - Text direction (LTR/RTL)
 * - Date/time formats
 * - Number systems
 * - Plural rules
 */

import type { LocaleMetadata, SupportedLocale } from './types';

/**
 * Complete locale metadata for all supported languages
 */
export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  // English
  en: {
    code: 'en',
    name: 'English',
    englishName: 'English',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'M/d/yyyy',
      medium: 'MMM d, yyyy',
      long: 'MMMM d, yyyy',
    },
    timeFormat: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },
  'en-US': {
    code: 'en-US',
    name: 'English (US)',
    englishName: 'English (US)',
    direction: 'ltr',
    region: 'US',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'M/d/yyyy',
      medium: 'MMM d, yyyy',
      long: 'MMMM d, yyyy',
    },
    timeFormat: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },
  'en-GB': {
    code: 'en-GB',
    name: 'English (UK)',
    englishName: 'English (UK)',
    direction: 'ltr',
    region: 'GB',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },

  // Spanish
  es: {
    code: 'es',
    name: 'Español',
    englishName: 'Spanish',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd de MMMM de yyyy',
    },
    timeFormat: {
      short: 'H:mm',
      medium: 'H:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },
  'es-MX': {
    code: 'es-MX',
    name: 'Español (México)',
    englishName: 'Spanish (Mexico)',
    direction: 'ltr',
    region: 'MX',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd de MMMM de yyyy',
    },
    timeFormat: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español (España)',
    englishName: 'Spanish (Spain)',
    direction: 'ltr',
    region: 'ES',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd de MMMM de yyyy',
    },
    timeFormat: {
      short: 'H:mm',
      medium: 'H:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },

  // French
  fr: {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },
  'fr-CA': {
    code: 'fr-CA',
    name: 'Français (Canada)',
    englishName: 'French (Canada)',
    direction: 'ltr',
    region: 'CA',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'yyyy-MM-dd',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },

  // German
  de: {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd.MM.yyyy',
      medium: 'd. MMM yyyy',
      long: 'd. MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },

  // Portuguese
  pt: {
    code: 'pt',
    name: 'Português',
    englishName: 'Portuguese',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd de MMM de yyyy',
      long: 'd de MMMM de yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    direction: 'ltr',
    region: 'BR',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd de MMM de yyyy',
      long: 'd de MMMM de yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },

  // Chinese
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    englishName: 'Chinese (Simplified)',
    direction: 'ltr',
    region: 'CN',
    script: 'Hans',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'yyyy/M/d',
      medium: 'yyyy年M月d日',
      long: 'yyyy年M月d日',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['other'],
  },
  'zh-TW': {
    code: 'zh-TW',
    name: '繁體中文',
    englishName: 'Chinese (Traditional)',
    direction: 'ltr',
    region: 'TW',
    script: 'Hant',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'yyyy/M/d',
      medium: 'yyyy年M月d日',
      long: 'yyyy年M月d日',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['other'],
  },

  // Japanese
  ja: {
    code: 'ja',
    name: '日本語',
    englishName: 'Japanese',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'yyyy/MM/dd',
      medium: 'yyyy年M月d日',
      long: 'yyyy年M月d日',
    },
    timeFormat: {
      short: 'H:mm',
      medium: 'H:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['other'],
  },

  // Korean
  ko: {
    code: 'ko',
    name: '한국어',
    englishName: 'Korean',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'yyyy. M. d.',
      medium: 'yyyy년 M월 d일',
      long: 'yyyy년 M월 d일',
    },
    timeFormat: {
      short: 'a h:mm',
      medium: 'a h:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['other'],
  },

  // Arabic
  ar: {
    code: 'ar',
    name: 'العربية',
    englishName: 'Arabic',
    direction: 'rtl',
    numberSystem: 'arab',
    calendar: 'gregory',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    },
    firstDayOfWeek: 6,
    pluralRules: ['zero', 'one', 'two', 'few', 'many', 'other'],
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'العربية (السعودية)',
    englishName: 'Arabic (Saudi Arabia)',
    direction: 'rtl',
    region: 'SA',
    numberSystem: 'arab',
    calendar: 'islamic-umalqura',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    },
    firstDayOfWeek: 6,
    pluralRules: ['zero', 'one', 'two', 'few', 'many', 'other'],
  },

  // Hebrew
  he: {
    code: 'he',
    name: 'עברית',
    englishName: 'Hebrew',
    direction: 'rtl',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'd.M.yyyy',
      medium: 'd בMMM yyyy',
      long: 'd בMMMM yyyy',
    },
    timeFormat: {
      short: 'H:mm',
      medium: 'H:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'two', 'other'],
  },

  // Hindi
  hi: {
    code: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    direction: 'ltr',
    numberSystem: 'deva',
    calendar: 'gregory',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    },
    firstDayOfWeek: 0,
    pluralRules: ['one', 'other'],
  },

  // Indonesian
  id: {
    code: 'id',
    name: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH.mm',
      medium: 'HH.mm.ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['other'],
  },

  // Vietnamese
  vi: {
    code: 'vi',
    name: 'Tiếng Việt',
    englishName: 'Vietnamese',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd MMM, yyyy',
      long: 'd MMMM, yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['other'],
  },

  // Russian
  ru: {
    code: 'ru',
    name: 'Русский',
    englishName: 'Russian',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd.MM.yyyy',
      medium: 'd MMM yyyy г.',
      long: 'd MMMM yyyy г.',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'few', 'many', 'other'],
  },

  // Turkish
  tr: {
    code: 'tr',
    name: 'Türkçe',
    englishName: 'Turkish',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'd.MM.yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },

  // Polish
  pl: {
    code: 'pl',
    name: 'Polski',
    englishName: 'Polish',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd.MM.yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'few', 'many', 'other'],
  },

  // Dutch
  nl: {
    code: 'nl',
    name: 'Nederlands',
    englishName: 'Dutch',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'd-M-yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },

  // Italian
  it: {
    code: 'it',
    name: 'Italiano',
    englishName: 'Italian',
    direction: 'ltr',
    numberSystem: 'latn',
    calendar: 'gregory',
    dateFormat: {
      short: 'dd/MM/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 1,
    pluralRules: ['one', 'other'],
  },

  // Thai
  th: {
    code: 'th',
    name: 'ไทย',
    englishName: 'Thai',
    direction: 'ltr',
    numberSystem: 'thai',
    calendar: 'buddhist',
    dateFormat: {
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    },
    firstDayOfWeek: 0,
    pluralRules: ['other'],
  },
};

/**
 * Default i18n configuration
 */
export const DEFAULT_I18N_CONFIG = {
  defaultLocale: 'en' as SupportedLocale,
  fallbackLocale: 'en' as SupportedLocale,
  supportedLocales: Object.keys(LOCALE_METADATA) as SupportedLocale[],
  loadPath: '/locales/{{lng}}/{{ns}}.json',
  namespaces: ['common'] as const,
  defaultNamespace: 'common' as const,
  debug: false,
  detection: {
    order: ['localStorage', 'cookie', 'navigator'] as const,
    caches: ['localStorage'] as const,
    localStorageKey: 'aivo_locale',
    cookieName: 'aivo_locale',
  },
  interpolation: {
    escapeValue: true,
    prefix: '{',
    suffix: '}',
  },
};

/**
 * Currency codes by locale
 */
export const LOCALE_CURRENCIES: Record<SupportedLocale, string> = {
  en: 'USD',
  'en-US': 'USD',
  'en-GB': 'GBP',
  es: 'EUR',
  'es-MX': 'MXN',
  'es-ES': 'EUR',
  fr: 'EUR',
  'fr-CA': 'CAD',
  de: 'EUR',
  pt: 'EUR',
  'pt-BR': 'BRL',
  'zh-CN': 'CNY',
  'zh-TW': 'TWD',
  ja: 'JPY',
  ko: 'KRW',
  ar: 'SAR',
  'ar-SA': 'SAR',
  he: 'ILS',
  hi: 'INR',
  id: 'IDR',
  vi: 'VND',
  ru: 'RUB',
  tr: 'TRY',
  pl: 'PLN',
  nl: 'EUR',
  it: 'EUR',
  th: 'THB',
};

/**
 * Locale flag emojis
 */
export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: '🇺🇸',
  'en-US': '🇺🇸',
  'en-GB': '🇬🇧',
  es: '🇪🇸',
  'es-MX': '🇲🇽',
  'es-ES': '🇪🇸',
  fr: '🇫🇷',
  'fr-CA': '🇨🇦',
  de: '🇩🇪',
  pt: '🇵🇹',
  'pt-BR': '🇧🇷',
  'zh-CN': '🇨🇳',
  'zh-TW': '🇹🇼',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ar: '🇸🇦',
  'ar-SA': '🇸🇦',
  he: '🇮🇱',
  hi: '🇮🇳',
  id: '🇮🇩',
  vi: '🇻🇳',
  ru: '🇷🇺',
  tr: '🇹🇷',
  pl: '🇵🇱',
  nl: '🇳🇱',
  it: '🇮🇹',
  th: '🇹🇭',
};
