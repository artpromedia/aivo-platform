/// Messages Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen showing message conversations.
class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(messagesProvider.notifier).loadConversations();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(messagesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              showSearch(
                context: context,
                delegate: _MessageSearchDelegate(
                  conversations: state.conversations,
                  onConversationTap: (id) => context.push('/messages/$id'),
                ),
              );
            },
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(messagesProvider.notifier).refreshConversations(),
              child: state.conversations.isEmpty
                  ? const _EmptyMessages()
                  : ListView.builder(
                      itemCount: state.conversations.length,
                      itemBuilder: (context, index) {
                        final conversation = state.conversations[index];
                        return ConversationTile(
                          conversation: conversation,
                          onTap: () => context.push('/messages/${conversation.id}'),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/messages/compose'),
        child: const Icon(Icons.edit),
      ),
    );
  }
}

class _EmptyMessages extends StatelessWidget {
  const _EmptyMessages();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.message_outlined, size: 64, color: AivoBrand.gray[400]),
          const SizedBox(height: 16),
          Text(
            'No messages yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Start a conversation with a parent',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

/// Tile for a conversation.
class ConversationTile extends StatelessWidget {
  const ConversationTile({
    super.key,
    required this.conversation,
    required this.onTap,
  });

  final Conversation conversation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasUnread = conversation.unreadCount > 0;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: Colors.blue.shade100,
        child: Text(
          conversation.participantNames.isNotEmpty
              ? conversation.participantNames.first.substring(0, 1).toUpperCase()
              : '?',
          style: TextStyle(color: Colors.blue.shade700),
        ),
      ),
      title: Text(
        conversation.participantNames.join(', '),
        style: hasUnread
            ? const TextStyle(fontWeight: FontWeight.bold)
            : null,
      ),
      subtitle: Text(
        conversation.lastMessage ?? 'No messages',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: hasUnread
            ? const TextStyle(fontWeight: FontWeight.w500)
            : null,
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (conversation.lastMessageAt != null)
            Text(
              _formatTime(conversation.lastMessageAt!),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          if (hasUnread)
            Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${conversation.unreadCount}',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inDays == 0) {
      return DateFormat('h:mm a').format(time);
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return DateFormat('EEE').format(time);
    } else {
      return DateFormat('MMM d').format(time);
    }
  }
}

/// Search delegate for messages
class _MessageSearchDelegate extends SearchDelegate<String?> {
  _MessageSearchDelegate({
    required this.conversations,
    required this.onConversationTap,
  });

  final List<Conversation> conversations;
  final void Function(String id) onConversationTap;

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () {
          query = '';
        },
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () {
        close(context, null);
      },
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return _buildSearchResults(context);
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return _buildSearchResults(context);
  }

  Widget _buildSearchResults(BuildContext context) {
    if (query.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 64, color: AivoBrand.gray[400]),
            const SizedBox(height: 16),
            const Text('Search conversations by name or message'),
          ],
        ),
      );
    }

    final results = conversations.where((conv) {
      final searchLower = query.toLowerCase();
      final nameMatch = conv.participantNames.any(
        (name) => name.toLowerCase().contains(searchLower),
      );
      final messageMatch = conv.lastMessage?.toLowerCase().contains(searchLower) ?? false;
      return nameMatch || messageMatch;
    }).toList();

    if (results.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 64, color: AivoBrand.gray[400]),
            const SizedBox(height: 16),
            Text('No results for "$query"'),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, index) {
        final conv = results[index];
        return ListTile(
          leading: CircleAvatar(
            child: Text(
              conv.participantNames.isNotEmpty
                  ? conv.participantNames.first[0].toUpperCase()
                  : '?',
            ),
          ),
          title: Text(conv.participantNames.join(', ')),
          subtitle: Text(
            conv.lastMessage ?? '',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          onTap: () {
            close(context, conv.id);
            onConversationTap(conv.id);
          },
        );
      },
    );
  }
}
