import 'dart:io';

import 'package:flutter_notifications/flutter_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';

/// Provider for teacher notification service
final teacherNotificationServiceProvider =
    Provider<TeacherNotificationService>((ref) {
  return TeacherNotificationService(ref);
});

/// Notification service for the Teacher app
///
/// Handles notifications related to:
/// - Student struggling alerts (high priority)
/// - Session completions
/// - Parent messages
/// - IEP goal reminders
/// - Assignment submissions
/// - Class reminders
class TeacherNotificationService {
  final Ref _ref;
  final NotificationService _notificationService = NotificationService();

  TeacherNotificationService(this._ref);

  /// Initialize notification service
  Future<void> initialize() async {
    await _notificationService.initialize(
      onNotificationTapped: _handleNotificationTap,
      onNotificationReceived: _handleNotificationReceived,
      onTokenRefresh: _handleTokenRefresh,
      analytics: FirebaseNotificationAnalytics(),
    );

    await _subscribeToTopics();
  }

  /// Subscribe to relevant notification topics
  Future<void> _subscribeToTopics() async {
    final user = _ref.read(currentUserProvider);
    if (user == null) return;

    // Teacher-specific topics
    await _notificationService.subscribeToTopic('user_${user.id}');
    await _notificationService.subscribeToTopic('tenant_${user.tenantId}');
    await _notificationService.subscribeToTopic('teachers_${user.tenantId}');

    // Subscribe to each class
    final classesAsync = _ref.read(classesProvider);
    final classes = classesAsync.valueOrNull ?? [];
    for (final classInfo in classes) {
      await _notificationService.subscribeToTopic('class_${classInfo.id}_teacher');
    }
  }

  /// Handle notification tap
  void _handleNotificationTap(AivoNotification notification) {
    final router = _ref.read(appRouterProvider);

    switch (notification.type) {
      case NotificationTypes.studentStruggling:
        final studentId = notification.data['student_id'];
        final sessionId = notification.data['session_id'];
        if (sessionId != null) {
          router.push('/live-sessions/$sessionId');
        } else if (studentId != null) {
          router.push('/students/$studentId');
        }
        break;

      case NotificationTypes.sessionCompleted:
        final classId = notification.data['class_id'];
        if (classId != null) {
          router.push('/classes/$classId/sessions');
        }
        break;

      case NotificationTypes.parentMessage:
        final conversationId = notification.data['conversation_id'];
        if (conversationId != null) {
          router.push('/messages/$conversationId');
        } else {
          router.push('/messages');
        }
        break;

      case NotificationTypes.iepGoalDue:
        final studentId = notification.data['student_id'];
        if (studentId != null) {
          router.push('/students/$studentId/iep');
        }
        break;

      case NotificationTypes.assignmentSubmitted:
        final assignmentId = notification.data['assignment_id'];
        if (assignmentId != null) {
          router.push('/assignments/$assignmentId/submissions');
        }
        break;

      case NotificationTypes.assignmentDue:
        final assignmentId = notification.data['assignment_id'];
        if (assignmentId != null) {
          router.push('/assignments/$assignmentId');
        }
        break;

      default:
        router.push('/notifications');
    }
  }

  /// Handle notification received
  void _handleNotificationReceived(AivoNotification notification) {
    switch (notification.type) {
      case NotificationTypes.studentStruggling:
        // Show alert overlay for urgent attention
        _showStrugglingStudentAlert(notification);
        // Refresh active sessions
        _ref.invalidate(activeSessionsProvider);
        break;

      case NotificationTypes.parentMessage:
        _ref.invalidate(messagesProvider);
        _ref.read(unreadMessageCountProvider.notifier).increment();
        break;

      case NotificationTypes.assignmentSubmitted:
        final assignmentId = notification.data['assignment_id'];
        if (assignmentId != null) {
          _ref.invalidate(assignmentSubmissionsProvider(assignmentId));
        }
        break;

      case NotificationTypes.sessionCompleted:
        final classId = notification.data['class_id'];
        if (classId != null) {
          _ref.invalidate(classSessionsProvider(classId));
        }
        break;
    }

    // Add to notification history
    _ref.read(notificationHistoryProvider.notifier).add(notification);
  }

  /// Show in-app alert for struggling student
  void _showStrugglingStudentAlert(AivoNotification notification) {
    final studentName = notification.data['student_name'] ?? 'A student';
    final alertType = notification.data['alert_type'] ?? 'struggling';

    // Show in-app alert banner
    _ref.read(alertBannerProvider.notifier).show(
          AlertBanner(
            title: '⚠️ $studentName needs attention',
            message: _getAlertMessage(alertType),
            action: AlertAction(
              label: 'View',
              onPressed: () => _handleNotificationTap(notification),
            ),
            duration: const Duration(seconds: 10),
            priority: AlertPriority.high,
          ),
        );
  }

  /// Get human-readable alert message
  String _getAlertMessage(String alertType) {
    switch (alertType) {
      case 'low_progress':
        return 'Making little progress on current activity';
      case 'frustrated':
        return 'Showing signs of frustration';
      case 'disengaged':
        return 'Appears to be disengaged';
      case 'repeated_errors':
        return 'Making repeated errors on similar problems';
      case 'needs_help':
        return 'Requested help with the current activity';
      case 'off_task':
        return 'May be off-task or distracted';
      default:
        return 'May need assistance';
    }
  }

  /// Handle FCM token refresh
  Future<void> _handleTokenRefresh(String? token) async {
    if (token == null) return;

    final apiClient = _ref.read(apiClientProvider);
    await apiClient.post('/devices/register', {
      'token': token,
      'platform': Platform.isIOS ? 'ios' : 'android',
      'app': 'teacher',
    });
  }

  /// Subscribe to a class's notifications
  Future<void> subscribeToClass(String classId) async {
    await _notificationService.subscribeToTopic('class_${classId}_teacher');
  }

  /// Unsubscribe from a class's notifications
  Future<void> unsubscribeFromClass(String classId) async {
    await _notificationService.unsubscribeFromTopic('class_${classId}_teacher');
  }

  /// Schedule class reminder
  Future<void> scheduleClassReminder({
    required String classId,
    required String className,
    required DateTime time,
    String? notes,
  }) async {
    await _notificationService.scheduleNotification(
      id: 'class_reminder_$classId',
      title: 'Class Starting Soon 📚',
      body: '$className starts in 15 minutes${notes != null ? ". $notes" : ""}',
      scheduledTime: time.subtract(const Duration(minutes: 15)),
      type: 'class_reminder',
      data: {'class_id': classId, 'class_name': className},
    );
  }

  /// Schedule IEP goal check reminder
  Future<void> scheduleIepGoalReminder({
    required String studentId,
    required String studentName,
    required String goalDescription,
    required DateTime dueDate,
  }) async {
    // Schedule reminder 3 days before due
    final reminderTime = dueDate.subtract(const Duration(days: 3));
    if (reminderTime.isAfter(DateTime.now())) {
      await _notificationService.scheduleNotification(
        id: 'iep_goal_${studentId}_${dueDate.millisecondsSinceEpoch}',
        title: 'IEP Goal Check Due Soon',
        body: '$studentName: $goalDescription - Due in 3 days',
        scheduledTime: reminderTime,
        type: NotificationTypes.iepGoalDue,
        data: {
          'student_id': studentId,
          'student_name': studentName,
          'goal_description': goalDescription,
        },
      );
    }
  }

  /// Update notification preferences
  Future<void> updatePreferences(NotificationPreferences preferences) async {
    await _notificationService.updatePreferences(preferences);

    final apiClient = _ref.read(apiClientProvider);
    await apiClient.put('/users/me/notification-preferences', {
      'preferences': preferences.toJson(),
    });
  }

  /// Get current preferences
  NotificationPreferences get preferences => _notificationService.preferences;

  /// Get current FCM token
  String? get currentToken => _notificationService.currentToken;
}

// Placeholder providers
final currentUserProvider = Provider<User?>((ref) => null);
final classesProvider = FutureProvider<List<ClassInfo>>((ref) async => []);
final appRouterProvider = Provider<AppRouter>((ref) => AppRouter());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final activeSessionsProvider = Provider<void>((ref) {});
final messagesProvider = Provider<void>((ref) {});
final unreadMessageCountProvider =
    StateNotifierProvider<UnreadCountNotifier, int>((ref) => UnreadCountNotifier());
final assignmentSubmissionsProvider =
    Provider.family<void, String>((ref, id) {});
final classSessionsProvider = Provider.family<void, String>((ref, id) {});
final notificationHistoryProvider =
    StateNotifierProvider<NotificationHistoryNotifier, List<AivoNotification>>(
        (ref) => NotificationHistoryNotifier());
final alertBannerProvider =
    StateNotifierProvider<AlertBannerNotifier, AlertBanner?>(
        (ref) => AlertBannerNotifier());

// Placeholder classes
class User {
  final String id;
  final String tenantId;
  User({required this.id, required this.tenantId});
}

class ClassInfo {
  final String id;
  ClassInfo({required this.id});
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

enum AlertPriority { low, normal, high }

class AlertAction {
  final String label;
  final VoidCallback onPressed;
  const AlertAction({required this.label, required this.onPressed});
}

class AlertBanner {
  final String title;
  final String message;
  final AlertAction? action;
  final Duration duration;
  final AlertPriority priority;

  const AlertBanner({
    required this.title,
    required this.message,
    this.action,
    this.duration = const Duration(seconds: 5),
    this.priority = AlertPriority.normal,
  });
}

class AlertBannerNotifier extends StateNotifier<AlertBanner?> {
  AlertBannerNotifier() : super(null);

  void show(AlertBanner banner) {
    state = banner;
  }

  void dismiss() {
    state = null;
  }
}
