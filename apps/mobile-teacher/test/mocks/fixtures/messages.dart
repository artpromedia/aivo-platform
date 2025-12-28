/// Message Test Fixtures
///
/// Test data for messages.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test messages for testing.
class TestMessages {
  /// Sample conversation.
  static final sampleConversation = Conversation(
    id: 'conv-1',
    studentId: 'student-alex',
    studentName: 'Alex Johnson',
    participantIds: ['parent-johnson', 'teacher-1'],
    participantNames: ['Sarah Johnson', 'Test Teacher'],
    lastMessage: 'Thank you for the update!',
    lastMessageAt: DateTime.now().subtract(const Duration(hours: 2)),
    unreadCount: 1,
  );

  /// Second conversation.
  static final secondConversation = Conversation(
    id: 'conv-2',
    studentId: 'student-jordan',
    studentName: 'Jordan Williams',
    participantIds: ['parent-williams', 'teacher-1'],
    participantNames: ['James Williams', 'Test Teacher'],
    lastMessage: 'See you at the conference.',
    lastMessageAt: DateTime.now().subtract(const Duration(days: 1)),
    unreadCount: 0,
  );

  /// All conversations.
  static final conversations = [
    sampleConversation,
    secondConversation,
  ];

  /// Message from parent.
  static final parentMessage = Message(
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'parent-johnson',
    senderName: 'Sarah Johnson',
    content: 'Hi, I wanted to ask about the math homework assigned yesterday.',
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    isFromTeacher: false,
    status: MessageStatus.delivered,
  );

  /// Reply from teacher.
  static final teacherReply = Message(
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'teacher-1',
    senderName: 'Test Teacher',
    content: 'Hi Sarah, Thank you for reaching out. The homework focuses on multiplication facts 6-9.',
    createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    isFromTeacher: true,
    status: MessageStatus.read,
  );

  /// Progress report message.
  static final progressReport = Message(
    id: 'msg-3',
    conversationId: 'conv-1',
    senderId: 'teacher-1',
    senderName: 'Test Teacher',
    content: 'Weekly progress report for Alex. Great improvements in reading comprehension!',
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
    isFromTeacher: true,
    type: MessageType.progressReport,
    status: MessageStatus.read,
  );

  /// All test messages.
  static final all = [
    parentMessage,
    teacherReply,
    progressReport,
  ];

  /// Unread messages.
  static final unread = all.where((m) => m.status != MessageStatus.read).toList();

  /// Unread count.
  static int get unreadCount => unread.length;

  /// Create a custom message.
  static Message create({
    String? id,
    String conversationId = 'conv-1',
    String senderId = 'teacher-1',
    String senderName = 'Test Teacher',
    String content = 'Test message content',
    bool isFromTeacher = true,
    MessageStatus status = MessageStatus.sent,
    MessageType type = MessageType.text,
  }) {
    return Message(
      id: id ?? 'msg-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
      content: content,
      createdAt: DateTime.now(),
      isFromTeacher: isFromTeacher,
      status: status,
      type: type,
    );
  }
}
