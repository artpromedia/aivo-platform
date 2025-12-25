/**
 * Core i18n types
 */

/**
 * Supported locale codes (BCP 47)
 */
export type SupportedLocale =
  | 'en'
  | 'en-US'
  | 'en-GB'
  | 'es'
  | 'es-MX'
  | 'es-ES'
  | 'fr'
  | 'fr-CA'
  | 'de'
  | 'pt'
  | 'pt-BR'
  | 'zh-CN'
  | 'zh-TW'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'ar-SA'
  | 'he'
  | 'hi'
  | 'id'
  | 'vi'
  | 'ru'
  | 'tr'
  | 'pl'
  | 'nl'
  | 'it'
  | 'th';

/**
 * RTL locales
 */
export const RTL_LOCALES: SupportedLocale[] = ['ar', 'ar-SA', 'he'];

/**
 * Check if locale is RTL
 */
export function isRTLLocale(locale: SupportedLocale): boolean {
  return RTL_LOCALES.includes(locale) || locale.startsWith('ar') || locale === 'he';
}

/**
 * Locale metadata
 */
export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  englishName: string;
  direction: 'ltr' | 'rtl';
  region?: string;
  script?: string;
  numberSystem?: string;
  calendar?: string;
  dateFormat: {
    short: string;
    medium: string;
    long: string;
  };
  timeFormat: {
    short: string;
    medium: string;
  };
  firstDayOfWeek: 0 | 1 | 6;
  pluralRules: PluralCategory[];
}

/**
 * CLDR plural categories
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Translation message with ICU MessageFormat support
 */
export type TranslationMessage = string;

/**
 * Translation namespace (for code splitting)
 */
export type TranslationNamespace =
  | 'common'
  | 'auth'
  | 'dashboard'
  | 'lessons'
  | 'assessments'
  | 'analytics'
  | 'settings'
  | 'errors'
  | 'validation'
  | 'notifications';

/**
 * Translation resource structure
 */
export type TranslationResource = Record<string, Record<string, TranslationMessage>>;

/**
 * Message format arguments
 */
export interface MessageFormatArgs {
  [key: string]: string | number | boolean | Date | MessageFormatArgs;
}

/**
 * i18n configuration
 */
export interface I18nConfig {
  defaultLocale: SupportedLocale;
  fallbackLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  loadPath: string;
  namespaces: TranslationNamespace[];
  defaultNamespace: TranslationNamespace;
  debug?: boolean;
  detection?: LocaleDetectionConfig;
  interpolation?: InterpolationConfig;
  react?: ReactConfig;
}

/**
 * Locale detection configuration
 */
export interface LocaleDetectionConfig {
  order: ('cookie' | 'localStorage' | 'navigator' | 'querystring' | 'header')[];
  caches: ('cookie' | 'localStorage')[];
  cookieName?: string;
  localStorageKey?: string;
  queryStringParam?: string;
}

/**
 * Interpolation configuration
 */
export interface InterpolationConfig {
  escapeValue?: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * React configuration
 */
export interface ReactConfig {
  useSuspense?: boolean;
  bindI18n?: string;
  bindI18nStore?: string;
}

/**
 * Translation function signature
 */
export type TFunction = (
  key: string,
  args?: MessageFormatArgs,
  options?: TranslationOptions
) => string;

/**
 * Translation options
 */
export interface TranslationOptions {
  ns?: TranslationNamespace;
  defaultValue?: string;
  count?: number;
  context?: string;
}

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  format?: 'short' | 'medium' | 'long' | 'full' | 'relative';
  calendar?: string;
  timeZone?: string;
  hour12?: boolean;
}

/**
 * Number formatting options
 */
export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  currencyDisplay?: 'symbol' | 'code' | 'name';
  unit?: string;
  unitDisplay?: 'short' | 'long' | 'narrow';
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumSignificantDigits?: number;
  maximumSignificantDigits?: number;
}

/**
 * i18n instance interface
 */
export interface I18nInstance {
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
  t: TFunction;
  formatDate: (date: Date | number | string, options?: DateFormatOptions) => string;
  formatNumber: (value: number, options?: NumberFormatOptions) => string;
  formatCurrency: (
    value: number,
    currency: string,
    options?: Omit<NumberFormatOptions, 'style' | 'currency'>
  ) => string;
  formatRelativeTime: (
    date: Date | number,
    options?: { style?: 'long' | 'short' | 'narrow' }
  ) => string;
  formatList: (
    items: string[],
    options?: { type?: 'conjunction' | 'disjunction' | 'unit' }
  ) => string;
  formatPlural: (count: number, options: Record<PluralCategory, string>) => string;
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  loadNamespace: (namespace: TranslationNamespace) => Promise<void>;
  hasTranslation: (key: string, ns?: TranslationNamespace) => boolean;
  getLocaleMetadata: (locale?: SupportedLocale) => LocaleMetadata;
}

/**
 * Translation loader function type
 */
export type TranslationLoader = (
  locale: SupportedLocale,
  namespace: TranslationNamespace
) => Promise<Record<string, TranslationMessage>>;

/**
 * Locale change listener
 */
export type LocaleChangeListener = (locale: SupportedLocale) => void;
