/// Core i18n manager for AIVO Flutter apps
library;

import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'types.dart';
import 'constants.dart';

/// Main i18n class for managing translations
class AivoI18n {
  AivoI18n._();

  static final AivoI18n instance = AivoI18n._();

  SupportedLocale _currentLocale = SupportedLocale.en;
  final Map<String, Map<String, dynamic>> _translations = {};
  final List<LocaleChangeCallback> _listeners = [];

  /// Current locale
  SupportedLocale get currentLocale => _currentLocale;

  /// Current text direction
  TextDirection get direction => _currentLocale.direction;

  /// Whether current locale is RTL
  bool get isRTL => _currentLocale.isRTL;

  /// Get locale metadata
  LocaleMetadata? get metadata => localeMetadata[_currentLocale];

  /// Initialize with locale
  Future<void> init({
    SupportedLocale? locale,
    List<TranslationNamespace> namespaces = const [TranslationNamespace.common],
  }) async {
    _currentLocale = locale ?? await _detectLocale();

    for (final ns in namespaces) {
      await loadNamespace(ns);
    }
  }

  /// Detect system locale
  Future<SupportedLocale> _detectLocale() async {
    final systemLocale = WidgetsBinding.instance.platformDispatcher.locale;
    return SupportedLocale.fromLocale(systemLocale) ?? SupportedLocale.en;
  }

  /// Change current locale
  Future<void> changeLocale(SupportedLocale locale) async {
    if (_currentLocale == locale) return;

    _currentLocale = locale;

    // Reload translations for new locale
    final loadedNamespaces = _translations.keys
        .where((key) => key.startsWith('${_currentLocale.code}:'))
        .map((key) => key.split(':')[1])
        .toSet();

    for (final ns in loadedNamespaces) {
      await loadNamespace(TranslationNamespace.values.firstWhere(
        (n) => n.name == ns,
        orElse: () => TranslationNamespace.common,
      ));
    }

    _notifyListeners();
  }

  /// Load a translation namespace
  Future<void> loadNamespace(TranslationNamespace namespace) async {
    final key = '${_currentLocale.code}:${namespace.name}';
    
    if (_translations.containsKey(key)) return;

    try {
      final jsonString = await rootBundle.loadString(
        'assets/locales/${_currentLocale.code}/${namespace.name}.json',
      );
      _translations[key] = json.decode(jsonString) as Map<String, dynamic>;
    } catch (e) {
      // Try fallback to base language
      final baseCode = _currentLocale.code.split('-')[0];
      if (baseCode != _currentLocale.code) {
        try {
          final jsonString = await rootBundle.loadString(
            'assets/locales/$baseCode/${namespace.name}.json',
          );
          _translations[key] = json.decode(jsonString) as Map<String, dynamic>;
        } catch (baseE) {
          // Try English fallback
          debugPrint('Failed to load $baseCode translations for ${namespace.name}: $baseE');
          try {
            final jsonString = await rootBundle.loadString(
              'assets/locales/en/${namespace.name}.json',
            );
            _translations[key] = json.decode(jsonString) as Map<String, dynamic>;
          } catch (enE) {
            debugPrint('Failed to load English fallback for $key: $enE');
            _translations[key] = {};
          }
        }
      } else {
        _translations[key] = {};
      }
    }
  }

  /// Translate a key
  String t(
    String key, {
    Map<String, dynamic>? args,
    TranslationNamespace namespace = TranslationNamespace.common,
    String? context,
    int? count,
  }) {
    final cacheKey = '${_currentLocale.code}:${namespace.name}';
    final translations = _translations[cacheKey];

    if (translations == null) {
      return key;
    }

    // Support dot notation for nested keys
    dynamic value = translations;
    for (final part in key.split('.')) {
      if (value is Map<String, dynamic>) {
        value = value[part];
      } else {
        return key;
      }
    }

    if (value == null) {
      return key;
    }

    String result = value.toString();

    // Handle pluralization
    if (count != null) {
      result = _pluralize(result, count);
    }

    // Interpolate arguments
    if (args != null) {
      result = _interpolate(result, args);
    }

    return result;
  }

  /// Pluralize message using ICU format
  String _pluralize(String message, int count) {
    // Simple ICU plural pattern matching
    final pluralRegex = RegExp(
      r'\{(\w+),\s*plural,\s*((?:=?\d+|zero|one|two|few|many|other)\s*\{[^}]*\}\s*)+\}',
    );

    return message.replaceAllMapped(pluralRegex, (match) {
      // ignore: unused_local_variable
      final variable = match.group(1);
      final patterns = match.group(2) ?? '';

      // Get plural category
      final category = _getPluralCategory(count);

      // Try exact match first
      final exactRegex = RegExp('=$count\\s*\\{([^}]*)\\}');
      final exactMatch = exactRegex.firstMatch(patterns);
      if (exactMatch != null) {
        return exactMatch.group(1)?.replaceAll('#', count.toString()) ?? count.toString();
      }

      // Try category match
      final categoryRegex = RegExp('$category\\s*\\{([^}]*)\\}');
      final categoryMatch = categoryRegex.firstMatch(patterns);
      if (categoryMatch != null) {
        return categoryMatch.group(1)?.replaceAll('#', count.toString()) ?? count.toString();
      }

      // Fallback to 'other'
      final otherRegex = RegExp(r'other\s*\{([^}]*)\}');
      final otherMatch = otherRegex.firstMatch(patterns);
      if (otherMatch != null) {
        return otherMatch.group(1)?.replaceAll('#', count.toString()) ?? count.toString();
      }

      return count.toString();
    });
  }

  /// Get CLDR plural category for current locale
  String _getPluralCategory(int count) {
    // Simplified English plural rules
    // In production, use proper CLDR rules per locale
    if (count == 0) return 'zero';
    if (count == 1) return 'one';
    if (count == 2) return 'two';
    return 'other';
  }

  /// Interpolate variables in message
  String _interpolate(String message, Map<String, dynamic> args) {
    var result = message;
    
    args.forEach((key, value) {
      result = result.replaceAll('{$key}', value.toString());
    });

    return result;
  }

  /// Add locale change listener
  void addListener(LocaleChangeCallback callback) {
    _listeners.add(callback);
  }

  /// Remove locale change listener
  void removeListener(LocaleChangeCallback callback) {
    _listeners.remove(callback);
  }

  /// Notify all listeners of locale change
  void _notifyListeners() {
    for (final listener in _listeners) {
      listener(_currentLocale);
    }
  }

  /// Check if translation exists
  bool exists(String key, {TranslationNamespace namespace = TranslationNamespace.common}) {
    final cacheKey = '${_currentLocale.code}:${namespace.name}';
    final translations = _translations[cacheKey];

    if (translations == null) return false;

    dynamic value = translations;
    for (final part in key.split('.')) {
      if (value is Map<String, dynamic>) {
        value = value[part];
      } else {
        return false;
      }
    }

    return value != null;
  }

  /// Get all supported locales
  List<SupportedLocale> get supportedLocales => SupportedLocale.values.toList();

  /// Clear translation cache
  void clearCache() {
    _translations.clear();
  }
}

/// Global instance shortcut
AivoI18n get i18n => AivoI18n.instance;

/// Global translate function
String t(
  String key, {
  Map<String, dynamic>? args,
  TranslationNamespace namespace = TranslationNamespace.common,
  int? count,
}) {
  return i18n.t(key, args: args, namespace: namespace, count: count);
}
