/**
 * Internationalization Constants
 *
 * Defines all supported locales, RTL languages, and locale metadata
 * for the AIVO platform covering 27 languages across 6 continents.
 */

/**
 * All supported locale codes (BCP 47 format)
 */
export const SUPPORTED_LOCALES = [
  // Major World Languages
  'en', // English (default)
  'en-GB', // English (UK)
  'en-AU', // English (Australia)
  'es', // Spanish
  'es-MX', // Spanish (Mexico)
  'es-AR', // Spanish (Argentina)
  'fr', // French
  'fr-CA', // French (Canada)
  'pt', // Portuguese
  'pt-BR', // Portuguese (Brazil)
  'de', // German
  'it', // Italian
  'nl', // Dutch

  // Asian Languages
  'zh', // Chinese (Simplified)
  'zh-TW', // Chinese (Traditional)
  'ja', // Japanese
  'ko', // Korean
  'hi', // Hindi
  'bn', // Bengali
  'ta', // Tamil
  'vi', // Vietnamese
  'th', // Thai
  'id', // Indonesian
  'ms', // Malay

  // African Languages
  'sw', // Swahili
  'ha', // Hausa
  'yo', // Yoruba
  'am', // Amharic
  'zu', // Zulu
  'ig', // Igbo

  // Middle Eastern / RTL Languages
  'ar', // Arabic
  'ar-SA', // Arabic (Saudi Arabia)
  'ar-EG', // Arabic (Egypt)
  'he', // Hebrew
  'fa', // Persian/Farsi
  'ur', // Urdu

  // European Languages
  'ru', // Russian
  'pl', // Polish
  'uk', // Ukrainian
  'tr', // Turkish
  'el', // Greek
  'cs', // Czech
  'ro', // Romanian
  'hu', // Hungarian
  'sv', // Swedish
  'da', // Danish
  'no', // Norwegian
  'fi', // Finnish
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Default fallback locale
 */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Right-to-left locales
 */
export const RTL_LOCALES: Locale[] = ['ar', 'ar-SA', 'ar-EG', 'he', 'fa', 'ur'];

/**
 * Metadata for each supported locale
 */
export interface LocaleMetadata {
  code: Locale;
  name: string; // Native name
  englishName: string; // English name
  region: string; // Geographic region
  script: string; // Writing script
  direction: 'ltr' | 'rtl';
  numberSystem: string; // Default number system
  dateFormat: string; // Common date format pattern
  currency: string; // Default currency code
  flag: string; // Flag emoji
}

export const LOCALE_METADATA: Record<Locale, LocaleMetadata> = {
  // English variants
  en: {
    code: 'en',
    name: 'English',
    englishName: 'English',
    region: 'Global',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    flag: '🇺🇸',
  },
  'en-GB': {
    code: 'en-GB',
    name: 'English (UK)',
    englishName: 'English (United Kingdom)',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'GBP',
    flag: '🇬🇧',
  },
  'en-AU': {
    code: 'en-AU',
    name: 'English (Australia)',
    englishName: 'English (Australia)',
    region: 'Oceania',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'AUD',
    flag: '🇦🇺',
  },

  // Spanish variants
  es: {
    code: 'es',
    name: 'Español',
    englishName: 'Spanish',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    flag: '🇪🇸',
  },
  'es-MX': {
    code: 'es-MX',
    name: 'Español (México)',
    englishName: 'Spanish (Mexico)',
    region: 'North America',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'MXN',
    flag: '🇲🇽',
  },
  'es-AR': {
    code: 'es-AR',
    name: 'Español (Argentina)',
    englishName: 'Spanish (Argentina)',
    region: 'South America',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'ARS',
    flag: '🇦🇷',
  },

  // French variants
  fr: {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    flag: '🇫🇷',
  },
  'fr-CA': {
    code: 'fr-CA',
    name: 'Français (Canada)',
    englishName: 'French (Canada)',
    region: 'North America',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy-MM-dd',
    currency: 'CAD',
    flag: '🇨🇦',
  },

  // Portuguese variants
  pt: {
    code: 'pt',
    name: 'Português',
    englishName: 'Portuguese',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    flag: '🇵🇹',
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    region: 'South America',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'BRL',
    flag: '🇧🇷',
  },

  // Other European languages
  de: {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'EUR',
    flag: '🇩🇪',
  },
  it: {
    code: 'it',
    name: 'Italiano',
    englishName: 'Italian',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    flag: '🇮🇹',
  },
  nl: {
    code: 'nl',
    name: 'Nederlands',
    englishName: 'Dutch',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd-MM-yyyy',
    currency: 'EUR',
    flag: '🇳🇱',
  },
  ru: {
    code: 'ru',
    name: 'Русский',
    englishName: 'Russian',
    region: 'Europe',
    script: 'Cyrillic',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'RUB',
    flag: '🇷🇺',
  },
  pl: {
    code: 'pl',
    name: 'Polski',
    englishName: 'Polish',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'PLN',
    flag: '🇵🇱',
  },
  uk: {
    code: 'uk',
    name: 'Українська',
    englishName: 'Ukrainian',
    region: 'Europe',
    script: 'Cyrillic',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'UAH',
    flag: '🇺🇦',
  },
  tr: {
    code: 'tr',
    name: 'Türkçe',
    englishName: 'Turkish',
    region: 'Europe/Asia',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'TRY',
    flag: '🇹🇷',
  },
  el: {
    code: 'el',
    name: 'Ελληνικά',
    englishName: 'Greek',
    region: 'Europe',
    script: 'Greek',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    flag: '🇬🇷',
  },
  cs: {
    code: 'cs',
    name: 'Čeština',
    englishName: 'Czech',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'CZK',
    flag: '🇨🇿',
  },
  ro: {
    code: 'ro',
    name: 'Română',
    englishName: 'Romanian',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'RON',
    flag: '🇷🇴',
  },
  hu: {
    code: 'hu',
    name: 'Magyar',
    englishName: 'Hungarian',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy.MM.dd',
    currency: 'HUF',
    flag: '🇭🇺',
  },
  sv: {
    code: 'sv',
    name: 'Svenska',
    englishName: 'Swedish',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy-MM-dd',
    currency: 'SEK',
    flag: '🇸🇪',
  },
  da: {
    code: 'da',
    name: 'Dansk',
    englishName: 'Danish',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd-MM-yyyy',
    currency: 'DKK',
    flag: '🇩🇰',
  },
  no: {
    code: 'no',
    name: 'Norsk',
    englishName: 'Norwegian',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'NOK',
    flag: '🇳🇴',
  },
  fi: {
    code: 'fi',
    name: 'Suomi',
    englishName: 'Finnish',
    region: 'Europe',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd.MM.yyyy',
    currency: 'EUR',
    flag: '🇫🇮',
  },

  // Asian Languages
  zh: {
    code: 'zh',
    name: '中文',
    englishName: 'Chinese (Simplified)',
    region: 'Asia',
    script: 'Han (Simplified)',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy/MM/dd',
    currency: 'CNY',
    flag: '🇨🇳',
  },
  'zh-TW': {
    code: 'zh-TW',
    name: '繁體中文',
    englishName: 'Chinese (Traditional)',
    region: 'Asia',
    script: 'Han (Traditional)',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy/MM/dd',
    currency: 'TWD',
    flag: '🇹🇼',
  },
  ja: {
    code: 'ja',
    name: '日本語',
    englishName: 'Japanese',
    region: 'Asia',
    script: 'Japanese',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy/MM/dd',
    currency: 'JPY',
    flag: '🇯🇵',
  },
  ko: {
    code: 'ko',
    name: '한국어',
    englishName: 'Korean',
    region: 'Asia',
    script: 'Hangul',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'yyyy.MM.dd',
    currency: 'KRW',
    flag: '🇰🇷',
  },
  hi: {
    code: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    region: 'Asia',
    script: 'Devanagari',
    direction: 'ltr',
    numberSystem: 'deva',
    dateFormat: 'dd/MM/yyyy',
    currency: 'INR',
    flag: '🇮🇳',
  },
  bn: {
    code: 'bn',
    name: 'বাংলা',
    englishName: 'Bengali',
    region: 'Asia',
    script: 'Bengali',
    direction: 'ltr',
    numberSystem: 'beng',
    dateFormat: 'dd/MM/yyyy',
    currency: 'BDT',
    flag: '🇧🇩',
  },
  ta: {
    code: 'ta',
    name: 'தமிழ்',
    englishName: 'Tamil',
    region: 'Asia',
    script: 'Tamil',
    direction: 'ltr',
    numberSystem: 'tamldec',
    dateFormat: 'dd/MM/yyyy',
    currency: 'INR',
    flag: '🇮🇳',
  },
  vi: {
    code: 'vi',
    name: 'Tiếng Việt',
    englishName: 'Vietnamese',
    region: 'Asia',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'VND',
    flag: '🇻🇳',
  },
  th: {
    code: 'th',
    name: 'ไทย',
    englishName: 'Thai',
    region: 'Asia',
    script: 'Thai',
    direction: 'ltr',
    numberSystem: 'thai',
    dateFormat: 'dd/MM/yyyy',
    currency: 'THB',
    flag: '🇹🇭',
  },
  id: {
    code: 'id',
    name: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    region: 'Asia',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'IDR',
    flag: '🇮🇩',
  },
  ms: {
    code: 'ms',
    name: 'Bahasa Melayu',
    englishName: 'Malay',
    region: 'Asia',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'MYR',
    flag: '🇲🇾',
  },

  // African Languages
  sw: {
    code: 'sw',
    name: 'Kiswahili',
    englishName: 'Swahili',
    region: 'Africa',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'KES',
    flag: '🇰🇪',
  },
  ha: {
    code: 'ha',
    name: 'Hausa',
    englishName: 'Hausa',
    region: 'Africa',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'NGN',
    flag: '🇳🇬',
  },
  yo: {
    code: 'yo',
    name: 'Yorùbá',
    englishName: 'Yoruba',
    region: 'Africa',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'NGN',
    flag: '🇳🇬',
  },
  am: {
    code: 'am',
    name: 'አማርኛ',
    englishName: 'Amharic',
    region: 'Africa',
    script: 'Ethiopic',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'ETB',
    flag: '🇪🇹',
  },
  zu: {
    code: 'zu',
    name: 'isiZulu',
    englishName: 'Zulu',
    region: 'Africa',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'ZAR',
    flag: '🇿🇦',
  },
  ig: {
    code: 'ig',
    name: 'Igbo',
    englishName: 'Igbo',
    region: 'Africa',
    script: 'Latin',
    direction: 'ltr',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'NGN',
    flag: '🇳🇬',
  },

  // RTL Languages
  ar: {
    code: 'ar',
    name: 'العربية',
    englishName: 'Arabic',
    region: 'Middle East',
    script: 'Arabic',
    direction: 'rtl',
    numberSystem: 'arab',
    dateFormat: 'dd/MM/yyyy',
    currency: 'AED',
    flag: '🇦🇪',
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'العربية (السعودية)',
    englishName: 'Arabic (Saudi Arabia)',
    region: 'Middle East',
    script: 'Arabic',
    direction: 'rtl',
    numberSystem: 'arab',
    dateFormat: 'dd/MM/yyyy',
    currency: 'SAR',
    flag: '🇸🇦',
  },
  'ar-EG': {
    code: 'ar-EG',
    name: 'العربية (مصر)',
    englishName: 'Arabic (Egypt)',
    region: 'Middle East',
    script: 'Arabic',
    direction: 'rtl',
    numberSystem: 'arab',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EGP',
    flag: '🇪🇬',
  },
  he: {
    code: 'he',
    name: 'עברית',
    englishName: 'Hebrew',
    region: 'Middle East',
    script: 'Hebrew',
    direction: 'rtl',
    numberSystem: 'latn',
    dateFormat: 'dd/MM/yyyy',
    currency: 'ILS',
    flag: '🇮🇱',
  },
  fa: {
    code: 'fa',
    name: 'فارسی',
    englishName: 'Persian',
    region: 'Middle East',
    script: 'Arabic',
    direction: 'rtl',
    numberSystem: 'arabext',
    dateFormat: 'yyyy/MM/dd',
    currency: 'IRR',
    flag: '🇮🇷',
  },
  ur: {
    code: 'ur',
    name: 'اردو',
    englishName: 'Urdu',
    region: 'Asia',
    script: 'Arabic',
    direction: 'rtl',
    numberSystem: 'arabext',
    dateFormat: 'dd/MM/yyyy',
    currency: 'PKR',
    flag: '🇵🇰',
  },
};

/**
 * Currency code by locale
 */
export const CURRENCY_BY_LOCALE: Record<Locale, string> = Object.fromEntries(
  Object.entries(LOCALE_METADATA).map(([locale, meta]) => [locale, meta.currency])
) as Record<Locale, string>;

/**
 * Locale flag emojis
 */
export const LOCALE_FLAGS: Record<Locale, string> = Object.fromEntries(
  Object.entries(LOCALE_METADATA).map(([locale, meta]) => [locale, meta.flag])
) as Record<Locale, string>;

/**
 * Currency codes by locale (alias)
 */
export const LOCALE_CURRENCIES: Record<Locale, string> = CURRENCY_BY_LOCALE;

/**
 * Number systems by locale
 */
export const NUMBER_SYSTEMS: Record<string, string> = {
  latn: '0123456789',
  arab: '٠١٢٣٤٥٦٧٨٩',
  arabext: '۰۱۲۳۴۵۶۷۸۹',
  deva: '०१२३४५६७८९',
  beng: '০১২৩৪৫৬৭৮৯',
  tamldec: '௦௧௨௩௪௫௬௭௮௯',
  thai: '๐๑๒๓๔๕๖๗๘๙',
};

/**
 * Message descriptor type for react-intl
 */
export interface MessageDescriptor {
  id: string;
  defaultMessage?: string;
  description?: string;
}

/**
 * Translation messages type
 */
export type TranslationMessages = Record<string, string>;
