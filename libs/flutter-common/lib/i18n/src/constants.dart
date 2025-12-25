/// Locale constants and metadata for AIVO Flutter apps
library;

import 'types.dart';

/// Locale metadata for all supported locales
const Map<SupportedLocale, LocaleMetadata> localeMetadata = {
  SupportedLocale.en: LocaleMetadata(
    locale: SupportedLocale.en,
    dateFormat: DateFormatPattern(
      short: 'M/d/yyyy',
      medium: 'MMM d, yyyy',
      long: 'MMMM d, yyyy',
    ),
    timeFormat: TimeFormatPattern(
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 0,
    pluralRules: [PluralCategory.one, PluralCategory.other],
    currencyCode: 'USD',
  ),
  SupportedLocale.es: LocaleMetadata(
    locale: SupportedLocale.es,
    dateFormat: DateFormatPattern(
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd de MMMM de yyyy',
    ),
    timeFormat: TimeFormatPattern(
      short: 'H:mm',
      medium: 'H:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 1,
    pluralRules: [PluralCategory.one, PluralCategory.other],
    currencyCode: 'EUR',
  ),
  SupportedLocale.ar: LocaleMetadata(
    locale: SupportedLocale.ar,
    dateFormat: DateFormatPattern(
      short: 'd/M/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    ),
    timeFormat: TimeFormatPattern(
      short: 'h:mm a',
      medium: 'h:mm:ss a',
    ),
    numberSystem: 'arab',
    calendar: 'gregory',
    firstDayOfWeek: 6,
    pluralRules: [
      PluralCategory.zero,
      PluralCategory.one,
      PluralCategory.two,
      PluralCategory.few,
      PluralCategory.many,
      PluralCategory.other,
    ],
    currencyCode: 'SAR',
  ),
  SupportedLocale.fr: LocaleMetadata(
    locale: SupportedLocale.fr,
    dateFormat: DateFormatPattern(
      short: 'dd/MM/yyyy',
      medium: 'd MMM yyyy',
      long: 'd MMMM yyyy',
    ),
    timeFormat: TimeFormatPattern(
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 1,
    pluralRules: [PluralCategory.one, PluralCategory.other],
    currencyCode: 'EUR',
  ),
  SupportedLocale.de: LocaleMetadata(
    locale: SupportedLocale.de,
    dateFormat: DateFormatPattern(
      short: 'dd.MM.yyyy',
      medium: 'd. MMM yyyy',
      long: 'd. MMMM yyyy',
    ),
    timeFormat: TimeFormatPattern(
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 1,
    pluralRules: [PluralCategory.one, PluralCategory.other],
    currencyCode: 'EUR',
  ),
  SupportedLocale.zhCN: LocaleMetadata(
    locale: SupportedLocale.zhCN,
    dateFormat: DateFormatPattern(
      short: 'yyyy/M/d',
      medium: 'yyyy年M月d日',
      long: 'yyyy年M月d日',
    ),
    timeFormat: TimeFormatPattern(
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 1,
    pluralRules: [PluralCategory.other],
    currencyCode: 'CNY',
  ),
  SupportedLocale.ja: LocaleMetadata(
    locale: SupportedLocale.ja,
    dateFormat: DateFormatPattern(
      short: 'yyyy/MM/dd',
      medium: 'yyyy年M月d日',
      long: 'yyyy年M月d日',
    ),
    timeFormat: TimeFormatPattern(
      short: 'H:mm',
      medium: 'H:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 0,
    pluralRules: [PluralCategory.other],
    currencyCode: 'JPY',
  ),
  SupportedLocale.ko: LocaleMetadata(
    locale: SupportedLocale.ko,
    dateFormat: DateFormatPattern(
      short: 'yyyy. M. d.',
      medium: 'yyyy년 M월 d일',
      long: 'yyyy년 M월 d일',
    ),
    timeFormat: TimeFormatPattern(
      short: 'a h:mm',
      medium: 'a h:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 0,
    pluralRules: [PluralCategory.other],
    currencyCode: 'KRW',
  ),
  SupportedLocale.he: LocaleMetadata(
    locale: SupportedLocale.he,
    dateFormat: DateFormatPattern(
      short: 'd.M.yyyy',
      medium: 'd בMMM yyyy',
      long: 'd בMMMM yyyy',
    ),
    timeFormat: TimeFormatPattern(
      short: 'H:mm',
      medium: 'H:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 0,
    pluralRules: [PluralCategory.one, PluralCategory.two, PluralCategory.other],
    currencyCode: 'ILS',
  ),
  SupportedLocale.ru: LocaleMetadata(
    locale: SupportedLocale.ru,
    dateFormat: DateFormatPattern(
      short: 'dd.MM.yyyy',
      medium: 'd MMM yyyy г.',
      long: 'd MMMM yyyy г.',
    ),
    timeFormat: TimeFormatPattern(
      short: 'HH:mm',
      medium: 'HH:mm:ss',
    ),
    numberSystem: 'latn',
    calendar: 'gregory',
    firstDayOfWeek: 1,
    pluralRules: [
      PluralCategory.one,
      PluralCategory.few,
      PluralCategory.many,
      PluralCategory.other,
    ],
    currencyCode: 'RUB',
  ),
};

/// RTL locales
const Set<SupportedLocale> rtlLocales = {
  SupportedLocale.ar,
  SupportedLocale.arSA,
  SupportedLocale.he,
};

/// Currency codes by locale
const Map<SupportedLocale, String> localeCurrencies = {
  SupportedLocale.en: 'USD',
  SupportedLocale.enUS: 'USD',
  SupportedLocale.enGB: 'GBP',
  SupportedLocale.es: 'EUR',
  SupportedLocale.esMX: 'MXN',
  SupportedLocale.esES: 'EUR',
  SupportedLocale.fr: 'EUR',
  SupportedLocale.frCA: 'CAD',
  SupportedLocale.de: 'EUR',
  SupportedLocale.pt: 'EUR',
  SupportedLocale.ptBR: 'BRL',
  SupportedLocale.zhCN: 'CNY',
  SupportedLocale.zhTW: 'TWD',
  SupportedLocale.ja: 'JPY',
  SupportedLocale.ko: 'KRW',
  SupportedLocale.ar: 'SAR',
  SupportedLocale.arSA: 'SAR',
  SupportedLocale.he: 'ILS',
  SupportedLocale.hi: 'INR',
  SupportedLocale.id: 'IDR',
  SupportedLocale.vi: 'VND',
  SupportedLocale.ru: 'RUB',
  SupportedLocale.tr: 'TRY',
  SupportedLocale.pl: 'PLN',
  SupportedLocale.nl: 'EUR',
  SupportedLocale.it: 'EUR',
  SupportedLocale.th: 'THB',
};

/// Flag emojis by locale
const Map<SupportedLocale, String> localeFlags = {
  SupportedLocale.en: '🇺🇸',
  SupportedLocale.enUS: '🇺🇸',
  SupportedLocale.enGB: '🇬🇧',
  SupportedLocale.es: '🇪🇸',
  SupportedLocale.esMX: '🇲🇽',
  SupportedLocale.esES: '🇪🇸',
  SupportedLocale.fr: '🇫🇷',
  SupportedLocale.frCA: '🇨🇦',
  SupportedLocale.de: '🇩🇪',
  SupportedLocale.pt: '🇵🇹',
  SupportedLocale.ptBR: '🇧🇷',
  SupportedLocale.zhCN: '🇨🇳',
  SupportedLocale.zhTW: '🇹🇼',
  SupportedLocale.ja: '🇯🇵',
  SupportedLocale.ko: '🇰🇷',
  SupportedLocale.ar: '🇸🇦',
  SupportedLocale.arSA: '🇸🇦',
  SupportedLocale.he: '🇮🇱',
  SupportedLocale.hi: '🇮🇳',
  SupportedLocale.id: '🇮🇩',
  SupportedLocale.vi: '🇻🇳',
  SupportedLocale.ru: '🇷🇺',
  SupportedLocale.tr: '🇹🇷',
  SupportedLocale.pl: '🇵🇱',
  SupportedLocale.nl: '🇳🇱',
  SupportedLocale.it: '🇮🇹',
  SupportedLocale.th: '🇹🇭',
};
