import 'package:flutter/material.dart';

/// User notification preferences
class NotificationPreferences {
  final bool pushEnabled;
  final bool emailEnabled;
  final bool inAppEnabled;

  // Channel-specific settings
  final bool sessionUpdates;
  final bool achievements;
  final bool messages;
  final bool reminders;
  final bool alerts;
  final bool billing;
  final bool encouragement;

  // Quiet hours
  final bool quietHoursEnabled;
  final TimeOfDay? quietHoursStart;
  final TimeOfDay? quietHoursEnd;
  final String timezone;

  // Frequency controls
  final NotificationFrequency reminderFrequency;
  final int maxDailyNotifications;

  const NotificationPreferences({
    this.pushEnabled = true,
    this.emailEnabled = true,
    this.inAppEnabled = true,
    this.sessionUpdates = true,
    this.achievements = true,
    this.messages = true,
    this.reminders = true,
    this.alerts = true,
    this.billing = true,
    this.encouragement = true,
    this.quietHoursEnabled = false,
    this.quietHoursStart,
    this.quietHoursEnd,
    this.timezone = 'UTC',
    this.reminderFrequency = NotificationFrequency.daily,
    this.maxDailyNotifications = 10,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      emailEnabled: json['emailEnabled'] as bool? ?? true,
      inAppEnabled: json['inAppEnabled'] as bool? ?? true,
      sessionUpdates: json['sessionUpdates'] as bool? ?? true,
      achievements: json['achievements'] as bool? ?? true,
      messages: json['messages'] as bool? ?? true,
      reminders: json['reminders'] as bool? ?? true,
      alerts: json['alerts'] as bool? ?? true,
      billing: json['billing'] as bool? ?? true,
      encouragement: json['encouragement'] as bool? ?? true,
      quietHoursEnabled: json['quietHoursEnabled'] as bool? ?? false,
      quietHoursStart: json['quietHoursStart'] != null
          ? _parseTimeOfDay(json['quietHoursStart'])
          : null,
      quietHoursEnd: json['quietHoursEnd'] != null
          ? _parseTimeOfDay(json['quietHoursEnd'])
          : null,
      timezone: json['timezone'] as String? ?? 'UTC',
      reminderFrequency: NotificationFrequency.values.firstWhere(
        (f) => f.name == json['reminderFrequency'],
        orElse: () => NotificationFrequency.daily,
      ),
      maxDailyNotifications: json['maxDailyNotifications'] as int? ?? 10,
    );
  }

  static TimeOfDay _parseTimeOfDay(String time) {
    final parts = time.split(':');
    return TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );
  }

  Map<String, dynamic> toJson() => {
        'pushEnabled': pushEnabled,
        'emailEnabled': emailEnabled,
        'inAppEnabled': inAppEnabled,
        'sessionUpdates': sessionUpdates,
        'achievements': achievements,
        'messages': messages,
        'reminders': reminders,
        'alerts': alerts,
        'billing': billing,
        'encouragement': encouragement,
        'quietHoursEnabled': quietHoursEnabled,
        'quietHoursStart': quietHoursStart != null
            ? '${quietHoursStart!.hour.toString().padLeft(2, '0')}:${quietHoursStart!.minute.toString().padLeft(2, '0')}'
            : null,
        'quietHoursEnd': quietHoursEnd != null
            ? '${quietHoursEnd!.hour.toString().padLeft(2, '0')}:${quietHoursEnd!.minute.toString().padLeft(2, '0')}'
            : null,
        'timezone': timezone,
        'reminderFrequency': reminderFrequency.name,
        'maxDailyNotifications': maxDailyNotifications,
      };

  NotificationPreferences copyWith({
    bool? pushEnabled,
    bool? emailEnabled,
    bool? inAppEnabled,
    bool? sessionUpdates,
    bool? achievements,
    bool? messages,
    bool? reminders,
    bool? alerts,
    bool? billing,
    bool? encouragement,
    bool? quietHoursEnabled,
    TimeOfDay? quietHoursStart,
    TimeOfDay? quietHoursEnd,
    String? timezone,
    NotificationFrequency? reminderFrequency,
    int? maxDailyNotifications,
  }) {
    return NotificationPreferences(
      pushEnabled: pushEnabled ?? this.pushEnabled,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      inAppEnabled: inAppEnabled ?? this.inAppEnabled,
      sessionUpdates: sessionUpdates ?? this.sessionUpdates,
      achievements: achievements ?? this.achievements,
      messages: messages ?? this.messages,
      reminders: reminders ?? this.reminders,
      alerts: alerts ?? this.alerts,
      billing: billing ?? this.billing,
      encouragement: encouragement ?? this.encouragement,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietHoursStart: quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? this.quietHoursEnd,
      timezone: timezone ?? this.timezone,
      reminderFrequency: reminderFrequency ?? this.reminderFrequency,
      maxDailyNotifications:
          maxDailyNotifications ?? this.maxDailyNotifications,
    );
  }

  /// Check if a notification type is enabled
  bool isTypeEnabled(String channelId) {
    switch (channelId) {
      case 'session_updates':
        return sessionUpdates;
      case 'achievements':
        return achievements;
      case 'messages':
        return messages;
      case 'reminders':
        return reminders;
      case 'alerts':
        return alerts;
      case 'billing':
        return billing;
      case 'encouragement':
        return encouragement;
      default:
        return true;
    }
  }

  /// Check if currently in quiet hours
  bool isInQuietHours() {
    if (!quietHoursEnabled ||
        quietHoursStart == null ||
        quietHoursEnd == null) {
      return false;
    }

    final now = TimeOfDay.now();
    final nowMinutes = now.hour * 60 + now.minute;
    final startMinutes = quietHoursStart!.hour * 60 + quietHoursStart!.minute;
    final endMinutes = quietHoursEnd!.hour * 60 + quietHoursEnd!.minute;

    if (startMinutes < endMinutes) {
      // Quiet hours don't span midnight
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      // Quiet hours span midnight
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
  }
}

enum NotificationFrequency {
  realtime,
  hourly,
  daily,
  weekly,
}

/// Learner-specific notification settings (parent controlled)
class LearnerNotificationSettings {
  final bool notificationsEnabled;
  final bool sessionRemindersEnabled;
  final bool achievementNotificationsEnabled;
  final bool encouragementEnabled;
  final TimeOfDay? reminderTime;
  final List<int> reminderDays; // 1-7, Monday-Sunday

  const LearnerNotificationSettings({
    this.notificationsEnabled = true,
    this.sessionRemindersEnabled = true,
    this.achievementNotificationsEnabled = true,
    this.encouragementEnabled = true,
    this.reminderTime,
    this.reminderDays = const [1, 2, 3, 4, 5], // Weekdays by default
  });

  factory LearnerNotificationSettings.fromJson(Map<String, dynamic> json) {
    return LearnerNotificationSettings(
      notificationsEnabled: json['notificationsEnabled'] as bool? ?? true,
      sessionRemindersEnabled:
          json['sessionRemindersEnabled'] as bool? ?? true,
      achievementNotificationsEnabled:
          json['achievementNotificationsEnabled'] as bool? ?? true,
      encouragementEnabled: json['encouragementEnabled'] as bool? ?? true,
      reminderTime: json['reminderTime'] != null
          ? _parseTimeOfDay(json['reminderTime'])
          : null,
      reminderDays: (json['reminderDays'] as List<dynamic>?)
              ?.map((e) => e as int)
              .toList() ??
          const [1, 2, 3, 4, 5],
    );
  }

  static TimeOfDay _parseTimeOfDay(String time) {
    final parts = time.split(':');
    return TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );
  }

  Map<String, dynamic> toJson() => {
        'notificationsEnabled': notificationsEnabled,
        'sessionRemindersEnabled': sessionRemindersEnabled,
        'achievementNotificationsEnabled': achievementNotificationsEnabled,
        'encouragementEnabled': encouragementEnabled,
        'reminderTime': reminderTime != null
            ? '${reminderTime!.hour.toString().padLeft(2, '0')}:${reminderTime!.minute.toString().padLeft(2, '0')}'
            : null,
        'reminderDays': reminderDays,
      };

  LearnerNotificationSettings copyWith({
    bool? notificationsEnabled,
    bool? sessionRemindersEnabled,
    bool? achievementNotificationsEnabled,
    bool? encouragementEnabled,
    TimeOfDay? reminderTime,
    List<int>? reminderDays,
  }) {
    return LearnerNotificationSettings(
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      sessionRemindersEnabled:
          sessionRemindersEnabled ?? this.sessionRemindersEnabled,
      achievementNotificationsEnabled:
          achievementNotificationsEnabled ?? this.achievementNotificationsEnabled,
      encouragementEnabled: encouragementEnabled ?? this.encouragementEnabled,
      reminderTime: reminderTime ?? this.reminderTime,
      reminderDays: reminderDays ?? this.reminderDays,
    );
  }
}
