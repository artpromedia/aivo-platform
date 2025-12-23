import 'aivo_notification.dart';

/// Notification channel configuration for Android
class NotificationChannel {
  final String id;
  final String name;
  final String description;
  final NotificationPriority defaultPriority;
  final bool showBadge;
  final bool playSound;
  final bool enableVibration;
  final bool enableLights;
  final String? soundFile;
  final int? lightColor;

  const NotificationChannel({
    required this.id,
    required this.name,
    required this.description,
    this.defaultPriority = NotificationPriority.normal,
    this.showBadge = true,
    this.playSound = true,
    this.enableVibration = true,
    this.enableLights = true,
    this.soundFile,
    this.lightColor,
  });
}

/// Predefined notification channels for Aivo apps
abstract class AivoNotificationChannels {
  static const sessionUpdates = NotificationChannel(
    id: 'session_updates',
    name: 'Session Updates',
    description: 'Notifications about learning sessions',
    defaultPriority: NotificationPriority.high,
  );

  static const achievements = NotificationChannel(
    id: 'achievements',
    name: 'Achievements',
    description: 'Achievement and progress notifications',
    defaultPriority: NotificationPriority.normal,
    soundFile: 'achievement_sound',
    lightColor: 0xFFFFD700, // Gold
  );

  static const messages = NotificationChannel(
    id: 'messages',
    name: 'Messages',
    description: 'Messages from teachers and parents',
    defaultPriority: NotificationPriority.high,
  );

  static const reminders = NotificationChannel(
    id: 'reminders',
    name: 'Reminders',
    description: 'Session and activity reminders',
    defaultPriority: NotificationPriority.normal,
  );

  static const alerts = NotificationChannel(
    id: 'alerts',
    name: 'Alerts',
    description: 'Important alerts requiring attention',
    defaultPriority: NotificationPriority.high,
    enableVibration: true,
    lightColor: 0xFFFF0000, // Red
  );

  static const billing = NotificationChannel(
    id: 'billing',
    name: 'Billing',
    description: 'Payment and subscription notifications',
    defaultPriority: NotificationPriority.normal,
  );

  static const encouragement = NotificationChannel(
    id: 'encouragement',
    name: 'Encouragement',
    description: 'Positive learning encouragement',
    defaultPriority: NotificationPriority.low,
    enableVibration: false,
  );

  static List<NotificationChannel> get all => [
        sessionUpdates,
        achievements,
        messages,
        reminders,
        alerts,
        billing,
        encouragement,
      ];

  /// Get channel for a notification type
  static NotificationChannel getChannelForType(String type) {
    switch (type) {
      case 'session_started':
      case 'session_completed':
      case 'session_summary':
        return sessionUpdates;

      case 'achievement_unlocked':
      case 'streak_milestone':
      case 'level_up':
        return achievements;

      case 'teacher_message':
      case 'parent_message':
        return messages;

      case 'session_reminder':
      case 'streak_reminder':
      case 'assignment_due':
        return reminders;

      case 'student_struggling':
      case 'iep_update':
      case 'iep_goal_due':
        return alerts;

      case 'payment_success':
      case 'payment_failed':
      case 'subscription_expiring':
        return billing;

      case 'encouragement':
        return encouragement;

      default:
        return sessionUpdates;
    }
  }
}
