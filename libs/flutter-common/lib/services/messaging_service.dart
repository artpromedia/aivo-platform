/// Messaging API Service
///
/// Provides access to parent-teacher messaging functionality.
library;

import 'package:dio/dio.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';

/// A conversation thread between users
class Conversation {
  final String id;
  final String title;
  final List<ConversationParticipant> participants;
  final Message? lastMessage;
  final int unreadCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Conversation({
    required this.id,
    required this.title,
    required this.participants,
    this.lastMessage,
    required this.unreadCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      title: json['title'] as String,
      participants: (json['participants'] as List)
          .map((e) =>
              ConversationParticipant.fromJson(e as Map<String, dynamic>))
          .toList(),
      lastMessage: json['lastMessage'] != null
          ? Message.fromJson(json['lastMessage'] as Map<String, dynamic>)
          : null,
      unreadCount: json['unreadCount'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'participants': participants.map((e) => e.toJson()).toList(),
        'lastMessage': lastMessage?.toJson(),
        'unreadCount': unreadCount,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

/// A participant in a conversation
class ConversationParticipant {
  final String userId;
  final String name;
  final String role;
  final String? avatarUrl;
  final bool isOnline;

  const ConversationParticipant({
    required this.userId,
    required this.name,
    required this.role,
    this.avatarUrl,
    required this.isOnline,
  });

  factory ConversationParticipant.fromJson(Map<String, dynamic> json) {
    return ConversationParticipant(
      userId: json['userId'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'name': name,
        'role': role,
        'avatarUrl': avatarUrl,
        'isOnline': isOnline,
      };
}

/// A message in a conversation
class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final MessageType type;
  final List<Attachment>? attachments;
  final bool isRead;
  final DateTime createdAt;
  final DateTime? editedAt;

  const Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.type,
    this.attachments,
    required this.isRead,
    required this.createdAt,
    this.editedAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String,
      content: json['content'] as String,
      type: MessageType.fromString(json['type'] as String),
      attachments: json['attachments'] != null
          ? (json['attachments'] as List)
              .map((e) => Attachment.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      isRead: json['isRead'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      editedAt: json['editedAt'] != null
          ? DateTime.parse(json['editedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'conversationId': conversationId,
        'senderId': senderId,
        'senderName': senderName,
        'content': content,
        'type': type.value,
        'attachments': attachments?.map((e) => e.toJson()).toList(),
        'isRead': isRead,
        'createdAt': createdAt.toIso8601String(),
        'editedAt': editedAt?.toIso8601String(),
      };
}

/// Type of message
enum MessageType {
  text('text'),
  image('image'),
  file('file'),
  progressReport('progress_report'),
  system('system');

  final String value;
  const MessageType(this.value);

  static MessageType fromString(String value) {
    return MessageType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => MessageType.text,
    );
  }
}

/// An attachment to a message
class Attachment {
  final String id;
  final String name;
  final String url;
  final String mimeType;
  final int size;

  const Attachment({
    required this.id,
    required this.name,
    required this.url,
    required this.mimeType,
    required this.size,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'] as String,
      name: json['name'] as String,
      url: json['url'] as String,
      mimeType: json['mimeType'] as String,
      size: json['size'] as int,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'url': url,
        'mimeType': mimeType,
        'size': size,
      };
}

/// Messaging API Service
class MessagingService {
  final Dio _dio;

  MessagingService({Dio? dio}) : _dio = dio ?? AivoApiClient.instance.dio;

  /// Get all conversations for current user
  Future<List<Conversation>> getConversations({
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.messagingConversations,
      queryParameters: {'limit': limit, 'offset': offset},
    );
    final data = response.data!['conversations'] as List;
    return data
        .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get a specific conversation
  Future<Conversation> getConversation(String conversationId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '${ApiEndpoints.messagingConversations}/$conversationId',
    );
    return Conversation.fromJson(response.data!);
  }

  /// Create a new conversation
  Future<Conversation> createConversation({
    required String title,
    required List<String> participantIds,
    String? initialMessage,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.messagingConversations,
      data: {
        'title': title,
        'participantIds': participantIds,
        if (initialMessage != null) 'initialMessage': initialMessage,
      },
    );
    return Conversation.fromJson(response.data!);
  }

  /// Get messages in a conversation
  Future<List<Message>> getMessages(
    String conversationId, {
    int limit = 50,
    String? before,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.messagingMessages
          .replaceAll('{conversationId}', conversationId),
      queryParameters: {
        'limit': limit,
        if (before != null) 'before': before,
      },
    );
    final data = response.data!['messages'] as List;
    return data
        .map((e) => Message.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Send a message
  Future<Message> sendMessage(
    String conversationId, {
    required String content,
    MessageType type = MessageType.text,
    List<String>? attachmentIds,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.messagingMessages
          .replaceAll('{conversationId}', conversationId),
      data: {
        'content': content,
        'type': type.value,
        if (attachmentIds != null) 'attachmentIds': attachmentIds,
      },
    );
    return Message.fromJson(response.data!);
  }

  /// Mark messages as read
  Future<void> markAsRead(String conversationId, {String? upToMessageId}) async {
    await _dio.post<void>(
      '${ApiEndpoints.messagingConversations}/$conversationId/read',
      data: {
        if (upToMessageId != null) 'upToMessageId': upToMessageId,
      },
    );
  }

  /// Get unread message count
  Future<int> getUnreadCount() async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.messagingUnreadCount,
    );
    return response.data!['count'] as int;
  }

  /// Upload an attachment
  Future<Attachment> uploadAttachment(
    String filePath,
    String fileName,
  ) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    final response = await _dio.post<Map<String, dynamic>>(
      ApiEndpoints.messagingAttachments,
      data: formData,
    );
    return Attachment.fromJson(response.data!);
  }
}
