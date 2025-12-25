/// Number formatter for AIVO Flutter apps
/// Provides locale-aware number and currency formatting
library;

import 'package:intl/intl.dart';
import '../types.dart';
import '../constants.dart';
import '../i18n.dart';

/// Locale-aware number formatter
class AivoNumberFormatter {
  AivoNumberFormatter._();

  static final AivoNumberFormatter instance = AivoNumberFormatter._();

  /// Format number with locale
  String format(
    num value, {
    SupportedLocale? locale,
    int? decimalDigits,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final formatter = NumberFormat.decimalPattern(loc.code);
    
    if (decimalDigits != null) {
      formatter.minimumFractionDigits = decimalDigits;
      formatter.maximumFractionDigits = decimalDigits;
    }

    return formatter.format(value);
  }

  /// Format currency
  String formatCurrency(
    num value, {
    SupportedLocale? locale,
    String? currencyCode,
    String? symbol,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final code = currencyCode ?? localeCurrencies[loc] ?? 'USD';
    
    final formatter = NumberFormat.currency(
      locale: loc.code,
      name: code,
      symbol: symbol,
    );

    return formatter.format(value);
  }

  /// Format currency with compact notation
  String formatCurrencyCompact(
    num value, {
    SupportedLocale? locale,
    String? currencyCode,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final code = currencyCode ?? localeCurrencies[loc] ?? 'USD';
    
    final formatter = NumberFormat.compactCurrency(
      locale: loc.code,
      name: code,
    );

    return formatter.format(value);
  }

  /// Format percentage
  String formatPercent(
    num value, {
    SupportedLocale? locale,
    int decimalDigits = 0,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final formatter = NumberFormat.percentPattern(loc.code);
    
    formatter.minimumFractionDigits = decimalDigits;
    formatter.maximumFractionDigits = decimalDigits;

    return formatter.format(value);
  }

  /// Format compact number (1K, 1M, etc.)
  String formatCompact(
    num value, {
    SupportedLocale? locale,
  }) {
    final loc = locale ?? i18n.currentLocale;
    return NumberFormat.compact(locale: loc.code).format(value);
  }

  /// Format scientific notation
  String formatScientific(
    num value, {
    SupportedLocale? locale,
    int decimalDigits = 2,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final formatter = NumberFormat.scientificPattern(loc.code);
    
    formatter.minimumFractionDigits = decimalDigits;
    formatter.maximumFractionDigits = decimalDigits;

    return formatter.format(value);
  }

  /// Format ordinal (1st, 2nd, etc.)
  String formatOrdinal(int value, {SupportedLocale? locale}) {
    final loc = locale ?? i18n.currentLocale;
    
    // English ordinals
    if (loc.code.startsWith('en')) {
      if (value % 100 >= 11 && value % 100 <= 13) {
        return '${value}th';
      }
      switch (value % 10) {
        case 1: return '${value}st';
        case 2: return '${value}nd';
        case 3: return '${value}rd';
        default: return '${value}th';
      }
    }

    // Default: number with period
    return '$value.';
  }

  /// Format file size
  String formatFileSize(
    int bytes, {
    SupportedLocale? locale,
    bool binary = false,
    int decimalDigits = 1,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final base = binary ? 1024 : 1000;
    final units = binary
        ? ['B', 'KiB', 'MiB', 'GiB', 'TiB']
        : ['B', 'KB', 'MB', 'GB', 'TB'];

    if (bytes == 0) return '0 ${units[0]}';

    final exponent = (bytes.abs().bitLength - 1) ~/ 10;
    final index = exponent.clamp(0, units.length - 1);
    final value = bytes / pow(base, index);

    final formatter = NumberFormat.decimalPattern(loc.code);
    formatter.minimumFractionDigits = 0;
    formatter.maximumFractionDigits = decimalDigits;

    return '${formatter.format(value)} ${units[index]}';
  }

  /// Power function for file size
  int pow(int base, int exp) {
    int result = 1;
    for (int i = 0; i < exp; i++) {
      result *= base;
    }
    return result;
  }

  /// Parse localized number
  num? parse(String value, {SupportedLocale? locale}) {
    final loc = locale ?? i18n.currentLocale;
    try {
      return NumberFormat.decimalPattern(loc.code).parse(value);
    } catch (_) {
      return null;
    }
  }
}

/// Global instance shortcut
AivoNumberFormatter get numberFormatter => AivoNumberFormatter.instance;
