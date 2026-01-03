import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';

import 'models/aivo_notification.dart';
import 'notification_analytics.dart';

/// Firebase Analytics implementation of NotificationAnalytics
///
/// Sends notification events to Firebase Analytics for tracking.
/// COPPA compliant - does not collect personal information.
class FirebaseNotificationAnalytics implements NotificationAnalytics {
  FirebaseNotificationAnalytics({
    FirebaseAnalytics? analytics,
  }) : _analytics = analytics ?? FirebaseAnalytics.instance;

  final FirebaseAnalytics _analytics;

  @override
  void logNotificationReceived(AivoNotification notification) {
    _logEvent('notification_received', {
      'notification_type': notification.type,
      'has_action': (notification.actionUrl != null).toString(),
    });
  }

  @override
  void logNotificationTapped(AivoNotification notification) {
    _logEvent('notification_tapped', {
      'notification_type': notification.type,
      'action_url': notification.actionUrl ?? 'none',
    });
  }

  @override
  void logNotificationScheduled(
    AivoNotification notification,
    DateTime scheduledTime,
  ) {
    _logEvent('notification_scheduled', {
      'notification_type': notification.type,
      'delay_minutes': scheduledTime.difference(DateTime.now()).inMinutes.toString(),
    });
  }

  @override
  void logBlockedNotification(AivoNotification notification, String reason) {
    _logEvent('notification_blocked', {
      'notification_type': notification.type,
      'block_reason': reason,
    });
  }

  @override
  void logTopicSubscribed(String topic) {
    _logEvent('notification_topic_subscribed', {
      'topic': topic,
    });
  }

  @override
  void logTopicUnsubscribed(String topic) {
    _logEvent('notification_topic_unsubscribed', {
      'topic': topic,
    });
  }

  @override
  void logPermissionChanged(bool granted) {
    _logEvent('notification_permission_changed', {
      'granted': granted.toString(),
    });
  }

  @override
  void logPreferencesUpdated(Map<String, dynamic> preferences) {
    // Only log non-sensitive preference keys
    final safePrefs = <String, Object>{};
    for (final key in preferences.keys) {
      final value = preferences[key];
      if (value is bool || value is String || value is num) {
        safePrefs[key] = value.toString();
      }
    }

    _logEvent('notification_preferences_updated', safePrefs);
  }

  void _logEvent(String name, Map<String, Object> parameters) {
    try {
      _analytics.logEvent(
        name: name,
        parameters: parameters,
      );
    } catch (e) {
      debugPrint('[FirebaseNotificationAnalytics] Error logging event: $e');
    }
  }
}

/// Composite analytics that logs to multiple implementations
///
/// Useful for debugging - logs to both Firebase and console
class CompositeNotificationAnalytics implements NotificationAnalytics {
  CompositeNotificationAnalytics(this.implementations);

  final List<NotificationAnalytics> implementations;

  @override
  void logNotificationReceived(AivoNotification notification) {
    for (final impl in implementations) {
      impl.logNotificationReceived(notification);
    }
  }

  @override
  void logNotificationTapped(AivoNotification notification) {
    for (final impl in implementations) {
      impl.logNotificationTapped(notification);
    }
  }

  @override
  void logNotificationScheduled(
    AivoNotification notification,
    DateTime scheduledTime,
  ) {
    for (final impl in implementations) {
      impl.logNotificationScheduled(notification, scheduledTime);
    }
  }

  @override
  void logBlockedNotification(AivoNotification notification, String reason) {
    for (final impl in implementations) {
      impl.logBlockedNotification(notification, reason);
    }
  }

  @override
  void logTopicSubscribed(String topic) {
    for (final impl in implementations) {
      impl.logTopicSubscribed(topic);
    }
  }

  @override
  void logTopicUnsubscribed(String topic) {
    for (final impl in implementations) {
      impl.logTopicUnsubscribed(topic);
    }
  }

  @override
  void logPermissionChanged(bool granted) {
    for (final impl in implementations) {
      impl.logPermissionChanged(granted);
    }
  }

  @override
  void logPreferencesUpdated(Map<String, dynamic> preferences) {
    for (final impl in implementations) {
      impl.logPreferencesUpdated(preferences);
    }
  }
}
