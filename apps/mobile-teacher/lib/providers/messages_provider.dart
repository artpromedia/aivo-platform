/// Messages Provider
///
/// State management for parent messaging.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Messages state.
class MessagesState {
  const MessagesState({
    this.conversations = const [],
    this.isLoading = false,
    this.error,
    this.unreadCount = 0,
    this.lastUpdated,
  });

  final List<Conversation> conversations;
  final bool isLoading;
  final String? error;
  final int unreadCount;
  final DateTime? lastUpdated;

  MessagesState copyWith({
    List<Conversation>? conversations,
    bool? isLoading,
    String? error,
    int? unreadCount,
    DateTime? lastUpdated,
  }) {
    return MessagesState(
      conversations: conversations ?? this.conversations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      unreadCount: unreadCount ?? this.unreadCount,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Messages notifier.
class MessagesNotifier extends StateNotifier<MessagesState> {
  MessagesNotifier(this._repository) : super(const MessagesState());

  final MessageRepository _repository;

  /// Load all conversations.
  Future<void> loadConversations() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final conversations = await _repository.getConversations();
      final unreadCount = await _repository.getUnreadCount();
      
      state = state.copyWith(
        conversations: conversations,
        unreadCount: unreadCount,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh conversations from server.
  Future<void> refreshConversations() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final conversations = await _repository.refreshConversations();
      final unreadCount = await _repository.getUnreadCount();
      
      state = state.copyWith(
        conversations: conversations,
        unreadCount: unreadCount,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Send a message.
  Future<Message> sendMessage(SendMessageDto dto) async {
    final message = await _repository.sendMessage(dto);
    
    // Update conversation in state
    final updatedConversations = state.conversations.map((c) {
      if (c.id != dto.conversationId) return c;
      return c.copyWith(
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
      );
    }).toList();
    
    state = state.copyWith(conversations: updatedConversations);
    return message;
  }

  /// Mark messages as read.
  Future<void> markAsRead(String conversationId, List<String> messageIds) async {
    await _repository.markAsRead(messageIds);
    
    // Update unread count
    final updatedConversations = state.conversations.map((c) {
      if (c.id != conversationId) return c;
      return c.copyWith(unreadCount: 0);
    }).toList();
    
    final newUnreadCount = updatedConversations.fold(0, (sum, c) => sum + c.unreadCount);
    
    state = state.copyWith(
      conversations: updatedConversations,
      unreadCount: newUnreadCount,
    );
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Messages state provider.
final messagesProvider = StateNotifierProvider<MessagesNotifier, MessagesState>((ref) {
  final repository = ref.watch(messageRepositoryProvider);
  return MessagesNotifier(repository);
});

/// Messages for a conversation provider.
final conversationMessagesProvider = FutureProvider.family<List<Message>, String>((ref, conversationId) async {
  final repository = ref.watch(messageRepositoryProvider);
  return repository.getMessages(conversationId);
});

/// Message templates provider.
final messageTemplatesProvider = FutureProvider<List<MessageTemplate>>((ref) async {
  final repository = ref.watch(messageRepositoryProvider);
  return repository.getTemplates();
});

/// Unread count provider.
final unreadCountProvider = Provider<int>((ref) {
  final state = ref.watch(messagesProvider);
  return state.unreadCount;
});

/// Conversations with unread provider.
final conversationsWithUnreadProvider = Provider<List<Conversation>>((ref) {
  final state = ref.watch(messagesProvider);
  return state.conversations.where((c) => c.unreadCount > 0).toList();
});
