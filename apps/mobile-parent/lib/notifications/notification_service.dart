/// Notification Service
///
/// Service for managing parent notification preferences.
library;

import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

/// Notification urgency levels
enum NotificationUrgency {
  critical('critical', 'Critical'),
  high('high', 'High'),
  medium('medium', 'Medium'),
  low('low', 'Low'),
  info('info', 'Info');

  const NotificationUrgency(this.value, this.displayName);
  final String value;
  final String displayName;

  static NotificationUrgency fromString(String value) {
    return NotificationUrgency.values.firstWhere(
      (e) => e.value == value,
      orElse: () => NotificationUrgency.medium,
    );
  }
}

/// Notification categories
enum NotificationCategory {
  emotionalState('emotional_state', 'Emotional State', 'Alerts when your child experiences emotional changes'),
  achievement('achievement', 'Achievements', 'Badges, levels, and milestones'),
  sessionActivity('session_activity', 'Session Activity', 'Learning session updates'),
  learningProgress('learning_progress', 'Learning Progress', 'Weekly progress and skill improvements'),
  safetyConcern('safety_concern', 'Safety Concerns', 'Critical safety alerts'),
  goalUpdate('goal_update', 'Goals', 'Goal progress and completions'),
  careTeam('care_team', 'Care Team', 'Messages from teachers and specialists'),
  system('system', 'System', 'Account and app updates'),
  reminder('reminder', 'Reminders', 'Scheduled reminders and check-ins');

  const NotificationCategory(this.value, this.displayName, this.description);
  final String value;
  final String displayName;
  final String description;

  static NotificationCategory fromString(String value) {
    return NotificationCategory.values.firstWhere(
      (e) => e.value == value,
      orElse: () => NotificationCategory.system,
    );
  }
}

/// Digest frequency options
enum DigestFrequency {
  realtime('realtime', 'Realtime'),
  hourly('hourly', 'Hourly'),
  daily('daily', 'Daily'),
  weekly('weekly', 'Weekly');

  const DigestFrequency(this.value, this.displayName);
  final String value;
  final String displayName;

  static DigestFrequency fromString(String value) {
    return DigestFrequency.values.firstWhere(
      (e) => e.value == value,
      orElse: () => DigestFrequency.daily,
    );
  }
}

/// Settings for a specific urgency level
class UrgencyChannelSettings {
  UrgencyChannelSettings({
    required this.push,
    required this.email,
    required this.sms,
    required this.inApp,
  });

  factory UrgencyChannelSettings.fromJson(Map<String, dynamic> json) {
    return UrgencyChannelSettings(
      push: json['push'] as bool? ?? false,
      email: json['email'] as bool? ?? false,
      sms: json['sms'] as bool? ?? false,
      inApp: json['inApp'] as bool? ?? true,
    );
  }

  final bool push;
  final bool email;
  final bool sms;
  final bool inApp;

  Map<String, dynamic> toJson() => {
        'push': push,
        'email': email,
        'sms': sms,
        'inApp': inApp,
      };

  UrgencyChannelSettings copyWith({
    bool? push,
    bool? email,
    bool? sms,
    bool? inApp,
  }) {
    return UrgencyChannelSettings(
      push: push ?? this.push,
      email: email ?? this.email,
      sms: sms ?? this.sms,
      inApp: inApp ?? this.inApp,
    );
  }
}

/// Settings for a notification category
class CategorySettings {
  CategorySettings({
    required this.enabled,
    required this.minimumUrgency,
  });

  factory CategorySettings.fromJson(Map<String, dynamic> json) {
    return CategorySettings(
      enabled: json['enabled'] as bool? ?? true,
      minimumUrgency: NotificationUrgency.fromString(
        json['minimumUrgency'] as String? ?? 'low',
      ),
    );
  }

  final bool enabled;
  final NotificationUrgency minimumUrgency;

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'minimumUrgency': minimumUrgency.value,
      };

  CategorySettings copyWith({
    bool? enabled,
    NotificationUrgency? minimumUrgency,
  }) {
    return CategorySettings(
      enabled: enabled ?? this.enabled,
      minimumUrgency: minimumUrgency ?? this.minimumUrgency,
    );
  }
}

/// Parent notification preferences
class NotificationPreferences {
  NotificationPreferences({
    required this.id,
    required this.parentId,
    required this.learnerId,
    required this.learnerName,
    required this.urgencySettings,
    required this.categorySettings,
    required this.pushEnabled,
    required this.emailEnabled,
    required this.smsEnabled,
    required this.inAppEnabled,
    this.email,
    this.phoneNumber,
    required this.quietHoursEnabled,
    required this.quietHoursStart,
    required this.quietHoursEnd,
    required this.quietHoursBypassCritical,
    required this.digestEnabled,
    required this.digestFrequency,
    required this.digestTime,
    required this.digestDay,
    required this.maxNotificationsPerHour,
    required this.maxNotificationsPerDay,
    required this.timezone,
    required this.language,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    final urgencySettingsJson =
        json['urgencySettings'] as Map<String, dynamic>? ?? {};
    final categorySettingsJson =
        json['categorySettings'] as Map<String, dynamic>? ?? {};

    final urgencySettings = <NotificationUrgency, UrgencyChannelSettings>{};
    for (final entry in urgencySettingsJson.entries) {
      final urgency = NotificationUrgency.fromString(entry.key);
      urgencySettings[urgency] = UrgencyChannelSettings.fromJson(
        entry.value as Map<String, dynamic>,
      );
    }

    final categorySettings = <NotificationCategory, CategorySettings>{};
    for (final entry in categorySettingsJson.entries) {
      final category = NotificationCategory.fromString(entry.key);
      categorySettings[category] = CategorySettings.fromJson(
        entry.value as Map<String, dynamic>,
      );
    }

    return NotificationPreferences(
      id: json['id'] as String? ?? '',
      parentId: json['parentId'] as String? ?? '',
      learnerId: json['learnerId'] as String? ?? '',
      learnerName: json['learnerName'] as String? ?? '',
      urgencySettings: urgencySettings,
      categorySettings: categorySettings,
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      emailEnabled: json['emailEnabled'] as bool? ?? true,
      smsEnabled: json['smsEnabled'] as bool? ?? false,
      inAppEnabled: json['inAppEnabled'] as bool? ?? true,
      email: json['email'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      quietHoursEnabled: json['quietHoursEnabled'] as bool? ?? false,
      quietHoursStart: json['quietHoursStart'] as String? ?? '22:00',
      quietHoursEnd: json['quietHoursEnd'] as String? ?? '07:00',
      quietHoursBypassCritical: json['quietHoursBypassCritical'] as bool? ?? true,
      digestEnabled: json['digestEnabled'] as bool? ?? true,
      digestFrequency: DigestFrequency.fromString(
        json['digestFrequency'] as String? ?? 'daily',
      ),
      digestTime: json['digestTime'] as String? ?? '18:00',
      digestDay: json['digestDay'] as int? ?? 1,
      maxNotificationsPerHour: json['maxNotificationsPerHour'] as int? ?? 10,
      maxNotificationsPerDay: json['maxNotificationsPerDay'] as int? ?? 50,
      timezone: json['timezone'] as String? ?? 'America/New_York',
      language: json['language'] as String? ?? 'en',
    );
  }

  final String id;
  final String parentId;
  final String learnerId;
  final String learnerName;
  final Map<NotificationUrgency, UrgencyChannelSettings> urgencySettings;
  final Map<NotificationCategory, CategorySettings> categorySettings;
  final bool pushEnabled;
  final bool emailEnabled;
  final bool smsEnabled;
  final bool inAppEnabled;
  final String? email;
  final String? phoneNumber;
  final bool quietHoursEnabled;
  final String quietHoursStart;
  final String quietHoursEnd;
  final bool quietHoursBypassCritical;
  final bool digestEnabled;
  final DigestFrequency digestFrequency;
  final String digestTime;
  final int digestDay;
  final int maxNotificationsPerHour;
  final int maxNotificationsPerDay;
  final String timezone;
  final String language;

  Map<String, dynamic> toJson() {
    final urgencySettingsJson = <String, dynamic>{};
    for (final entry in urgencySettings.entries) {
      urgencySettingsJson[entry.key.value] = entry.value.toJson();
    }

    final categorySettingsJson = <String, dynamic>{};
    for (final entry in categorySettings.entries) {
      categorySettingsJson[entry.key.value] = entry.value.toJson();
    }

    return {
      'id': id,
      'parentId': parentId,
      'learnerId': learnerId,
      'learnerName': learnerName,
      'urgencySettings': urgencySettingsJson,
      'categorySettings': categorySettingsJson,
      'pushEnabled': pushEnabled,
      'emailEnabled': emailEnabled,
      'smsEnabled': smsEnabled,
      'inAppEnabled': inAppEnabled,
      'email': email,
      'phoneNumber': phoneNumber,
      'quietHoursEnabled': quietHoursEnabled,
      'quietHoursStart': quietHoursStart,
      'quietHoursEnd': quietHoursEnd,
      'quietHoursBypassCritical': quietHoursBypassCritical,
      'digestEnabled': digestEnabled,
      'digestFrequency': digestFrequency.value,
      'digestTime': digestTime,
      'digestDay': digestDay,
      'maxNotificationsPerHour': maxNotificationsPerHour,
      'maxNotificationsPerDay': maxNotificationsPerDay,
      'timezone': timezone,
      'language': language,
    };
  }

  NotificationPreferences copyWith({
    String? id,
    String? parentId,
    String? learnerId,
    String? learnerName,
    Map<NotificationUrgency, UrgencyChannelSettings>? urgencySettings,
    Map<NotificationCategory, CategorySettings>? categorySettings,
    bool? pushEnabled,
    bool? emailEnabled,
    bool? smsEnabled,
    bool? inAppEnabled,
    String? email,
    String? phoneNumber,
    bool? quietHoursEnabled,
    String? quietHoursStart,
    String? quietHoursEnd,
    bool? quietHoursBypassCritical,
    bool? digestEnabled,
    DigestFrequency? digestFrequency,
    String? digestTime,
    int? digestDay,
    int? maxNotificationsPerHour,
    int? maxNotificationsPerDay,
    String? timezone,
    String? language,
  }) {
    return NotificationPreferences(
      id: id ?? this.id,
      parentId: parentId ?? this.parentId,
      learnerId: learnerId ?? this.learnerId,
      learnerName: learnerName ?? this.learnerName,
      urgencySettings: urgencySettings ?? this.urgencySettings,
      categorySettings: categorySettings ?? this.categorySettings,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      inAppEnabled: inAppEnabled ?? this.inAppEnabled,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietHoursStart: quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? this.quietHoursEnd,
      quietHoursBypassCritical:
          quietHoursBypassCritical ?? this.quietHoursBypassCritical,
      digestEnabled: digestEnabled ?? this.digestEnabled,
      digestFrequency: digestFrequency ?? this.digestFrequency,
      digestTime: digestTime ?? this.digestTime,
      digestDay: digestDay ?? this.digestDay,
      maxNotificationsPerHour:
          maxNotificationsPerHour ?? this.maxNotificationsPerHour,
      maxNotificationsPerDay:
          maxNotificationsPerDay ?? this.maxNotificationsPerDay,
      timezone: timezone ?? this.timezone,
      language: language ?? this.language,
    );
  }
}

/// Notification preferences state
class NotificationPreferencesState {
  const NotificationPreferencesState({
    this.preferences = const {},
    this.isLoading = false,
    this.error,
    this.isSaving = false,
  });

  final Map<String, NotificationPreferences> preferences; // keyed by learnerId
  final bool isLoading;
  final String? error;
  final bool isSaving;

  NotificationPreferences? getPreferencesForLearner(String learnerId) {
    return preferences[learnerId];
  }

  NotificationPreferencesState copyWith({
    Map<String, NotificationPreferences>? preferences,
    bool? isLoading,
    String? error,
    bool? isSaving,
  }) {
    return NotificationPreferencesState(
      preferences: preferences ?? this.preferences,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isSaving: isSaving ?? this.isSaving,
    );
  }
}

/// Notification preferences notifier
class NotificationPreferencesNotifier
    extends StateNotifier<NotificationPreferencesState> {
  NotificationPreferencesNotifier({http.Client? httpClient})
      : _client = httpClient ?? http.Client(),
        super(const NotificationPreferencesState());

  final http.Client _client;
  static const String _baseUrl = 'http://localhost:3000/api'; // TODO: Configure

  /// Load all preferences for the parent
  Future<void> loadAllPreferences() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _client.get(
        Uri.parse('$_baseUrl/parent-notifications/preferences'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final preferencesData = data['data'] as List<dynamic>? ?? [];

        final preferences = <String, NotificationPreferences>{};
        for (final item in preferencesData) {
          final pref =
              NotificationPreferences.fromJson(item as Map<String, dynamic>);
          preferences[pref.learnerId] = pref;
        }

        state = state.copyWith(preferences: preferences, isLoading: false);
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to load preferences',
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Load preferences for a specific learner
  Future<void> loadPreferencesForLearner(String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _client.get(
        Uri.parse('$_baseUrl/parent-notifications/preferences/$learnerId'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final pref = NotificationPreferences.fromJson(
          data['data'] as Map<String, dynamic>,
        );

        final updatedPreferences = Map<String, NotificationPreferences>.from(
          state.preferences,
        );
        updatedPreferences[learnerId] = pref;

        state = state.copyWith(
          preferences: updatedPreferences,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to load preferences',
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Update preferences for a learner
  Future<bool> updatePreferences(
    String learnerId,
    Map<String, dynamic> updates,
  ) async {
    state = state.copyWith(isSaving: true, error: null);

    try {
      final response = await _client.put(
        Uri.parse('$_baseUrl/parent-notifications/preferences/$learnerId'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(updates),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final pref = NotificationPreferences.fromJson(
          data['data'] as Map<String, dynamic>,
        );

        final updatedPreferences = Map<String, NotificationPreferences>.from(
          state.preferences,
        );
        updatedPreferences[learnerId] = pref;

        state = state.copyWith(
          preferences: updatedPreferences,
          isSaving: false,
        );
        return true;
      } else {
        state = state.copyWith(
          isSaving: false,
          error: 'Failed to update preferences',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  /// Reset preferences to defaults
  Future<bool> resetPreferences(String learnerId) async {
    state = state.copyWith(isSaving: true, error: null);

    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/parent-notifications/preferences/$learnerId/reset'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final pref = NotificationPreferences.fromJson(
          data['data'] as Map<String, dynamic>,
        );

        final updatedPreferences = Map<String, NotificationPreferences>.from(
          state.preferences,
        );
        updatedPreferences[learnerId] = pref;

        state = state.copyWith(
          preferences: updatedPreferences,
          isSaving: false,
        );
        return true;
      } else {
        state = state.copyWith(
          isSaving: false,
          error: 'Failed to reset preferences',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      return false;
    }
  }

  /// Register device for push notifications
  Future<bool> registerDevice({
    required String token,
    required String platform,
    String? deviceId,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/parent-notifications/devices/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'token': token,
          'platform': platform,
          'deviceId': deviceId,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Unregister device from push notifications
  Future<bool> unregisterDevice(String token) async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/parent-notifications/devices/unregister'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': token}),
      );

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Update local preferences optimistically
  void updateLocalPreferences(
    String learnerId,
    NotificationPreferences preferences,
  ) {
    final updatedPreferences = Map<String, NotificationPreferences>.from(
      state.preferences,
    );
    updatedPreferences[learnerId] = preferences;
    state = state.copyWith(preferences: updatedPreferences);
  }
}

/// Provider for notification preferences
final notificationPreferencesProvider = StateNotifierProvider<
    NotificationPreferencesNotifier, NotificationPreferencesState>(
  (ref) => NotificationPreferencesNotifier(),
);
