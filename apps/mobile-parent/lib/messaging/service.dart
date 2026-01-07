/// Messaging Service
///
/// API client for messaging operations including contextual threads.

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../auth/token_storage.dart';
import 'models.dart';

const _baseUrl = String.fromEnvironment(
  'MESSAGING_API_URL',
  defaultValue: 'https://api.aivo.app',
);
const _useMock = bool.fromEnvironment('USE_MESSAGING_MOCK', defaultValue: false);

/// Service for messaging operations
class MessagingService {
  // Singleton instance
  static final MessagingService _instance = MessagingService._internal();
  factory MessagingService() => _instance;
  MessagingService._internal()
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
        )),
        _tokenStorage = TokenStorage() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final tokens = await _tokenStorage.readTokens();
        if (tokens != null) {
          options.headers['Authorization'] = 'Bearer ${tokens.$1}';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        debugPrint('[MessagingService] API error: ${error.message}');
        return handler.next(error);
      },
    ));
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS / THREADS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all conversations for the current user
  Future<List<Conversation>> getConversations({
    ContextType? contextType,
    int page = 1,
    int pageSize = 20,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 600));
      return _mockConversations;
    }

    try {
      final params = <String, dynamic>{
        'page': page,
        'pageSize': pageSize,
      };
      if (contextType != null) {
        params['contextType'] = contextType.name;
      }

      final response = await _dio.get('/api/v1/messaging/conversations', queryParameters: params);
      final data = response.data as Map<String, dynamic>;
      final conversations = (data['conversations'] as List<dynamic>)
          .map((c) => Conversation.fromJson(c as Map<String, dynamic>))
          .toList();
      return conversations;
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to fetch conversations: ${e.message}');
      throw MessagingException('Failed to load conversations');
    }
  }

  /// Get conversations for a specific learner
  Future<List<Conversation>> getConversationsForLearner(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockConversations
          .where((c) => c.context?.learnerId == learnerId)
          .toList();
    }

    try {
      final response = await _dio.get(
        '/api/v1/messaging/conversations',
        queryParameters: {'learnerId': learnerId},
      );
      final data = response.data as Map<String, dynamic>;
      return (data['conversations'] as List<dynamic>)
          .map((c) => Conversation.fromJson(c as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to fetch learner conversations: ${e.message}');
      throw MessagingException('Failed to load learner conversations');
    }
  }

  /// Find or create a care team thread for a learner
  Future<Conversation> findOrCreateLearnerThread({
    required String learnerId,
    required String learnerName,
    required List<String> participantIds,
    String? name,
    String? description,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      final existing = _mockConversations.firstWhere(
        (c) => c.context?.type == ContextType.learner && c.context?.learnerId == learnerId,
        orElse: () => Conversation(
          id: 'new-${DateTime.now().millisecondsSinceEpoch}',
          name: name ?? "$learnerName's Care Team",
          description: description,
          type: ConversationType.thread,
          context: ThreadContext.learner(
            learnerId: learnerId,
            learnerName: learnerName,
          ),
          participants: [],
          createdAt: DateTime.now(),
        ),
      );
      return existing;
    }

    try {
      final response = await _dio.post('/api/v1/messaging/threads/learner', data: {
        'learnerId': learnerId,
        'learnerName': learnerName,
        'participantIds': participantIds,
        if (name != null) 'name': name,
        if (description != null) 'description': description,
      });
      return Conversation.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to create learner thread: ${e.message}');
      throw MessagingException('Failed to create learner thread');
    }
  }

  /// Find or create a thread for an action plan
  Future<Conversation> findOrCreateActionPlanThread({
    required String actionPlanId,
    required String actionPlanTitle,
    required String learnerId,
    String? learnerName,
    required List<String> participantIds,
    String? name,
    String? description,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return Conversation(
        id: 'thread-ap-${DateTime.now().millisecondsSinceEpoch}',
        name: name ?? actionPlanTitle,
        description: description,
        type: ConversationType.thread,
        context: ThreadContext.actionPlan(
          actionPlanId: actionPlanId,
          actionPlanTitle: actionPlanTitle,
          learnerId: learnerId,
          learnerName: learnerName,
        ),
        participants: [],
        createdAt: DateTime.now(),
      );
    }

    try {
      final response = await _dio.post('/api/v1/messaging/threads/action-plan', data: {
        'actionPlanId': actionPlanId,
        'actionPlanTitle': actionPlanTitle,
        'learnerId': learnerId,
        if (learnerName != null) 'learnerName': learnerName,
        'participantIds': participantIds,
        if (name != null) 'name': name,
        if (description != null) 'description': description,
      });
      return Conversation.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to create action plan thread: ${e.message}');
      throw MessagingException('Failed to create action plan thread');
    }
  }

  /// Find or create a thread for a meeting
  Future<Conversation> findOrCreateMeetingThread({
    required String meetingId,
    required String meetingTitle,
    required String learnerId,
    String? learnerName,
    required List<String> participantIds,
    String? name,
    String? description,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return Conversation(
        id: 'thread-meeting-${DateTime.now().millisecondsSinceEpoch}',
        name: name ?? meetingTitle,
        description: description,
        type: ConversationType.thread,
        context: ThreadContext.meeting(
          meetingId: meetingId,
          meetingTitle: meetingTitle,
          learnerId: learnerId,
          learnerName: learnerName,
        ),
        participants: [],
        createdAt: DateTime.now(),
      );
    }

    try {
      final response = await _dio.post('/api/v1/messaging/threads/meeting', data: {
        'meetingId': meetingId,
        'meetingTitle': meetingTitle,
        'learnerId': learnerId,
        if (learnerName != null) 'learnerName': learnerName,
        'participantIds': participantIds,
        if (name != null) 'name': name,
        if (description != null) 'description': description,
      });
      return Conversation.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to create meeting thread: ${e.message}');
      throw MessagingException('Failed to create meeting thread');
    }
  }

  /// Get a conversation by ID
  Future<Conversation?> getConversation(String id) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockConversations.firstWhere(
        (c) => c.id == id,
        orElse: () => _mockConversations.first,
      );
    }

    try {
      final response = await _dio.get('/api/v1/messaging/conversations/$id');
      return Conversation.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      debugPrint('[MessagingService] Failed to fetch conversation: ${e.message}');
      throw MessagingException('Failed to load conversation');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get messages for a conversation
  Future<List<Message>> getMessages(
    String conversationId, {
    int page = 1,
    int pageSize = 50,
    String? beforeId,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockMessages.where((m) => m.conversationId == conversationId).toList();
    }

    try {
      final params = <String, dynamic>{
        'page': page,
        'pageSize': pageSize,
      };
      if (beforeId != null) {
        params['beforeId'] = beforeId;
      }

      final response = await _dio.get(
        '/api/v1/messaging/conversations/$conversationId/messages',
        queryParameters: params,
      );
      final data = response.data as Map<String, dynamic>;
      return (data['messages'] as List<dynamic>)
          .map((m) => Message.fromJson(m as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to fetch messages: ${e.message}');
      throw MessagingException('Failed to load messages');
    }
  }

  /// Send a message
  Future<Message> sendMessage({
    required String conversationId,
    required String content,
    MessageType type = MessageType.text,
    String? replyToId,
    Map<String, dynamic>? metadata,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return Message(
        id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        conversationId: conversationId,
        senderId: 'current-user',
        senderName: 'You',
        type: type,
        content: content,
        replyToId: replyToId,
        metadata: metadata,
        createdAt: DateTime.now(),
      );
    }

    try {
      final response = await _dio.post(
        '/api/v1/messaging/conversations/$conversationId/messages',
        data: {
          'content': content,
          'type': type.name.toUpperCase(),
          if (replyToId != null) 'replyToId': replyToId,
          if (metadata != null) 'metadata': metadata,
        },
      );
      return Message.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to send message: ${e.message}');
      throw MessagingException('Failed to send message');
    }
  }

  /// Edit a message
  Future<Message> editMessage({
    required String messageId,
    required String content,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      final original = _mockMessages.firstWhere((m) => m.id == messageId);
      return Message(
        id: original.id,
        conversationId: original.conversationId,
        senderId: original.senderId,
        senderName: original.senderName,
        type: original.type,
        content: content,
        createdAt: original.createdAt,
        editedAt: DateTime.now(),
      );
    }

    try {
      final response = await _dio.patch(
        '/api/v1/messaging/messages/$messageId',
        data: {'content': content},
      );
      return Message.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to edit message: ${e.message}');
      throw MessagingException('Failed to edit message');
    }
  }

  /// Delete a message
  Future<void> deleteMessage(String messageId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    try {
      await _dio.delete('/api/v1/messaging/messages/$messageId');
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to delete message: ${e.message}');
      throw MessagingException('Failed to delete message');
    }
  }

  /// Mark messages as read
  Future<void> markMessagesAsRead(String conversationId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    try {
      await _dio.post('/api/v1/messaging/conversations/$conversationId/read');
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to mark as read: ${e.message}');
      // Don't throw for read receipts - not critical
    }
  }

  /// Add reaction to a message
  Future<void> addReaction({
    required String messageId,
    required String emoji,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    try {
      await _dio.post(
        '/api/v1/messaging/messages/$messageId/reactions',
        data: {'emoji': emoji},
      );
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to add reaction: ${e.message}');
      throw MessagingException('Failed to add reaction');
    }
  }

  /// Remove reaction from a message
  Future<void> removeReaction({
    required String messageId,
    required String emoji,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    try {
      await _dio.delete(
        '/api/v1/messaging/messages/$messageId/reactions',
        data: {'emoji': emoji},
      );
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to remove reaction: ${e.message}');
      throw MessagingException('Failed to remove reaction');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARIES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get thread summary for a learner
  Future<LearnerThreadSummary> getLearnerThreadSummary(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return LearnerThreadSummary(
        learnerId: learnerId,
        learnerName: 'Learner',
        totalThreads: 4,
        unreadCount: 2,
        byType: const [
          ThreadTypeSummary(type: ContextType.learner, count: 1, unreadCount: 1),
          ThreadTypeSummary(type: ContextType.actionPlan, count: 2, unreadCount: 1),
          ThreadTypeSummary(type: ContextType.meeting, count: 1, unreadCount: 0),
        ],
      );
    }

    try {
      final response = await _dio.get('/api/v1/messaging/learners/$learnerId/summary');
      return LearnerThreadSummary.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to fetch learner summary: ${e.message}');
      throw MessagingException('Failed to load learner summary');
    }
  }

  /// Get total unread count across all conversations
  Future<int> getTotalUnreadCount() async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return 5;
    }

    try {
      final response = await _dio.get('/api/v1/messaging/unread-count');
      final data = response.data as Map<String, dynamic>;
      return data['count'] as int;
    } on DioException catch (e) {
      debugPrint('[MessagingService] Failed to fetch unread count: ${e.message}');
      return 0; // Return 0 on error - not critical
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA (Development Only)
  // ═══════════════════════════════════════════════════════════════════════════

  final List<Conversation> _mockConversations = [
    Conversation(
      id: 'conv-1',
      name: "Emma's Care Team",
      description: 'Discussion about Emma\'s progress and support',
      type: ConversationType.thread,
      context: const ThreadContext(
        type: ContextType.learner,
        learnerId: 'learner-1',
        learnerName: 'Emma Johnson',
      ),
      participants: const [
        ConversationParticipant(
          id: 'user-1',
          name: 'Sarah Johnson',
          role: 'Parent',
          isOnline: true,
        ),
        ConversationParticipant(
          id: 'user-2',
          name: 'Mr. Thompson',
          role: 'Teacher',
          isOnline: false,
        ),
        ConversationParticipant(
          id: 'user-3',
          name: 'Dr. Martinez',
          role: 'School Counselor',
          isOnline: true,
        ),
      ],
      unreadCount: 2,
      lastMessagePreview: 'Great progress on the reading goals!',
      lastMessageAt: DateTime.now().subtract(const Duration(minutes: 30)),
      createdAt: DateTime.now().subtract(const Duration(days: 14)),
    ),
    Conversation(
      id: 'conv-2',
      name: 'Reading Improvement Plan',
      description: 'Updates on Emma\'s reading action plan',
      type: ConversationType.thread,
      context: const ThreadContext(
        type: ContextType.actionPlan,
        contextId: 'ap-1',
        actionPlanId: 'ap-1',
        actionPlanTitle: 'Reading Improvement Plan',
        learnerId: 'learner-1',
        learnerName: 'Emma Johnson',
      ),
      participants: const [
        ConversationParticipant(
          id: 'user-1',
          name: 'Sarah Johnson',
          role: 'Parent',
        ),
        ConversationParticipant(
          id: 'user-2',
          name: 'Mr. Thompson',
          role: 'Teacher',
        ),
      ],
      unreadCount: 0,
      lastMessagePreview: 'Let\'s review the milestones next week',
      lastMessageAt: DateTime.now().subtract(const Duration(hours: 3)),
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
    ),
    Conversation(
      id: 'conv-3',
      name: 'IEP Meeting - March 15',
      description: 'Discussion thread for upcoming IEP meeting',
      type: ConversationType.thread,
      context: const ThreadContext(
        type: ContextType.meeting,
        contextId: 'meeting-1',
        meetingId: 'meeting-1',
        meetingTitle: 'IEP Meeting - March 15',
        learnerId: 'learner-1',
        learnerName: 'Emma Johnson',
      ),
      participants: const [
        ConversationParticipant(
          id: 'user-1',
          name: 'Sarah Johnson',
          role: 'Parent',
        ),
        ConversationParticipant(
          id: 'user-2',
          name: 'Mr. Thompson',
          role: 'Teacher',
        ),
        ConversationParticipant(
          id: 'user-4',
          name: 'Ms. Garcia',
          role: 'Special Ed Coordinator',
        ),
      ],
      unreadCount: 1,
      lastMessagePreview: 'I\'ll prepare the progress report',
      lastMessageAt: DateTime.now().subtract(const Duration(hours: 6)),
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    Conversation(
      id: 'conv-4',
      name: "Liam's Care Team",
      type: ConversationType.thread,
      context: const ThreadContext(
        type: ContextType.learner,
        learnerId: 'learner-2',
        learnerName: 'Liam Johnson',
      ),
      participants: const [
        ConversationParticipant(
          id: 'user-1',
          name: 'Sarah Johnson',
          role: 'Parent',
        ),
        ConversationParticipant(
          id: 'user-5',
          name: 'Mrs. Davis',
          role: 'Teacher',
        ),
      ],
      unreadCount: 0,
      lastMessagePreview: 'Liam did great on his math test!',
      lastMessageAt: DateTime.now().subtract(const Duration(days: 1)),
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    ),
  ];

  final List<Message> _mockMessages = [
    Message(
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-2',
      senderName: 'Mr. Thompson',
      type: MessageType.text,
      content: 'Good morning! I wanted to share some exciting news about Emma\'s reading progress.',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      isRead: true,
    ),
    Message(
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'user-2',
      senderName: 'Mr. Thompson',
      type: MessageType.text,
      content: 'She completed her reading goal for this week two days early! 📚',
      createdAt: DateTime.now().subtract(const Duration(hours: 1, minutes: 55)),
      isRead: true,
    ),
    Message(
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-3',
      senderName: 'Dr. Martinez',
      type: MessageType.text,
      content: 'That\'s wonderful to hear! The strategies we discussed in our last meeting seem to be working well.',
      createdAt: DateTime.now().subtract(const Duration(hours: 1, minutes: 30)),
      isRead: true,
    ),
    Message(
      id: 'msg-4',
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'Sarah Johnson',
      type: MessageType.text,
      content: 'This is such great news! We\'ve been doing the nightly reading routine at home too. She\'s been so excited about it.',
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      isRead: true,
    ),
    Message(
      id: 'msg-5',
      conversationId: 'conv-1',
      senderId: 'user-2',
      senderName: 'Mr. Thompson',
      type: MessageType.text,
      content: 'Great progress on the reading goals! I think we should consider updating her action plan to include some more challenging books.',
      createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
      isRead: false,
    ),
  ];
}

/// Exception for messaging operations
class MessagingException implements Exception {
  const MessagingException(this.message);
  final String message;

  @override
  String toString() => message;
}
