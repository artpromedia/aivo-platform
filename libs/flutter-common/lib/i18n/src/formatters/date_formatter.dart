/// Date formatter for AIVO Flutter apps
/// Provides locale-aware date formatting
library;

import 'package:intl/intl.dart';
import '../types.dart';
import '../constants.dart';
import '../i18n.dart';

/// Locale-aware date formatter
class AivoDateFormatter {
  AivoDateFormatter._();

  static final AivoDateFormatter instance = AivoDateFormatter._();

  /// Format date with locale
  String format(
    DateTime date, {
    SupportedLocale? locale,
    DateFormatStyle style = DateFormatStyle.medium,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final metadata = localeMetadata[loc];
    
    String pattern;
    switch (style) {
      case DateFormatStyle.short:
        pattern = metadata?.dateFormat.short ?? 'M/d/yyyy';
        break;
      case DateFormatStyle.medium:
        pattern = metadata?.dateFormat.medium ?? 'MMM d, yyyy';
        break;
      case DateFormatStyle.long:
        pattern = metadata?.dateFormat.long ?? 'MMMM d, yyyy';
        break;
      case DateFormatStyle.full:
        pattern = 'EEEE, ${metadata?.dateFormat.long ?? 'MMMM d, yyyy'}';
        break;
    }

    return DateFormat(pattern, loc.code).format(date);
  }

  /// Format time with locale
  String formatTime(
    DateTime date, {
    SupportedLocale? locale,
    TimeFormatStyle style = TimeFormatStyle.short,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final metadata = localeMetadata[loc];
    
    String pattern;
    switch (style) {
      case TimeFormatStyle.short:
        pattern = metadata?.timeFormat.short ?? 'h:mm a';
        break;
      case TimeFormatStyle.medium:
        pattern = metadata?.timeFormat.medium ?? 'h:mm:ss a';
        break;
    }

    return DateFormat(pattern, loc.code).format(date);
  }

  /// Format date and time
  String formatDateTime(
    DateTime date, {
    SupportedLocale? locale,
    DateFormatStyle dateStyle = DateFormatStyle.medium,
    TimeFormatStyle timeStyle = TimeFormatStyle.short,
  }) {
    final formattedDate = format(date, locale: locale, style: dateStyle);
    final formattedTime = formatTime(date, locale: locale, style: timeStyle);
    return '$formattedDate $formattedTime';
  }

  /// Format date range
  String formatRange(
    DateTime start,
    DateTime end, {
    SupportedLocale? locale,
    DateFormatStyle style = DateFormatStyle.medium,
  }) {
    final formattedStart = format(start, locale: locale, style: style);
    final formattedEnd = format(end, locale: locale, style: style);
    return '$formattedStart – $formattedEnd';
  }

  /// Get month name
  String getMonthName(
    int month, {
    SupportedLocale? locale,
    bool abbreviated = false,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final pattern = abbreviated ? 'MMM' : 'MMMM';
    final date = DateTime(2024, month);
    return DateFormat(pattern, loc.code).format(date);
  }

  /// Get all month names
  List<String> getMonthNames({
    SupportedLocale? locale,
    bool abbreviated = false,
  }) {
    return List.generate(12, (i) => getMonthName(i + 1, locale: locale, abbreviated: abbreviated));
  }

  /// Get weekday name
  String getWeekdayName(
    int weekday, {
    SupportedLocale? locale,
    bool abbreviated = false,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final pattern = abbreviated ? 'EEE' : 'EEEE';
    // weekday 1 = Monday, we need a date that is that weekday
    final date = DateTime(2024, 1, weekday); // Jan 1, 2024 is Monday
    return DateFormat(pattern, loc.code).format(date);
  }

  /// Get all weekday names
  List<String> getWeekdayNames({
    SupportedLocale? locale,
    bool abbreviated = false,
    bool startFromSunday = false,
  }) {
    final loc = locale ?? i18n.currentLocale;
    final metadata = localeMetadata[loc];
    final firstDay = startFromSunday ? 7 : (metadata?.firstDayOfWeek ?? 0);
    
    return List.generate(7, (i) {
      final weekday = ((firstDay + i - 1) % 7) + 1;
      return getWeekdayName(weekday, locale: locale, abbreviated: abbreviated);
    });
  }

  /// Check if date is today
  bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && 
           date.month == now.month && 
           date.day == now.day;
  }

  /// Check if date is yesterday
  bool isYesterday(DateTime date) {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yesterday.year && 
           date.month == yesterday.month && 
           date.day == yesterday.day;
  }

  /// Check if date is tomorrow
  bool isTomorrow(DateTime date) {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return date.year == tomorrow.year && 
           date.month == tomorrow.month && 
           date.day == tomorrow.day;
  }

  /// Format to ISO 8601
  String formatISO(DateTime date) {
    return date.toIso8601String();
  }

  /// Format to ISO date only
  String formatISODate(DateTime date) {
    return DateFormat('yyyy-MM-dd').format(date);
  }
}

/// Date format styles
enum DateFormatStyle {
  short,
  medium,
  long,
  full,
}

/// Time format styles
enum TimeFormatStyle {
  short,
  medium,
}

/// Global instance shortcut
AivoDateFormatter get dateFormatter => AivoDateFormatter.instance;
