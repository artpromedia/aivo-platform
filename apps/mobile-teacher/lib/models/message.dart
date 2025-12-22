/// Message Model
///
/// Represents messages for parent communication.
library;

import 'package:flutter/foundation.dart';

/// Message status.
enum MessageStatus {
  draft,
  sent,
  delivered,
  read,
  failed,
}

/// Message type.
enum MessageType {
  text,
  progressReport,
  iepUpdate,
  behaviorNote,
  announcement,
  reminder,
}

/// A message in a conversation.
@immutable
class Message {
  const Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.createdAt,
    this.status = MessageStatus.sent,
    this.type = MessageType.text,
    this.recipientIds = const [],
    this.attachments = const [],
    this.isFromTeacher = true,
    this.readAt,
    this.metadata,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime createdAt;
  final MessageStatus status;
  final MessageType type;
  final List<String> recipientIds;
  final List<MessageAttachment> attachments;
  final bool isFromTeacher;
  final DateTime? readAt;
  final Map<String, dynamic>? metadata;

  bool get isRead => status == MessageStatus.read;
  bool get hasAttachments => attachments.isNotEmpty;

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      status: MessageStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => MessageStatus.sent,
      ),
      type: MessageType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => MessageType.text,
      ),
      recipientIds: (json['recipientIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map(
                  (e) => MessageAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      isFromTeacher: json['isFromTeacher'] as bool? ?? true,
      readAt: json['readAt'] != null
          ? DateTime.tryParse(json['readAt'] as String)
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'senderId': senderId,
      'senderName': senderName,
      'content': content,
      'createdAt': createdAt.toIso8601String(),
      'status': status.name,
      'type': type.name,
      'recipientIds': recipientIds,
      'attachments': attachments.map((e) => e.toJson()).toList(),
      'isFromTeacher': isFromTeacher,
      'readAt': readAt?.toIso8601String(),
      'metadata': metadata,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Message && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// An attachment on a message.
@immutable
class MessageAttachment {
  const MessageAttachment({
    required this.id,
    required this.name,
    required this.type,
    required this.url,
    this.size,
    this.mimeType,
  });

  final String id;
  final String name;
  final String type; // 'image', 'document', 'report'
  final String url;
  final int? size;
  final String? mimeType;

  factory MessageAttachment.fromJson(Map<String, dynamic> json) {
    return MessageAttachment(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      url: json['url'] as String,
      size: json['size'] as int?,
      mimeType: json['mimeType'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'url': url,
      'size': size,
      'mimeType': mimeType,
    };
  }
}

/// A conversation with a parent.
@immutable
class Conversation {
  const Conversation({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.participantIds,
    required this.participantNames,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.isPinned = false,
    this.isMuted = false,
  });

  final String id;
  final String studentId;
  final String studentName;
  final List<String> participantIds;
  final List<String> participantNames;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final bool isPinned;
  final bool isMuted;

  bool get hasUnread => unreadCount > 0;

  String get displayParticipants => participantNames.join(', ');

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      participantIds: (json['participantIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      participantNames: (json['participantNames'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      lastMessage: json['lastMessage'] as String?,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.tryParse(json['lastMessageAt'] as String)
          : null,
      unreadCount: json['unreadCount'] as int? ?? 0,
      isPinned: json['isPinned'] as bool? ?? false,
      isMuted: json['isMuted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'studentName': studentName,
      'participantIds': participantIds,
      'participantNames': participantNames,
      'lastMessage': lastMessage,
      'lastMessageAt': lastMessageAt?.toIso8601String(),
      'unreadCount': unreadCount,
      'isPinned': isPinned,
      'isMuted': isMuted,
    };
  }

  Conversation copyWith({
    String? id,
    String? studentId,
    String? studentName,
    List<String>? participantIds,
    List<String>? participantNames,
    String? lastMessage,
    DateTime? lastMessageAt,
    int? unreadCount,
    bool? isPinned,
    bool? isMuted,
  }) {
    return Conversation(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      studentName: studentName ?? this.studentName,
      participantIds: participantIds ?? this.participantIds,
      participantNames: participantNames ?? this.participantNames,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      unreadCount: unreadCount ?? this.unreadCount,
      isPinned: isPinned ?? this.isPinned,
      isMuted: isMuted ?? this.isMuted,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Conversation &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// DTO for sending a message.
class SendMessageDto {
  const SendMessageDto({
    required this.conversationId,
    required this.content,
    this.type = MessageType.text,
    this.attachmentIds = const [],
    this.scheduledFor,
    this.translateTo,
  });

  final String conversationId;
  final String content;
  final MessageType type;
  final List<String> attachmentIds;
  final DateTime? scheduledFor;
  final String? translateTo;

  Map<String, dynamic> toJson() {
    return {
      'conversationId': conversationId,
      'content': content,
      'type': type.name,
      'attachmentIds': attachmentIds,
      'scheduledFor': scheduledFor?.toIso8601String(),
      'translateTo': translateTo,
    };
  }
}

/// Message template for quick replies.
@immutable
class MessageTemplate {
  const MessageTemplate({
    required this.id,
    required this.name,
    required this.content,
    this.category,
    this.variables = const [],
  });

  final String id;
  final String name;
  final String content;
  final String? category;
  final List<String> variables;

  factory MessageTemplate.fromJson(Map<String, dynamic> json) {
    return MessageTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      content: json['content'] as String,
      category: json['category'] as String?,
      variables: (json['variables'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}
