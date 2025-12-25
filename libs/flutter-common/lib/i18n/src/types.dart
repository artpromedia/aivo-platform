/// Core i18n types for AIVO Flutter apps
library;

/// Supported locales in AIVO platform
enum SupportedLocale {
  en('en', 'English', 'English', TextDirection.ltr),
  enUS('en-US', 'English (US)', 'English (US)', TextDirection.ltr),
  enGB('en-GB', 'English (UK)', 'English (UK)', TextDirection.ltr),
  es('es', 'Español', 'Spanish', TextDirection.ltr),
  esMX('es-MX', 'Español (México)', 'Spanish (Mexico)', TextDirection.ltr),
  esES('es-ES', 'Español (España)', 'Spanish (Spain)', TextDirection.ltr),
  fr('fr', 'Français', 'French', TextDirection.ltr),
  frCA('fr-CA', 'Français (Canada)', 'French (Canada)', TextDirection.ltr),
  de('de', 'Deutsch', 'German', TextDirection.ltr),
  pt('pt', 'Português', 'Portuguese', TextDirection.ltr),
  ptBR('pt-BR', 'Português (Brasil)', 'Portuguese (Brazil)', TextDirection.ltr),
  zhCN('zh-CN', '简体中文', 'Chinese (Simplified)', TextDirection.ltr),
  zhTW('zh-TW', '繁體中文', 'Chinese (Traditional)', TextDirection.ltr),
  ja('ja', '日本語', 'Japanese', TextDirection.ltr),
  ko('ko', '한국어', 'Korean', TextDirection.ltr),
  ar('ar', 'العربية', 'Arabic', TextDirection.rtl),
  arSA('ar-SA', 'العربية (السعودية)', 'Arabic (Saudi Arabia)', TextDirection.rtl),
  he('he', 'עברית', 'Hebrew', TextDirection.rtl),
  hi('hi', 'हिन्दी', 'Hindi', TextDirection.ltr),
  id('id', 'Bahasa Indonesia', 'Indonesian', TextDirection.ltr),
  vi('vi', 'Tiếng Việt', 'Vietnamese', TextDirection.ltr),
  ru('ru', 'Русский', 'Russian', TextDirection.ltr),
  tr('tr', 'Türkçe', 'Turkish', TextDirection.ltr),
  pl('pl', 'Polski', 'Polish', TextDirection.ltr),
  nl('nl', 'Nederlands', 'Dutch', TextDirection.ltr),
  it('it', 'Italiano', 'Italian', TextDirection.ltr),
  th('th', 'ไทย', 'Thai', TextDirection.ltr);

  const SupportedLocale(this.code, this.nativeName, this.englishName, this.direction);

  /// BCP 47 locale code
  final String code;
  
  /// Name in native language
  final String nativeName;
  
  /// Name in English
  final String englishName;
  
  /// Text direction
  final TextDirection direction;

  /// Whether this locale is RTL
  bool get isRTL => direction == TextDirection.rtl;

  /// Get Flutter Locale object
  Locale get locale {
    final parts = code.split('-');
    return parts.length > 1 
        ? Locale(parts[0], parts[1])
        : Locale(parts[0]);
  }

  /// Find locale by code
  static SupportedLocale? fromCode(String code) {
    try {
      return SupportedLocale.values.firstWhere(
        (l) => l.code == code || l.code.split('-')[0] == code.split('-')[0],
      );
    } catch (_) {
      return null;
    }
  }

  /// Find locale from Flutter Locale
  static SupportedLocale? fromLocale(Locale locale) {
    final code = locale.countryCode != null
        ? '${locale.languageCode}-${locale.countryCode}'
        : locale.languageCode;
    return fromCode(code);
  }
}

/// Text direction for locale
enum TextDirection {
  ltr,
  rtl,
}

/// Translation namespace
enum TranslationNamespace {
  common,
  auth,
  navigation,
  student,
  teacher,
  content,
  assessment,
  settings,
  errors,
}

/// Locale metadata
class LocaleMetadata {
  const LocaleMetadata({
    required this.locale,
    required this.dateFormat,
    required this.timeFormat,
    required this.numberSystem,
    required this.calendar,
    required this.firstDayOfWeek,
    required this.pluralRules,
    this.currencyCode,
  });

  final SupportedLocale locale;
  final DateFormatPattern dateFormat;
  final TimeFormatPattern timeFormat;
  final String numberSystem;
  final String calendar;
  final int firstDayOfWeek;
  final List<PluralCategory> pluralRules;
  final String? currencyCode;
}

/// Date format patterns
class DateFormatPattern {
  const DateFormatPattern({
    required this.short,
    required this.medium,
    required this.long,
  });

  final String short;
  final String medium;
  final String long;
}

/// Time format patterns
class TimeFormatPattern {
  const TimeFormatPattern({
    required this.short,
    required this.medium,
  });

  final String short;
  final String medium;
}

/// Plural categories (CLDR)
enum PluralCategory {
  zero,
  one,
  two,
  few,
  many,
  other,
}

/// Translation entry
class TranslationEntry {
  const TranslationEntry({
    required this.key,
    required this.value,
    this.context,
    this.pluralForms,
  });

  final String key;
  final String value;
  final String? context;
  final Map<PluralCategory, String>? pluralForms;
}

/// Locale change callback
typedef LocaleChangeCallback = void Function(SupportedLocale locale);

/// Translation function type
typedef TFunction = String Function(String key, [Map<String, dynamic>? args]);

// Re-export Flutter's Locale
export 'dart:ui' show Locale;
