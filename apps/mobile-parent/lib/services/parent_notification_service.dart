import 'dart:io';

import 'package:flutter_notifications/flutter_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provider for parent notification service
final parentNotificationServiceProvider =
    Provider<ParentNotificationService>((ref) {
  return ParentNotificationService(ref);
});

/// Notification service for the Parent app
///
/// Handles notifications related to:
/// - Session summaries and completions
/// - Achievement alerts
/// - Progress milestones
/// - IEP updates
/// - Teacher messages
/// - Billing alerts
class ParentNotificationService {
  final Ref _ref;
  final NotificationService _notificationService = NotificationService();

  ParentNotificationService(this._ref);

  /// Initialize notification service
  Future<void> initialize() async {
    await _notificationService.initialize(
      onNotificationTapped: _handleNotificationTap,
      onNotificationReceived: _handleNotificationReceived,
      onTokenRefresh: _handleTokenRefresh,
      analytics: FirebaseNotificationAnalytics(),
    );

    // Subscribe to parent-specific topics
    await _subscribeToTopics();
  }

  /// Subscribe to relevant notification topics
  Future<void> _subscribeToTopics() async {
    final user = _ref.read(currentUserProvider);
    if (user == null) return;

    // Subscribe to user-specific topic
    await _notificationService.subscribeToTopic('user_${user.id}');

    // Subscribe to tenant topic
    await _notificationService.subscribeToTopic('tenant_${user.tenantId}');

    // Subscribe to each child's topics
    final childrenAsync = _ref.read(childrenProvider);
    final children = childrenAsync.valueOrNull ?? [];
    for (final child in children) {
      await _notificationService.subscribeToTopic('learner_${child.id}_parent');
    }
  }

  /// Handle notification tap - navigate to appropriate screen
  void _handleNotificationTap(AivoNotification notification) {
    final router = _ref.read(appRouterProvider);

    switch (notification.type) {
      case NotificationTypes.sessionCompleted:
      case NotificationTypes.sessionSummary:
        final childId = notification.data['child_id'];
        final sessionId = notification.data['session_id'];
        if (childId != null && sessionId != null) {
          router.push('/children/$childId/sessions/$sessionId');
        } else if (childId != null) {
          router.push('/children/$childId');
        }
        break;

      case NotificationTypes.achievementUnlocked:
        final childId = notification.data['child_id'];
        if (childId != null) {
          router.push('/children/$childId/achievements');
        }
        break;

      case NotificationTypes.teacherMessage:
        final conversationId = notification.data['conversation_id'];
        if (conversationId != null) {
          router.push('/messages/$conversationId');
        } else {
          router.push('/messages');
        }
        break;

      case NotificationTypes.iepUpdate:
        final childId = notification.data['child_id'];
        if (childId != null) {
          router.push('/children/$childId/iep');
        }
        break;

      case NotificationTypes.paymentFailed:
      case NotificationTypes.subscriptionExpiring:
        router.push('/settings/billing');
        break;

      case NotificationTypes.progressMilestone:
        final childId = notification.data['child_id'];
        if (childId != null) {
          router.push('/children/$childId/progress');
        }
        break;

      case NotificationTypes.streakMilestone:
        final childId = notification.data['child_id'];
        if (childId != null) {
          router.push('/children/$childId');
        }
        break;

      default:
        router.push('/notifications');
    }
  }

  /// Handle notification received - update state
  void _handleNotificationReceived(AivoNotification notification) {
    switch (notification.type) {
      case NotificationTypes.sessionCompleted:
        // Refresh child's recent sessions
        final childId = notification.data['child_id'];
        if (childId != null) {
          _ref.invalidate(childSessionsProvider(childId));
        }
        break;

      case NotificationTypes.achievementUnlocked:
        // Refresh achievements
        final childId = notification.data['child_id'];
        if (childId != null) {
          _ref.invalidate(childAchievementsProvider(childId));
        }
        break;

      case NotificationTypes.teacherMessage:
        // Refresh messages and increment unread count
        _ref.invalidate(messagesProvider);
        _ref.read(unreadMessageCountProvider.notifier).increment();
        break;

      case NotificationTypes.iepUpdate:
        // Refresh IEP data
        final childId = notification.data['child_id'];
        if (childId != null) {
          _ref.invalidate(childIepProvider(childId));
        }
        break;

      case NotificationTypes.progressMilestone:
        // Refresh progress data
        final childId = notification.data['child_id'];
        if (childId != null) {
          _ref.invalidate(childProgressProvider(childId));
        }
        break;
    }

    // Add to notification history
    _ref.read(notificationHistoryProvider.notifier).add(notification);
  }

  /// Handle FCM token refresh
  Future<void> _handleTokenRefresh(String? token) async {
    if (token == null) return;

    // Register token with backend
    final apiClient = _ref.read(apiClientProvider);
    await apiClient.post('/devices/register', {
      'token': token,
      'platform': Platform.isIOS ? 'ios' : 'android',
      'app': 'parent',
    });
  }

  /// Schedule daily engagement reminder for a child
  Future<void> scheduleEngagementReminder({
    required String childId,
    required String childName,
    required DateTime time,
  }) async {
    await _notificationService.scheduleNotification(
      id: 'engagement_reminder_$childId',
      title: 'Time for Learning! 📚',
      body:
          "$childName hasn't had a learning session today. A quick session can help maintain their streak!",
      scheduledTime: time,
      type: NotificationTypes.sessionReminder,
      data: {'child_id': childId, 'child_name': childName},
    );
  }

  /// Schedule streak reminder for a child
  Future<void> scheduleStreakReminder({
    required String childId,
    required String childName,
    required int currentStreak,
    required DateTime time,
  }) async {
    await _notificationService.scheduleNotification(
      id: 'streak_reminder_$childId',
      title: "Keep $childName's streak going! 🔥",
      body:
          '$currentStreak day streak! One session today will make it ${currentStreak + 1}!',
      scheduledTime: time,
      type: NotificationTypes.streakReminder,
      data: {
        'child_id': childId,
        'child_name': childName,
        'current_streak': currentStreak.toString(),
      },
    );
  }

  /// Cancel engagement reminder for a child
  Future<void> cancelEngagementReminder(String childId) async {
    await _notificationService.cancelScheduledNotification(
      'engagement_reminder_$childId',
    );
  }

  /// Cancel all reminders
  Future<void> cancelAllReminders() async {
    await _notificationService.clearAll();
  }

  /// Update notification preferences
  Future<void> updatePreferences(NotificationPreferences preferences) async {
    await _notificationService.updatePreferences(preferences);

    // Sync with backend
    final apiClient = _ref.read(apiClientProvider);
    await apiClient.put('/users/me/notification-preferences', {
      'preferences': preferences.toJson(),
    });
  }

  /// Get current preferences
  NotificationPreferences get preferences => _notificationService.preferences;

  /// Get current FCM token
  String? get currentToken => _notificationService.currentToken;

  /// Subscribe to a new child's notifications
  Future<void> subscribeToChild(String childId) async {
    await _notificationService.subscribeToTopic('learner_${childId}_parent');
  }

  /// Unsubscribe from a child's notifications
  Future<void> unsubscribeFromChild(String childId) async {
    await _notificationService.unsubscribeFromTopic('learner_${childId}_parent');
  }
}

// Placeholder providers - these would be defined elsewhere in the app
final currentUserProvider = Provider<User?>((ref) => null);
final childrenProvider = FutureProvider<List<Child>>((ref) async => []);
final appRouterProvider = Provider<AppRouter>((ref) => AppRouter());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final childSessionsProvider = Provider.family<void, String>((ref, id) {});
final childAchievementsProvider = Provider.family<void, String>((ref, id) {});
final messagesProvider = Provider<void>((ref) {});
final unreadMessageCountProvider =
    StateNotifierProvider<UnreadCountNotifier, int>((ref) => UnreadCountNotifier());
final childIepProvider = Provider.family<void, String>((ref, id) {});
final childProgressProvider = Provider.family<void, String>((ref, id) {});
final notificationHistoryProvider =
    StateNotifierProvider<NotificationHistoryNotifier, List<AivoNotification>>(
        (ref) => NotificationHistoryNotifier());

// Placeholder classes
class User {
  final String id;
  final String tenantId;
  User({required this.id, required this.tenantId});
}

class Child {
  final String id;
  Child({required this.id});
}

class AppRouter {
  void push(String path) {}
}

class ApiClient {
  Future<void> post(String path, Map<String, dynamic> data) async {}
  Future<void> put(String path, Map<String, dynamic> data) async {}
}

class UnreadCountNotifier extends StateNotifier<int> {
  UnreadCountNotifier() : super(0);
  void increment() => state++;
}

class NotificationHistoryNotifier extends StateNotifier<List<AivoNotification>> {
  NotificationHistoryNotifier() : super([]);
  void add(AivoNotification notification) {
    state = [notification, ...state].take(100).toList();
  }
}
