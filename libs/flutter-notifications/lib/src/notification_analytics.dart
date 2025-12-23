import 'models/aivo_notification.dart';

/// Analytics interface for notification tracking
abstract class NotificationAnalytics {
  /// Log when a notification is received
  void logNotificationReceived(AivoNotification notification);

  /// Log when a notification is tapped
  void logNotificationTapped(AivoNotification notification);

  /// Log when a notification is scheduled
  void logNotificationScheduled(
    AivoNotification notification,
    DateTime scheduledTime,
  );

  /// Log when a notification is blocked (e.g., COPPA violation)
  void logBlockedNotification(AivoNotification notification, String reason);

  /// Log when a topic is subscribed
  void logTopicSubscribed(String topic);

  /// Log when a topic is unsubscribed
  void logTopicUnsubscribed(String topic);

  /// Log when notification permissions change
  void logPermissionChanged(bool granted);

  /// Log when preferences are updated
  void logPreferencesUpdated(Map<String, dynamic> preferences);
}

/// Default implementation that does nothing (for testing/development)
class NoOpNotificationAnalytics implements NotificationAnalytics {
  @override
  void logNotificationReceived(AivoNotification notification) {}

  @override
  void logNotificationTapped(AivoNotification notification) {}

  @override
  void logNotificationScheduled(
    AivoNotification notification,
    DateTime scheduledTime,
  ) {}

  @override
  void logBlockedNotification(AivoNotification notification, String reason) {}

  @override
  void logTopicSubscribed(String topic) {}

  @override
  void logTopicUnsubscribed(String topic) {}

  @override
  void logPermissionChanged(bool granted) {}

  @override
  void logPreferencesUpdated(Map<String, dynamic> preferences) {}
}

/// Implementation that logs to console (for debugging)
class ConsoleNotificationAnalytics implements NotificationAnalytics {
  @override
  void logNotificationReceived(AivoNotification notification) {
    print('[Notification] Received: ${notification.type} - ${notification.title}');
  }

  @override
  void logNotificationTapped(AivoNotification notification) {
    print('[Notification] Tapped: ${notification.type} - ${notification.title}');
  }

  @override
  void logNotificationScheduled(
    AivoNotification notification,
    DateTime scheduledTime,
  ) {
    print('[Notification] Scheduled: ${notification.title} for $scheduledTime');
  }

  @override
  void logBlockedNotification(AivoNotification notification, String reason) {
    print('[Notification] Blocked: ${notification.title} - Reason: $reason');
  }

  @override
  void logTopicSubscribed(String topic) {
    print('[Notification] Subscribed to topic: $topic');
  }

  @override
  void logTopicUnsubscribed(String topic) {
    print('[Notification] Unsubscribed from topic: $topic');
  }

  @override
  void logPermissionChanged(bool granted) {
    print('[Notification] Permission changed: ${granted ? "granted" : "denied"}');
  }

  @override
  void logPreferencesUpdated(Map<String, dynamic> preferences) {
    print('[Notification] Preferences updated: $preferences');
  }
}

/// Metrics collector for notification analytics
class NotificationMetrics {
  int _receivedCount = 0;
  int _tappedCount = 0;
  int _blockedCount = 0;
  int _scheduledCount = 0;
  final Map<String, int> _typeBreakdown = {};
  final Map<String, int> _topicSubscriptions = {};

  /// Increment received count
  void incrementReceived(String type) {
    _receivedCount++;
    _typeBreakdown[type] = (_typeBreakdown[type] ?? 0) + 1;
  }

  /// Increment tapped count
  void incrementTapped() {
    _tappedCount++;
  }

  /// Increment blocked count
  void incrementBlocked() {
    _blockedCount++;
  }

  /// Increment scheduled count
  void incrementScheduled() {
    _scheduledCount++;
  }

  /// Track topic subscription
  void trackTopicSubscription(String topic) {
    _topicSubscriptions[topic] = (_topicSubscriptions[topic] ?? 0) + 1;
  }

  /// Get metrics summary
  Map<String, dynamic> getSummary() => {
        'received': _receivedCount,
        'tapped': _tappedCount,
        'blocked': _blockedCount,
        'scheduled': _scheduledCount,
        'tapRate': _receivedCount > 0 ? _tappedCount / _receivedCount : 0,
        'typeBreakdown': _typeBreakdown,
        'topicSubscriptions': _topicSubscriptions,
      };

  /// Calculate tap rate percentage
  double get tapRate =>
      _receivedCount > 0 ? (_tappedCount / _receivedCount) * 100 : 0;

  /// Reset metrics
  void reset() {
    _receivedCount = 0;
    _tappedCount = 0;
    _blockedCount = 0;
    _scheduledCount = 0;
    _typeBreakdown.clear();
    _topicSubscriptions.clear();
  }
}
