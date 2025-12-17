/// Notification Service
///
/// Manages push notifications, preferences, and in-app notifications.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Notification type.
enum NotificationType {
  learning,
  achievement,
  streak,
  reminder,
  social,
  system,
  parentMessage,
  teacherMessage;
}

/// Notification priority.
enum NotificationPriority {
  low,
  normal,
  high,
  urgent;
}

/// Push notification.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.imageUrl,
    this.data = const {},
    this.priority = NotificationPriority.normal,
    required this.createdAt,
    this.readAt,
    this.expiresAt,
    this.actionUrl,
  });

  final String id;
  final NotificationType type;
  final String title;
  final String body;
  final String? imageUrl;
  final Map<String, dynamic> data;
  final NotificationPriority priority;
  final DateTime createdAt;
  final DateTime? readAt;
  final DateTime? expiresAt;
  final String? actionUrl;

  bool get isRead => readAt != null;
  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      type: NotificationType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => NotificationType.system,
      ),
      title: json['title'] as String,
      body: json['body'] as String,
      imageUrl: json['imageUrl'] as String?,
      data: (json['data'] as Map<String, dynamic>?) ?? {},
      priority: NotificationPriority.values.firstWhere(
        (p) => p.name == json['priority'],
        orElse: () => NotificationPriority.normal,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      readAt: json['readAt'] != null
          ? DateTime.parse(json['readAt'] as String)
          : null,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
      actionUrl: json['actionUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'title': title,
        'body': body,
        'imageUrl': imageUrl,
        'data': data,
        'priority': priority.name,
        'createdAt': createdAt.toIso8601String(),
        'readAt': readAt?.toIso8601String(),
        'expiresAt': expiresAt?.toIso8601String(),
        'actionUrl': actionUrl,
      };

  AppNotification copyWith({
    String? id,
    NotificationType? type,
    String? title,
    String? body,
    String? imageUrl,
    Map<String, dynamic>? data,
    NotificationPriority? priority,
    DateTime? createdAt,
    DateTime? readAt,
    DateTime? expiresAt,
    String? actionUrl,
  }) {
    return AppNotification(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      body: body ?? this.body,
      imageUrl: imageUrl ?? this.imageUrl,
      data: data ?? this.data,
      priority: priority ?? this.priority,
      createdAt: createdAt ?? this.createdAt,
      readAt: readAt ?? this.readAt,
      expiresAt: expiresAt ?? this.expiresAt,
      actionUrl: actionUrl ?? this.actionUrl,
    );
  }
}

/// Notification preferences.
class NotificationPreferences {
  const NotificationPreferences({
    this.enabled = true,
    this.learningReminders = true,
    this.achievementAlerts = true,
    this.streakReminders = true,
    this.socialNotifications = true,
    this.parentMessages = true,
    this.teacherMessages = true,
    this.quietHoursEnabled = false,
    this.quietHoursStart,
    this.quietHoursEnd,
    this.soundEnabled = true,
    this.vibrationEnabled = true,
  });

  final bool enabled;
  final bool learningReminders;
  final bool achievementAlerts;
  final bool streakReminders;
  final bool socialNotifications;
  final bool parentMessages;
  final bool teacherMessages;
  final bool quietHoursEnabled;
  final String? quietHoursStart; // HH:mm format
  final String? quietHoursEnd; // HH:mm format
  final bool soundEnabled;
  final bool vibrationEnabled;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      enabled: json['enabled'] as bool? ?? true,
      learningReminders: json['learningReminders'] as bool? ?? true,
      achievementAlerts: json['achievementAlerts'] as bool? ?? true,
      streakReminders: json['streakReminders'] as bool? ?? true,
      socialNotifications: json['socialNotifications'] as bool? ?? true,
      parentMessages: json['parentMessages'] as bool? ?? true,
      teacherMessages: json['teacherMessages'] as bool? ?? true,
      quietHoursEnabled: json['quietHoursEnabled'] as bool? ?? false,
      quietHoursStart: json['quietHoursStart'] as String?,
      quietHoursEnd: json['quietHoursEnd'] as String?,
      soundEnabled: json['soundEnabled'] as bool? ?? true,
      vibrationEnabled: json['vibrationEnabled'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'learningReminders': learningReminders,
        'achievementAlerts': achievementAlerts,
        'streakReminders': streakReminders,
        'socialNotifications': socialNotifications,
        'parentMessages': parentMessages,
        'teacherMessages': teacherMessages,
        'quietHoursEnabled': quietHoursEnabled,
        'quietHoursStart': quietHoursStart,
        'quietHoursEnd': quietHoursEnd,
        'soundEnabled': soundEnabled,
        'vibrationEnabled': vibrationEnabled,
      };

  NotificationPreferences copyWith({
    bool? enabled,
    bool? learningReminders,
    bool? achievementAlerts,
    bool? streakReminders,
    bool? socialNotifications,
    bool? parentMessages,
    bool? teacherMessages,
    bool? quietHoursEnabled,
    String? quietHoursStart,
    String? quietHoursEnd,
    bool? soundEnabled,
    bool? vibrationEnabled,
  }) {
    return NotificationPreferences(
      enabled: enabled ?? this.enabled,
      learningReminders: learningReminders ?? this.learningReminders,
      achievementAlerts: achievementAlerts ?? this.achievementAlerts,
      streakReminders: streakReminders ?? this.streakReminders,
      socialNotifications: socialNotifications ?? this.socialNotifications,
      parentMessages: parentMessages ?? this.parentMessages,
      teacherMessages: teacherMessages ?? this.teacherMessages,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietHoursStart: quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? this.quietHoursEnd,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
    );
  }
}

/// Device registration info.
class DeviceRegistration {
  const DeviceRegistration({
    required this.deviceId,
    required this.platform,
    required this.pushToken,
    this.appVersion,
    this.osVersion,
    this.deviceModel,
    this.registeredAt,
  });

  final String deviceId;
  final String platform; // 'ios', 'android'
  final String pushToken;
  final String? appVersion;
  final String? osVersion;
  final String? deviceModel;
  final DateTime? registeredAt;

  factory DeviceRegistration.fromJson(Map<String, dynamic> json) {
    return DeviceRegistration(
      deviceId: json['deviceId'] as String,
      platform: json['platform'] as String,
      pushToken: json['pushToken'] as String,
      appVersion: json['appVersion'] as String?,
      osVersion: json['osVersion'] as String?,
      deviceModel: json['deviceModel'] as String?,
      registeredAt: json['registeredAt'] != null
          ? DateTime.parse(json['registeredAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'deviceId': deviceId,
        'platform': platform,
        'pushToken': pushToken,
        'appVersion': appVersion,
        'osVersion': osVersion,
        'deviceModel': deviceModel,
        'registeredAt': registeredAt?.toIso8601String(),
      };
}

/// Notification badge count.
class NotificationBadge {
  const NotificationBadge({
    required this.total,
    this.byType = const {},
  });

  final int total;
  final Map<NotificationType, int> byType;

  factory NotificationBadge.fromJson(Map<String, dynamic> json) {
    return NotificationBadge(
      total: json['total'] as int? ?? 0,
      byType: (json['byType'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(
              NotificationType.values.firstWhere(
                (t) => t.name == k,
                orElse: () => NotificationType.system,
              ),
              v as int,
            ),
          ) ??
          {},
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for managing notifications.
class NotificationService {
  NotificationService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;
  static const String _basePath = '/notify/v1';

  // Notification stream for in-app notifications
  final _notificationController = StreamController<AppNotification>.broadcast();
  Stream<AppNotification> get notificationStream =>
      _notificationController.stream;

  /// Register device for push notifications.
  Future<DeviceRegistration> registerDevice({
    required String deviceId,
    required String platform,
    required String pushToken,
    String? appVersion,
    String? osVersion,
    String? deviceModel,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '$_basePath/devices',
      data: {
        'deviceId': deviceId,
        'platform': platform,
        'pushToken': pushToken,
        'appVersion': appVersion,
        'osVersion': osVersion,
        'deviceModel': deviceModel,
      },
    );

    return DeviceRegistration.fromJson(response.data!);
  }

  /// Update device push token.
  Future<void> updatePushToken({
    required String deviceId,
    required String pushToken,
  }) async {
    await _apiClient.patch(
      '$_basePath/devices/$deviceId',
      data: {'pushToken': pushToken},
    );
  }

  /// Unregister device.
  Future<void> unregisterDevice(String deviceId) async {
    await _apiClient.delete('$_basePath/devices/$deviceId');
  }

  /// Get notifications.
  Future<List<AppNotification>> getNotifications({
    int limit = 50,
    int offset = 0,
    bool unreadOnly = false,
    NotificationType? type,
  }) async {
    final queryParams = <String, dynamic>{
      'limit': limit,
      'offset': offset,
      if (unreadOnly) 'unreadOnly': true,
      if (type != null) 'type': type.name,
    };

    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_basePath/notifications',
      queryParameters: queryParams,
    );

    final data = response.data;
    final items = (data?['items'] as List<dynamic>?) ?? [];

    return items
        .map((n) => AppNotification.fromJson(n as Map<String, dynamic>))
        .toList();
  }

  /// Get unread notification count.
  Future<NotificationBadge> getUnreadCount() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_basePath/notifications/unread-count',
    );

    return NotificationBadge.fromJson(response.data ?? {'total': 0});
  }

  /// Mark notification as read.
  Future<void> markAsRead(String notificationId) async {
    await _apiClient.post(
      '$_basePath/notifications/$notificationId/read',
    );
  }

  /// Mark all notifications as read.
  Future<void> markAllAsRead({NotificationType? type}) async {
    await _apiClient.post(
      '$_basePath/notifications/read-all',
      data: {
        if (type != null) 'type': type.name,
      },
    );
  }

  /// Delete notification.
  Future<void> deleteNotification(String notificationId) async {
    await _apiClient.delete('$_basePath/notifications/$notificationId');
  }

  /// Delete all notifications.
  Future<void> deleteAllNotifications() async {
    await _apiClient.delete('$_basePath/notifications');
  }

  /// Get notification preferences.
  Future<NotificationPreferences> getPreferences() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_basePath/preferences',
    );

    return NotificationPreferences.fromJson(response.data ?? {});
  }

  /// Update notification preferences.
  Future<NotificationPreferences> updatePreferences(
      NotificationPreferences preferences) async {
    final response = await _apiClient.put<Map<String, dynamic>>(
      '$_basePath/preferences',
      data: preferences.toJson(),
    );

    return NotificationPreferences.fromJson(response.data ?? {});
  }

  /// Handle incoming push notification.
  void handlePushNotification(Map<String, dynamic> message) {
    try {
      final notification = AppNotification.fromJson(message);
      _notificationController.add(notification);
    } catch (e) {
      // Log error but don't crash
    }
  }

  /// Dispose resources.
  void dispose() {
    _notificationController.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for NotificationService.
final notificationServiceProvider = Provider<NotificationService>((ref) {
  final service = NotificationService(
    apiClient: AivoApiClient.instance,
  );

  ref.onDispose(() => service.dispose());

  return service;
});

/// Provider for notifications list.
final notificationsProvider =
    FutureProvider<List<AppNotification>>((ref) async {
  final service = ref.watch(notificationServiceProvider);
  return service.getNotifications();
});

/// Provider for unread notification count.
final unreadNotificationCountProvider =
    FutureProvider<NotificationBadge>((ref) async {
  final service = ref.watch(notificationServiceProvider);
  return service.getUnreadCount();
});

/// Provider for notification preferences.
final notificationPreferencesProvider =
    FutureProvider<NotificationPreferences>((ref) async {
  final service = ref.watch(notificationServiceProvider);
  return service.getPreferences();
});

/// Stream provider for real-time notifications.
final notificationStreamProvider = StreamProvider<AppNotification>((ref) {
  final service = ref.watch(notificationServiceProvider);
  return service.notificationStream;
});
