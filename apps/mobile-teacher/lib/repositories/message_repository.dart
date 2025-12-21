/// Message Repository
///
/// Offline-first data access for parent messaging.
library;

import 'package:flutter_common/flutter_common.dart';

import '../models/models.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for messaging data access.
class MessageRepository {
  MessageRepository({
    required this.api,
    required this.db,
    required this.sync,
    required this.connectivity,
  });

  final AivoApiClient api;
  final TeacherLocalDatabase db;
  final SyncService sync;
  final ConnectivityMonitor connectivity;

  /// Get all conversations.
  Future<List<Conversation>> getConversations() async {
    final cached = await db.getConversations();
    
    if (await connectivity.isOnline) {
      _refreshConversationsInBackground();
    }
    
    // Sort by last message date
    cached.sort((a, b) => (b.lastMessageAt ?? DateTime(1970))
        .compareTo(a.lastMessageAt ?? DateTime(1970)));
    
    return cached;
  }

  /// Get messages for a conversation.
  Future<List<Message>> getMessages(String conversationId) async {
    final cached = await db.getMessages(conversationId);
    
    if (await connectivity.isOnline) {
      _refreshMessagesInBackground(conversationId);
    }
    
    // Sort by date
    cached.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    
    return cached;
  }

  /// Send a message.
  Future<Message> sendMessage(SendMessageDto dto) async {
    final messageId = 'msg_${DateTime.now().millisecondsSinceEpoch}';
    final message = Message(
      id: messageId,
      conversationId: dto.conversationId,
      senderId: '', // Will be set from auth
      senderName: '', // Will be set from auth
      content: dto.content,
      createdAt: DateTime.now(),
      type: dto.type,
      status: MessageStatus.sent,
      isFromTeacher: true,
    );

    // Cache locally
    await db.cacheMessages([message]);

    // Queue for sync
    await sync.queueCreate(
      entityType: 'message',
      entityId: messageId,
      data: dto.toJson(),
    );

    return message;
  }

  /// Mark messages as read.
  Future<void> markAsRead(List<String> messageIds) async {
    for (final id in messageIds) {
      await sync.queueUpdate(
        entityType: 'message',
        entityId: id,
        data: {'status': 'read', 'readAt': DateTime.now().toIso8601String()},
      );
    }
  }

  /// Get unread count.
  Future<int> getUnreadCount() async {
    final conversations = await getConversations();
    return conversations.fold(0, (sum, c) => sum + c.unreadCount);
  }

  /// Get message templates.
  Future<List<MessageTemplate>> getTemplates() async {
    if (!await connectivity.isOnline) {
      return _defaultTemplates;
    }

    try {
      final response = await api.get('/messaging/templates');
      final data = response.data as List;
      return data
          .map((json) => MessageTemplate.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return _defaultTemplates;
    }
  }

  /// Force refresh conversations from server.
  Future<List<Conversation>> refreshConversations() async {
    if (!await connectivity.isOnline) {
      return db.getConversations();
    }

    try {
      final response = await api.get('/messaging/conversations');
      final data = response.data as List;
      final conversations = data
          .map((json) => Conversation.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheConversations(conversations);
      return conversations;
    } catch (_) {
      return db.getConversations();
    }
  }

  void _refreshConversationsInBackground() async {
    try {
      final response = await api.get('/messaging/conversations');
      final data = response.data as List;
      final conversations = data
          .map((json) => Conversation.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheConversations(conversations);
    } catch (_) {}
  }

  void _refreshMessagesInBackground(String conversationId) async {
    try {
      final response = await api.get('/messaging/conversations/$conversationId/messages');
      final data = response.data as List;
      final messages = data
          .map((json) => Message.fromJson(json as Map<String, dynamic>))
          .toList();
      
      await db.cacheMessages(messages);
    } catch (_) {}
  }

  static const _defaultTemplates = [
    MessageTemplate(
      id: 'template_1',
      name: 'Weekly Update',
      content: 'Hi! Here\'s a quick update on {{studentName}}\'s week...',
      category: 'updates',
      variables: ['studentName'],
    ),
    MessageTemplate(
      id: 'template_2',
      name: 'Great Progress',
      content: 'I wanted to share some exciting news about {{studentName}}...',
      category: 'positive',
      variables: ['studentName'],
    ),
    MessageTemplate(
      id: 'template_3',
      name: 'Upcoming Session',
      content: 'Just a reminder that {{studentName}} has a session scheduled for {{date}}.',
      category: 'reminders',
      variables: ['studentName', 'date'],
    ),
  ];
}
