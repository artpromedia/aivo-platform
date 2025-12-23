import 'package:firebase_messaging/firebase_messaging.dart';

/// Priority levels for notifications
enum NotificationPriority { low, normal, high }

/// Notification payload from server
class AivoNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> data;
  final DateTime receivedAt;
  final NotificationPriority priority;
  final String? imageUrl;
  final String? actionUrl;
  final String? sound;
  final bool isRead;

  const AivoNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.data,
    required this.receivedAt,
    this.priority = NotificationPriority.normal,
    this.imageUrl,
    this.actionUrl,
    this.sound,
    this.isRead = false,
  });

  factory AivoNotification.fromRemoteMessage(RemoteMessage message) {
    return AivoNotification(
      id: message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
      type: message.data['type'] ?? 'general',
      title: message.notification?.title ?? message.data['title'] ?? '',
      body: message.notification?.body ?? message.data['body'] ?? '',
      data: message.data,
      receivedAt: DateTime.now(),
      priority: _parsePriority(message.data['priority']),
      imageUrl: message.notification?.android?.imageUrl ??
          message.notification?.apple?.imageUrl,
      actionUrl: message.data['action_url'],
      sound: message.data['sound'],
    );
  }

  factory AivoNotification.fromJson(Map<String, dynamic> json) {
    return AivoNotification(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      data: Map<String, dynamic>.from(json['data'] ?? {}),
      receivedAt: DateTime.parse(json['receivedAt'] as String),
      priority: _parsePriority(json['priority']),
      imageUrl: json['imageUrl'] as String?,
      actionUrl: json['actionUrl'] as String?,
      sound: json['sound'] as String?,
      isRead: json['isRead'] as bool? ?? false,
    );
  }

  static NotificationPriority _parsePriority(String? priority) {
    switch (priority) {
      case 'high':
        return NotificationPriority.high;
      case 'low':
        return NotificationPriority.low;
      default:
        return NotificationPriority.normal;
    }
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'title': title,
        'body': body,
        'data': data,
        'receivedAt': receivedAt.toIso8601String(),
        'priority': priority.name,
        'imageUrl': imageUrl,
        'actionUrl': actionUrl,
        'sound': sound,
        'isRead': isRead,
      };

  AivoNotification copyWith({
    String? id,
    String? type,
    String? title,
    String? body,
    Map<String, dynamic>? data,
    DateTime? receivedAt,
    NotificationPriority? priority,
    String? imageUrl,
    String? actionUrl,
    String? sound,
    bool? isRead,
  }) {
    return AivoNotification(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      body: body ?? this.body,
      data: data ?? this.data,
      receivedAt: receivedAt ?? this.receivedAt,
      priority: priority ?? this.priority,
      imageUrl: imageUrl ?? this.imageUrl,
      actionUrl: actionUrl ?? this.actionUrl,
      sound: sound ?? this.sound,
      isRead: isRead ?? this.isRead,
    );
  }

  @override
  String toString() =>
      'AivoNotification(id: $id, type: $type, title: $title)';
}

/// Notification types used across the platform
abstract class NotificationTypes {
  // Session notifications
  static const sessionStarted = 'session_started';
  static const sessionCompleted = 'session_completed';
  static const sessionSummary = 'session_summary';
  static const sessionReminder = 'session_reminder';

  // Achievement notifications
  static const achievementUnlocked = 'achievement_unlocked';
  static const streakMilestone = 'streak_milestone';
  static const streakReminder = 'streak_reminder';
  static const levelUp = 'level_up';

  // Message notifications
  static const teacherMessage = 'teacher_message';
  static const parentMessage = 'parent_message';

  // Alert notifications
  static const studentStruggling = 'student_struggling';
  static const iepUpdate = 'iep_update';
  static const iepGoalDue = 'iep_goal_due';

  // Billing notifications
  static const paymentSuccess = 'payment_success';
  static const paymentFailed = 'payment_failed';
  static const subscriptionExpiring = 'subscription_expiring';

  // Assignment notifications
  static const assignmentSubmitted = 'assignment_submitted';
  static const assignmentDue = 'assignment_due';
  static const assignmentGraded = 'assignment_graded';

  // Progress notifications
  static const progressMilestone = 'progress_milestone';

  // Encouragement (learner only, COPPA compliant)
  static const encouragement = 'encouragement';
}
