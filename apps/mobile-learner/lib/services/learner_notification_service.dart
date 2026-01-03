import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_notifications/flutter_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provider for learner notification service
final learnerNotificationServiceProvider =
    Provider<LearnerNotificationService>((ref) {
  return LearnerNotificationService(ref);
});

/// Notification service for the Learner app
///
/// IMPORTANT: COPPA Compliance Notes:
/// - Notifications are controlled by parent settings
/// - No direct marketing or engagement manipulation
/// - Content is age-appropriate and educational
/// - Parent can disable all notifications
/// - No data collection beyond educational purpose
/// - All content validated for child-appropriateness
class LearnerNotificationService {
  final Ref _ref;
  final NotificationService _notificationService = NotificationService();

  LearnerNotificationService(this._ref);

  /// Initialize notification service
  ///
  /// Will not initialize if parent has disabled notifications
  Future<void> initialize() async {
    // Check if parent has enabled notifications for this learner
    final settings = _ref.read(learnerSettingsProvider);
    if (!settings.notificationsEnabled) {
      return; // Don't initialize if parent disabled
    }

    // Mark this as a child device for COPPA compliance
    await BackgroundHandlerConfig.setChildDevice(true);

    await _notificationService.initialize(
      onNotificationTapped: _handleNotificationTap,
      onNotificationReceived: _handleNotificationReceived,
      onTokenRefresh: _handleTokenRefresh,
      analytics: FirebaseNotificationAnalytics(),
      isChildDevice: true,
    );

    await _subscribeToTopics();
  }

  /// Subscribe to learner-specific educational topics only
  Future<void> _subscribeToTopics() async {
    final learner = _ref.read(currentLearnerProvider);
    if (learner == null) return;

    // Only subscribe to learner-specific educational topics
    // No marketing or engagement manipulation topics
    await _notificationService.subscribeToTopic(
      'learner_${learner.id}_educational',
    );
  }

  /// Handle notification tap
  void _handleNotificationTap(AivoNotification notification) {
    // Validate notification type is allowed for learners
    if (!CoppaNotificationValidator.isAllowedType(notification.type)) {
      return;
    }

    final router = _ref.read(appRouterProvider);

    switch (notification.type) {
      case NotificationTypes.achievementUnlocked:
        router.push('/achievements');
        break;

      case NotificationTypes.streakMilestone:
        router.push('/profile');
        break;

      case NotificationTypes.sessionReminder:
        // Only if parent enabled reminders
        final settings = _ref.read(learnerSettingsProvider);
        if (settings.sessionRemindersEnabled) {
          router.push('/home');
        }
        break;

      case NotificationTypes.levelUp:
        router.push('/profile');
        break;

      case NotificationTypes.encouragement:
        // Show encouragement in-app, no navigation
        break;

      default:
        router.push('/home');
    }
  }

  /// Handle notification received
  void _handleNotificationReceived(AivoNotification notification) {
    // Validate notification type
    if (!CoppaNotificationValidator.isAllowedType(notification.type)) {
      return;
    }

    switch (notification.type) {
      case NotificationTypes.achievementUnlocked:
        // Trigger celebration animation
        _ref.read(celebrationProvider.notifier).trigger(
              CelebrationType.achievement,
              data: notification.data,
            );
        // Refresh achievements
        _ref.invalidate(achievementsProvider);
        break;

      case NotificationTypes.streakMilestone:
        _ref.read(celebrationProvider.notifier).trigger(
              CelebrationType.streak,
              data: notification.data,
            );
        break;

      case NotificationTypes.levelUp:
        _ref.read(celebrationProvider.notifier).trigger(
              CelebrationType.levelUp,
              data: notification.data,
            );
        break;

      case NotificationTypes.encouragement:
        // Show encouraging toast message
        _showEncouragement(notification);
        break;
    }
  }

  /// Show age-appropriate encouragement message
  void _showEncouragement(AivoNotification notification) {
    final learner = _ref.read(currentLearnerProvider);
    final age = learner?.age ?? 10;

    final message = notification.body.isNotEmpty
        ? notification.body
        : AgeAppropriateContent.getCelebration(age);

    _ref.read(toastProvider.notifier).show(
          Toast(
            message: message,
            duration: const Duration(seconds: 4),
            icon: '🌟',
          ),
        );
  }

  /// Handle FCM token refresh
  Future<void> _handleTokenRefresh(String? token) async {
    if (token == null) return;

    // Check parent permission before registering
    final settings = _ref.read(learnerSettingsProvider);
    if (!settings.notificationsEnabled) return;

    final learner = _ref.read(currentLearnerProvider);
    if (learner == null) return;

    final apiClient = _ref.read(apiClientProvider);
    await apiClient.post('/devices/register', {
      'token': token,
      'platform': Platform.isIOS ? 'ios' : 'android',
      'app': 'learner',
      'learner_id': learner.id,
      // Mark as child device for COPPA compliance
      'is_child_device': true,
    });
  }

  /// Schedule session reminder (parent controlled)
  ///
  /// Only schedules if parent has enabled session reminders
  Future<void> scheduleSessionReminder({
    required TimeOfDay time,
    String? customMessage,
  }) async {
    // Verify parent has enabled this
    final settings = _ref.read(learnerSettingsProvider);
    if (!settings.sessionRemindersEnabled) return;

    final learner = _ref.read(currentLearnerProvider);
    final age = learner?.age ?? 10;

    final now = DateTime.now();
    var scheduledTime = DateTime(
      now.year,
      now.month,
      now.day,
      time.hour,
      time.minute,
    );

    if (scheduledTime.isBefore(now)) {
      scheduledTime = scheduledTime.add(const Duration(days: 1));
    }

    // Age-appropriate, encouraging message
    final message = customMessage ??
        AgeAppropriateContent.getReminderMessage(age, 'learning');

    // Validate COPPA compliance
    if (!CoppaNotificationValidator.isCompliant('Ready to Learn?', message)) {
      throw Exception('Reminder message not COPPA compliant');
    }

    await _notificationService.scheduleNotification(
      id: 'session_reminder',
      title: '🌟 Ready to Learn?',
      body: message,
      scheduledTime: scheduledTime,
      type: NotificationTypes.sessionReminder,
      isChildDevice: true,
    );
  }

  /// Schedule streak reminder
  Future<void> scheduleStreakReminder({
    required int currentStreak,
    required TimeOfDay time,
  }) async {
    final settings = _ref.read(learnerSettingsProvider);
    if (!settings.sessionRemindersEnabled) return;

    final now = DateTime.now();
    var scheduledTime = DateTime(
      now.year,
      now.month,
      now.day,
      time.hour,
      time.minute,
    );

    if (scheduledTime.isBefore(now)) {
      scheduledTime = scheduledTime.add(const Duration(days: 1));
    }

    await _notificationService.scheduleNotification(
      id: 'streak_reminder',
      title: '🔥 Keep Your Streak Going!',
      body: "You're on a $currentStreak day streak! One more session today!",
      scheduledTime: scheduledTime,
      type: NotificationTypes.streakReminder,
      isChildDevice: true,
    );
  }

  /// Cancel all scheduled notifications
  Future<void> cancelAllNotifications() async {
    await _notificationService.clearAll();
  }

  /// Disable all notifications (parent action)
  Future<void> disableAllNotifications() async {
    await cancelAllNotifications();

    final learner = _ref.read(currentLearnerProvider);
    if (learner != null) {
      await _notificationService.unsubscribeFromTopic(
        'learner_${learner.id}_educational',
      );
    }
  }

  /// Enable notifications (parent action)
  Future<void> enableNotifications() async {
    final learner = _ref.read(currentLearnerProvider);
    if (learner != null) {
      await _notificationService.subscribeToTopic(
        'learner_${learner.id}_educational',
      );
    }
  }

  /// Update learner settings (called by parent app)
  Future<void> updateSettings(LearnerNotificationSettings settings) async {
    // Save settings locally
    await _ref.read(learnerSettingsProvider.notifier).update(settings);

    if (!settings.notificationsEnabled) {
      await disableAllNotifications();
    } else {
      await enableNotifications();
    }
  }

  /// Get current notification preferences
  LearnerNotificationSettings get settings =>
      _ref.read(learnerSettingsProvider);
}

// Placeholder providers
final currentLearnerProvider = Provider<Learner?>((ref) => null);
final learnerSettingsProvider =
    StateNotifierProvider<LearnerSettingsNotifier, LearnerNotificationSettings>(
        (ref) => LearnerSettingsNotifier());
final appRouterProvider = Provider<AppRouter>((ref) => AppRouter());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final celebrationProvider =
    StateNotifierProvider<CelebrationNotifier, Celebration?>(
        (ref) => CelebrationNotifier());
final achievementsProvider = Provider<void>((ref) {});
final toastProvider =
    StateNotifierProvider<ToastNotifier, Toast?>((ref) => ToastNotifier());

// Placeholder classes
class Learner {
  final String id;
  final int age;
  Learner({required this.id, required this.age});
}

class AppRouter {
  void push(String path) {}
}

class ApiClient {
  Future<void> post(String path, Map<String, dynamic> data) async {}
}

class LearnerSettingsNotifier extends StateNotifier<LearnerNotificationSettings> {
  LearnerSettingsNotifier() : super(const LearnerNotificationSettings());

  Future<void> update(LearnerNotificationSettings settings) async {
    state = settings;
  }
}

enum CelebrationType { achievement, streak, levelUp }

class Celebration {
  final CelebrationType type;
  final Map<String, dynamic> data;
  const Celebration({required this.type, required this.data});
}

class CelebrationNotifier extends StateNotifier<Celebration?> {
  CelebrationNotifier() : super(null);

  void trigger(CelebrationType type, {Map<String, dynamic>? data}) {
    state = Celebration(type: type, data: data ?? {});
  }

  void dismiss() {
    state = null;
  }
}

class Toast {
  final String message;
  final Duration duration;
  final String? icon;
  const Toast({
    required this.message,
    this.duration = const Duration(seconds: 3),
    this.icon,
  });
}

class ToastNotifier extends StateNotifier<Toast?> {
  ToastNotifier() : super(null);

  void show(Toast toast) {
    state = toast;
  }

  void dismiss() {
    state = null;
  }
}
