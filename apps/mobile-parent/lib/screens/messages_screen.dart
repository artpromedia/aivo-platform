/// Messaging Screen
///
/// Parent messaging with read status per child.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Message sender type.
enum MessageSenderType { parent, teacher, system }

/// A single message.
class Message {
  const Message({
    required this.id,
    required this.threadId,
    required this.content,
    required this.senderType,
    required this.senderName,
    required this.createdAt,
    this.isRead = false,
    this.attachments = const [],
  });

  final String id;
  final String threadId;
  final String content;
  final MessageSenderType senderType;
  final String senderName;
  final DateTime createdAt;
  final bool isRead;
  final List<String> attachments;

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      threadId: json['threadId'] as String,
      content: json['content'] as String,
      senderType: MessageSenderType.values.firstWhere(
        (t) => t.name == (json['senderType'] as String).toLowerCase(),
        orElse: () => MessageSenderType.system,
      ),
      senderName: json['senderName'] as String? ?? 'Unknown',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
      attachments: (json['attachments'] as List?)?.cast<String>() ?? [],
    );
  }
}

/// A message thread (conversation).
class MessageThread {
  const MessageThread({
    required this.id,
    required this.childId,
    required this.childName,
    this.lastMessage,
    this.unreadCount = 0,
    this.participants = const [],
  });

  final String id;
  final String childId;
  final String childName;
  final Message? lastMessage;
  final int unreadCount;
  final List<String> participants;

  factory MessageThread.fromJson(Map<String, dynamic> json) {
    return MessageThread(
      id: json['id'] as String,
      childId: json['childId'] as String,
      childName: json['childName'] as String? ?? 'Unknown',
      lastMessage: json['lastMessage'] != null
          ? Message.fromJson(json['lastMessage'] as Map<String, dynamic>)
          : null,
      unreadCount: json['unreadCount'] as int? ?? 0,
      participants: (json['participants'] as List?)?.cast<String>() ?? [],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING STATE
// ═══════════════════════════════════════════════════════════════════════════════

class MessagingState {
  const MessagingState({
    this.threads = const [],
    this.messages = const {},
    this.isLoading = false,
    this.error,
  });

  final List<MessageThread> threads;
  final Map<String, List<Message>> messages; // threadId -> messages
  final bool isLoading;
  final String? error;

  MessagingState copyWith({
    List<MessageThread>? threads,
    Map<String, List<Message>>? messages,
    bool? isLoading,
    String? error,
  }) {
    return MessagingState(
      threads: threads ?? this.threads,
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class MessagingNotifier extends StateNotifier<MessagingState> {
  MessagingNotifier(this._apiClient) : super(const MessagingState());

  final AivoApiClient _apiClient;

  Future<void> loadThreads() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiClient.get(ApiEndpoints.messages);
      final data = response.data as List<dynamic>? ?? [];
      final threads = data
          .whereType<Map<String, dynamic>>()
          .map((json) => MessageThread.fromJson(json))
          .toList();

      state = state.copyWith(threads: threads, isLoading: false);
    } catch (e) {
      final apiError = extractApiException(e);
      state = state.copyWith(
        isLoading: false,
        error: apiError?.message ?? 'Failed to load messages',
      );
    }
  }

  Future<void> loadThread(String childId) async {
    try {
      final response = await _apiClient.get(ApiEndpoints.messageThread(childId));
      final data = response.data as List<dynamic>? ?? [];
      final messages = data
          .whereType<Map<String, dynamic>>()
          .map((json) => Message.fromJson(json))
          .toList();

      // Find thread ID
      final thread = state.threads.firstWhere((t) => t.childId == childId);
      final newMessages = Map<String, List<Message>>.from(state.messages);
      newMessages[thread.id] = messages;

      state = state.copyWith(messages: newMessages);
    } catch (_) {
      // Silently fail for now
    }
  }

  Future<bool> sendMessage(String childId, String content) async {
    try {
      await _apiClient.post(
        ApiEndpoints.messageThread(childId),
        data: {'content': content},
      );

      // Reload thread
      await loadThread(childId);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> markAsRead(String messageId) async {
    try {
      await _apiClient.post(ApiEndpoints.markRead(messageId));
    } catch (_) {
      // Silently fail
    }
  }
}

final messagingProvider = StateNotifierProvider<MessagingNotifier, MessagingState>((ref) {
  final apiClient = AivoApiClient.instance;
  return MessagingNotifier(apiClient);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

/// Message threads list screen.
class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(messagingProvider.notifier).loadThreads();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(messagingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.threads.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.message_outlined,
                        size: 64,
                        color: colorScheme.primary.withOpacity(0.5),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No messages yet',
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Messages from teachers will appear here',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(messagingProvider.notifier).loadThreads(),
                  child: ListView.separated(
                    itemCount: state.threads.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final thread = state.threads[index];
                      return _ThreadTile(
                        thread: thread,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => MessageThreadScreen(
                              childId: thread.childId,
                              childName: thread.childName,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread, required this.onTap});

  final MessageThread thread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasUnread = thread.unreadCount > 0;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: colorScheme.primaryContainer,
        child: Text(
          thread.childName.isNotEmpty ? thread.childName[0].toUpperCase() : '?',
          style: TextStyle(color: colorScheme.onPrimaryContainer),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              thread.childName,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
          if (thread.lastMessage != null)
            Text(
              _formatTime(thread.lastMessage!.createdAt),
              style: theme.textTheme.labelSmall?.copyWith(
                color: hasUnread ? colorScheme.primary : colorScheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
      subtitle: thread.lastMessage != null
          ? Text(
              thread.lastMessage!.content,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: hasUnread ? FontWeight.w600 : FontWeight.normal,
                color: hasUnread ? colorScheme.onSurface : colorScheme.onSurfaceVariant,
              ),
            )
          : const Text('No messages'),
      trailing: hasUnread
          ? Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: colorScheme.primary,
                shape: BoxShape.circle,
              ),
              child: Text(
                thread.unreadCount.toString(),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onPrimary,
                ),
              ),
            )
          : null,
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inDays > 7) {
      return '${time.month}/${time.day}';
    } else if (diff.inDays > 0) {
      return '${diff.inDays}d';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h';
    } else if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m';
    } else {
      return 'Now';
    }
  }
}

/// Individual message thread screen.
class MessageThreadScreen extends ConsumerStatefulWidget {
  const MessageThreadScreen({
    super.key,
    required this.childId,
    required this.childName,
  });

  final String childId;
  final String childName;

  @override
  ConsumerState<MessageThreadScreen> createState() => _MessageThreadScreenState();
}

class _MessageThreadScreenState extends ConsumerState<MessageThreadScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(messagingProvider.notifier).loadThread(widget.childId);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _messageController.clear();

    final success = await ref
        .read(messagingProvider.notifier)
        .sendMessage(widget.childId, content);

    setState(() => _isSending = false);

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to send message')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(messagingProvider);

    // Find the thread
    final thread = state.threads.firstWhere(
      (t) => t.childId == widget.childId,
      orElse: () => MessageThread(
        id: '',
        childId: widget.childId,
        childName: widget.childName,
      ),
    );

    final messages = state.messages[thread.id] ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.childName),
            Text(
              '${thread.participants.length} participants',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: messages.isEmpty
                ? Center(
                    child: Text(
                      'Start a conversation',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final message = messages[messages.length - 1 - index];
                      final isMe = message.senderType == MessageSenderType.parent;
                      return _MessageBubble(message: message, isMe: isMe);
                    },
                  ),
          ),
          // Compose area
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              border: Border(
                top: BorderSide(color: colorScheme.outlineVariant),
              ),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                      minLines: 1,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _isSending ? null : _sendMessage,
                    icon: _isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMe});

  final Message message;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isMe ? colorScheme.primaryContainer : colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  message.senderName,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            Text(
              message.content,
              style: TextStyle(
                color: isMe ? colorScheme.onPrimaryContainer : colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _formatTime(message.createdAt),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: (isMe ? colorScheme.onPrimaryContainer : colorScheme.onSurfaceVariant)
                        .withOpacity(0.7),
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  Icon(
                    message.isRead ? Icons.done_all : Icons.done,
                    size: 14,
                    color: message.isRead
                        ? colorScheme.primary
                        : colorScheme.onPrimaryContainer.withOpacity(0.7),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : time.hour;
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${time.minute.toString().padLeft(2, '0')} $period';
  }
}
