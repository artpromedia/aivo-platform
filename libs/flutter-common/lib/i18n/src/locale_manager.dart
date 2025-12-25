/// Locale manager for AIVO Flutter apps
/// Handles locale detection, persistence, and switching
library;

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'types.dart';
import 'i18n.dart';

/// Manages locale preferences and detection
class LocaleManager {
  LocaleManager._();

  static final LocaleManager instance = LocaleManager._();

  static const String _localeKey = 'aivo_locale';
  SharedPreferences? _prefs;

  /// Initialize locale manager
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Get saved locale preference
  SupportedLocale? getSavedLocale() {
    final code = _prefs?.getString(_localeKey);
    if (code == null) return null;
    return SupportedLocale.fromCode(code);
  }

  /// Save locale preference
  Future<void> saveLocale(SupportedLocale locale) async {
    await _prefs?.setString(_localeKey, locale.code);
  }

  /// Clear locale preference
  Future<void> clearLocale() async {
    await _prefs?.remove(_localeKey);
  }

  /// Detect best locale based on system and user preferences
  SupportedLocale detectLocale() {
    // Check saved preference first
    final saved = getSavedLocale();
    if (saved != null) return saved;

    // Check system locale
    final systemLocale = WidgetsBinding.instance.platformDispatcher.locale;
    final detected = SupportedLocale.fromLocale(systemLocale);
    if (detected != null) return detected;

    // Default to English
    return SupportedLocale.en;
  }

  /// Change locale with persistence
  Future<void> changeLocale(SupportedLocale locale) async {
    await saveLocale(locale);
    await i18n.changeLocale(locale);
  }

  /// Get all available locales sorted by name
  List<SupportedLocale> getAvailableLocales({bool sortByNative = true}) {
    final locales = List<SupportedLocale>.from(SupportedLocale.values);
    
    if (sortByNative) {
      locales.sort((a, b) => a.nativeName.compareTo(b.nativeName));
    } else {
      locales.sort((a, b) => a.englishName.compareTo(b.englishName));
    }

    return locales;
  }

  /// Get locales grouped by language family
  Map<String, List<SupportedLocale>> getGroupedLocales() {
    final grouped = <String, List<SupportedLocale>>{};

    for (final locale in SupportedLocale.values) {
      final baseCode = locale.code.split('-')[0];
      grouped.putIfAbsent(baseCode, () => []).add(locale);
    }

    return grouped;
  }

  /// Find best matching locale for a given code
  SupportedLocale findBestMatch(String code) {
    // Try exact match
    final exact = SupportedLocale.fromCode(code);
    if (exact != null) return exact;

    // Try base language match
    final baseCode = code.split('-')[0];
    for (final locale in SupportedLocale.values) {
      if (locale.code.startsWith(baseCode)) {
        return locale;
      }
    }

    return SupportedLocale.en;
  }
}

/// Global instance shortcut
LocaleManager get localeManager => LocaleManager.instance;

/// Locale switcher widget
class LocaleSwitcher extends StatelessWidget {
  const LocaleSwitcher({
    super.key,
    this.showFlags = true,
    this.showNativeNames = true,
    this.localeFilter,
    this.onLocaleChanged,
    this.builder,
  });

  final bool showFlags;
  final bool showNativeNames;
  final bool Function(SupportedLocale)? localeFilter;
  final void Function(SupportedLocale)? onLocaleChanged;
  final Widget Function(BuildContext, SupportedLocale, List<SupportedLocale>)? builder;

  @override
  Widget build(BuildContext context) {
    final currentLocale = i18n.currentLocale;
    var locales = localeManager.getAvailableLocales(
      sortByNative: showNativeNames,
    );

    if (localeFilter != null) {
      locales = locales.where(localeFilter!).toList();
    }

    if (builder != null) {
      return builder!(context, currentLocale, locales);
    }

    return DropdownButton<SupportedLocale>(
      value: currentLocale,
      items: locales.map((locale) {
        return DropdownMenuItem(
          value: locale,
          child: Text(
            showNativeNames ? locale.nativeName : locale.englishName,
          ),
        );
      }).toList(),
      onChanged: (locale) async {
        if (locale != null) {
          await localeManager.changeLocale(locale);
          onLocaleChanged?.call(locale);
        }
      },
    );
  }
}
