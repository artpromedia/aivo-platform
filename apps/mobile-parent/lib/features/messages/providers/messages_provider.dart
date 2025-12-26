import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/api_client.dart';
import '../../dashboard/widgets/child_selector.dart';

part 'messages_provider.g.dart';

// Conversation model
class Conversation {
  final String id;
  final String teacherId;
  final String teacherName;
  final String studentId;
  final String studentName;
  final String subject;
  final String lastMessage;
  final DateTime lastMessageAt;
  final int unreadCount;

  Conversation({
    required this.id,
    required this.teacherId,
    required this.teacherName,
    required this.studentId,
    required this.studentName,
    required this.subject,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.unreadCount,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      teacherId: json['teacherId'] as String,
      teacherName: json['teacherName'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      subject: json['subject'] as String,
      lastMessage: json['lastMessage'] as String,
      lastMessageAt: DateTime.parse(json['lastMessageAt'] as String),
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }
}

// Message model
class Message {
  final String id;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime sentAt;
  final bool isRead;

  Message({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.sentAt,
    required this.isRead,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String,
      content: json['content'] as String,
      sentAt: DateTime.parse(json['sentAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
    );
  }
}

// Conversation detail with messages
class ConversationDetail extends Conversation {
  final List<Message> messages;

  ConversationDetail({
    required super.id,
    required super.teacherId,
    required super.teacherName,
    required super.studentId,
    required super.studentName,
    required super.subject,
    required super.lastMessage,
    required super.lastMessageAt,
    required super.unreadCount,
    required this.messages,
  });

  factory ConversationDetail.fromJson(Map<String, dynamic> json) {
    return ConversationDetail(
      id: json['id'] as String,
      teacherId: json['teacherId'] as String,
      teacherName: json['teacherName'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      subject: json['subject'] as String,
      lastMessage: json['lastMessage'] as String,
      lastMessageAt: DateTime.parse(json['lastMessageAt'] as String),
      unreadCount: json['unreadCount'] as int? ?? 0,
      messages: (json['messages'] as List<dynamic>?)
              ?.map((m) => Message.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

// Teacher model
class Teacher {
  final String id;
  final String name;
  final String? email;
  final String? subject;

  Teacher({
    required this.id,
    required this.name,
    this.email,
    this.subject,
  });

  factory Teacher.fromJson(Map<String, dynamic> json) {
    return Teacher(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      subject: json['subject'] as String?,
    );
  }
}

// Provider for conversations list
@riverpod
Future<List<Conversation>> conversations(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/conversations');
  final data = response.data as List<dynamic>;
  return data.map((c) => Conversation.fromJson(c as Map<String, dynamic>)).toList();
}

// Provider for conversation detail
@riverpod
Future<ConversationDetail> conversationDetail(Ref ref, String conversationId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/conversations/$conversationId');
  return ConversationDetail.fromJson(response.data as Map<String, dynamic>);
}

// Provider for available teachers
@riverpod
Future<List<Teacher>> availableTeachers(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/teachers');
  final data = response.data as List<dynamic>;
  return data.map((t) => Teacher.fromJson(t as Map<String, dynamic>)).toList();
}

// Provider for parent's children
@riverpod
Future<List<ChildInfo>> parentChildren(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/students');
  final data = response.data as List<dynamic>;
  return data
      .map((s) => ChildInfo(
            id: s['id'] as String,
            name: '${s['firstName']} ${s['lastName']}',
            grade: s['grade']?.toString(),
            avatarUrl: s['avatarUrl'] as String?,
          ))
      .toList();
}

// Provider for sending a new message
@riverpod
Future<void> sendMessage(
  Ref ref, {
  required String teacherId,
  required String studentId,
  required String subject,
  required String message,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/conversations', data: {
    'teacherId': teacherId,
    'studentId': studentId,
    'subject': subject,
    'message': message,
  });
}

// Provider for sending a reply
@riverpod
Future<void> sendReply(
  Ref ref, {
  required String conversationId,
  required String message,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/conversations/$conversationId/messages', data: {
    'content': message,
  });
}
