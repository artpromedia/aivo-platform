/// Relative time formatter for AIVO Flutter apps
/// Provides locale-aware relative time formatting (e.g., "2 hours ago")
library;

import '../types.dart';
import '../i18n.dart';

/// Locale-aware relative time formatter
class AivoRelativeTimeFormatter {
  AivoRelativeTimeFormatter._();

  static final AivoRelativeTimeFormatter instance = AivoRelativeTimeFormatter._();

  /// Format relative time from date
  String format(
    DateTime date, {
    SupportedLocale? locale,
    DateTime? relativeTo,
    RelativeTimeStyle style = RelativeTimeStyle.long,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final now = relativeTo ?? DateTime.now();
    final difference = date.difference(now);
    
    return _formatDifference(difference, loc, style);
  }

  /// Format time ago
  String formatTimeAgo(
    DateTime date, {
    SupportedLocale? locale,
    RelativeTimeStyle style = RelativeTimeStyle.long,
  }) {
    return format(date, locale: locale, style: style);
  }

  /// Format duration
  String formatDuration(
    Duration duration, {
    SupportedLocale? locale,
    RelativeTimeStyle style = RelativeTimeStyle.long,
  }) {
    final loc = locale ?? i18n.currentLocale;
    return _formatDifference(duration, loc, style, includeDirection: false);
  }

  String _formatDifference(
    Duration difference,
    SupportedLocale locale,
    RelativeTimeStyle style, {
    bool includeDirection = true,
  }) {
    final isNegative = difference.isNegative;
    final abs = difference.abs();
    
    String unit;
    int value;

    if (abs.inDays >= 365) {
      value = abs.inDays ~/ 365;
      unit = _getUnit('year', value, locale, style);
    } else if (abs.inDays >= 30) {
      value = abs.inDays ~/ 30;
      unit = _getUnit('month', value, locale, style);
    } else if (abs.inDays >= 7) {
      value = abs.inDays ~/ 7;
      unit = _getUnit('week', value, locale, style);
    } else if (abs.inDays >= 1) {
      value = abs.inDays;
      unit = _getUnit('day', value, locale, style);
    } else if (abs.inHours >= 1) {
      value = abs.inHours;
      unit = _getUnit('hour', value, locale, style);
    } else if (abs.inMinutes >= 1) {
      value = abs.inMinutes;
      unit = _getUnit('minute', value, locale, style);
    } else {
      value = abs.inSeconds;
      unit = _getUnit('second', value, locale, style);
    }

    final formatted = '$value $unit';

    if (!includeDirection) {
      return formatted;
    }

    return _applyDirection(formatted, isNegative, locale);
  }

  String _getUnit(String unit, int value, SupportedLocale locale, RelativeTimeStyle style) {
    // Get translated unit with pluralization
    // In production, this would use the translation system
    final isPlural = value != 1;
    
    final units = {
      'en': {
        'second': isPlural ? 'seconds' : 'second',
        'minute': isPlural ? 'minutes' : 'minute',
        'hour': isPlural ? 'hours' : 'hour',
        'day': isPlural ? 'days' : 'day',
        'week': isPlural ? 'weeks' : 'week',
        'month': isPlural ? 'months' : 'month',
        'year': isPlural ? 'years' : 'year',
      },
      'es': {
        'second': isPlural ? 'segundos' : 'segundo',
        'minute': isPlural ? 'minutos' : 'minuto',
        'hour': isPlural ? 'horas' : 'hora',
        'day': isPlural ? 'días' : 'día',
        'week': isPlural ? 'semanas' : 'semana',
        'month': isPlural ? 'meses' : 'mes',
        'year': isPlural ? 'años' : 'año',
      },
      'ar': {
        'second': 'ثانية',
        'minute': 'دقيقة',
        'hour': 'ساعة',
        'day': 'يوم',
        'week': 'أسبوع',
        'month': 'شهر',
        'year': 'سنة',
      },
    };

    final baseCode = locale.code.split('-')[0];
    final localeUnits = units[baseCode] ?? units['en']!;
    
    if (style == RelativeTimeStyle.narrow) {
      // Return abbreviated form
      return localeUnits[unit]?[0] ?? unit[0];
    }
    
    return localeUnits[unit] ?? unit;
  }

  String _applyDirection(String formatted, bool isPast, SupportedLocale locale) {
    final baseCode = locale.code.split('-')[0];
    
    final patterns = {
      'en': isPast ? '{time} ago' : 'in {time}',
      'es': isPast ? 'hace {time}' : 'en {time}',
      'ar': isPast ? 'منذ {time}' : 'خلال {time}',
      'fr': isPast ? 'il y a {time}' : 'dans {time}',
      'de': isPast ? 'vor {time}' : 'in {time}',
    };

    final pattern = patterns[baseCode] ?? patterns['en']!;
    return pattern.replaceAll('{time}', formatted);
  }

  /// Format smart relative time
  /// Returns "today", "yesterday", "tomorrow" when appropriate
  String formatSmart(
    DateTime date, {
    SupportedLocale? locale,
    String Function(DateTime)? dateFormatter,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dateDay = DateTime(date.year, date.month, date.day);
    final difference = dateDay.difference(today).inDays;

    final labels = {
      'en': {'today': 'Today', 'yesterday': 'Yesterday', 'tomorrow': 'Tomorrow'},
      'es': {'today': 'Hoy', 'yesterday': 'Ayer', 'tomorrow': 'Mañana'},
      'ar': {'today': 'اليوم', 'yesterday': 'أمس', 'tomorrow': 'غداً'},
    };

    final baseCode = loc.code.split('-')[0];
    final localeLabels = labels[baseCode] ?? labels['en']!;

    if (difference == 0) {
      return localeLabels['today']!;
    } else if (difference == -1) {
      return localeLabels['yesterday']!;
    } else if (difference == 1) {
      return localeLabels['tomorrow']!;
    } else if (difference.abs() <= 7) {
      return format(date, locale: loc);
    } else if (dateFormatter != null) {
      return dateFormatter(date);
    } else {
      return format(date, locale: loc);
    }
  }
}

/// Relative time format styles
enum RelativeTimeStyle {
  long,
  short,
  narrow,
}

/// Global instance shortcut
AivoRelativeTimeFormatter get relativeTimeFormatter => AivoRelativeTimeFormatter.instance;
