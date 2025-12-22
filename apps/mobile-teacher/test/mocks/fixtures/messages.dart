/// Message Test Fixtures
///
/// Test data for messages.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test messages for testing.
class TestMessages {
  /// Message from parent.
  static final parentMessage = Message(
    id: 'msg-1',
    senderId: 'parent-johnson',
    senderName: 'Sarah Johnson',
    senderRole: 'parent',
    recipientId: 'teacher-1',
    subject: 'Question about Alex\'s homework',
    body: 'Hi, I wanted to ask about the math homework assigned yesterday. Alex seems confused about the multiplication problems.',
    isRead: false,
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
  );

  /// Reply from teacher.
  static final teacherReply = Message(
    id: 'msg-2',
    senderId: 'teacher-1',
    senderName: 'Test Teacher',
    senderRole: 'teacher',
    recipientId: 'parent-johnson',
    subject: 'Re: Question about Alex\'s homework',
    body: 'Hi Sarah, Thank you for reaching out. The homework focuses on multiplication facts 6-9. I\'ve attached some practice resources.',
    threadId: 'msg-1',
    isRead: true,
    createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
  );

  /// System notification.
  static final systemNotification = Message(
    id: 'msg-3',
    senderId: 'system',
    senderName: 'System',
    senderRole: 'system',
    recipientId: 'teacher-1',
    subject: 'IEP Goal Update Reminder',
    body: 'This is a reminder to update progress on IEP goals for Alex Johnson. The next review is scheduled for next week.',
    isRead: false,
    isSystemMessage: true,
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
    updatedAt: DateTime.now().subtract(const Duration(days: 1)),
  );

  /// Message about student concern.
  static final concernMessage = Message(
    id: 'msg-4',
    senderId: 'counselor-1',
    senderName: 'School Counselor',
    senderRole: 'staff',
    recipientId: 'teacher-1',
    subject: 'Check-in about Jordan',
    body: 'I wanted to follow up on our conversation about Jordan. How has he been doing in class this week?',
    isRead: true,
    priority: MessagePriority.high,
    createdAt: DateTime.now().subtract(const Duration(days: 2)),
    updatedAt: DateTime.now().subtract(const Duration(days: 2)),
  );

  /// Old read message.
  static final oldMessage = Message(
    id: 'msg-5',
    senderId: 'parent-williams',
    senderName: 'James Williams',
    senderRole: 'parent',
    recipientId: 'teacher-1',
    subject: 'Thank you',
    body: 'Thank you for helping Emma with her science project. She really enjoyed it!',
    isRead: true,
    createdAt: DateTime.now().subtract(const Duration(days: 7)),
    updatedAt: DateTime.now().subtract(const Duration(days: 7)),
  );

  /// All test messages.
  static final all = [
    parentMessage,
    teacherReply,
    systemNotification,
    concernMessage,
    oldMessage,
  ];

  /// Unread messages.
  static final unread = all.where((m) => !m.isRead).toList();

  /// Unread count.
  static int get unreadCount => unread.length;

  /// Messages by thread.
  static List<Message> thread(String threadId) =>
      all.where((m) => m.id == threadId || m.threadId == threadId).toList();

  /// High priority messages.
  static final highPriority =
      all.where((m) => m.priority == MessagePriority.high).toList();

  /// Create a custom message.
  static Message create({
    String? id,
    String senderId = 'sender-1',
    String senderName = 'Test Sender',
    String senderRole = 'parent',
    String recipientId = 'teacher-1',
    String subject = 'Test Subject',
    String body = 'Test message body',
    bool isRead = false,
    MessagePriority priority = MessagePriority.normal,
  }) {
    return Message(
      id: id ?? 'msg-${DateTime.now().millisecondsSinceEpoch}',
      senderId: senderId,
      senderName: senderName,
      senderRole: senderRole,
      recipientId: recipientId,
      subject: subject,
      body: body,
      isRead: isRead,
      priority: priority,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}
