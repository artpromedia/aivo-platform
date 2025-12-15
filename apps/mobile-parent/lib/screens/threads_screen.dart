/// Threads Screen
///
/// Displays contextual messaging threads grouped by learner.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../messaging/models.dart';
import '../messaging/service.dart';

/// Provider for messaging service
final messagingServiceProvider = Provider((ref) => MessagingService());

/// Provider for conversations
final conversationsProvider = FutureProvider<List<Conversation>>((ref) async {
  final service = ref.watch(messagingServiceProvider);
  return service.getConversations();
});

/// Threads screen showing contextual conversations
class ThreadsScreen extends ConsumerStatefulWidget {
  const ThreadsScreen({super.key});

  @override
  ConsumerState<ThreadsScreen> createState() => _ThreadsScreenState();
}

class _ThreadsScreenState extends ConsumerState<ThreadsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedLearnerId;

  final List<String> _learnerTabs = ['All', 'Emma', 'Liam'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _learnerTabs.length, vsync: this);
    _tabController.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    setState(() {
      if (_tabController.index == 0) {
        _selectedLearnerId = null;
      } else {
        // Map tab index to learner ID (mock data)
        _selectedLearnerId = _tabController.index == 1 ? 'learner-1' : 'learner-2';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              // TODO: Implement search
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _learnerTabs.map((name) => Tab(text: name)).toList(),
        ),
      ),
      body: conversationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Error loading messages', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.refresh(conversationsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (conversations) {
          // Filter by learner if selected
          final filtered = _selectedLearnerId == null
              ? conversations
              : conversations
                  .where((c) => c.context?.learnerId == _selectedLearnerId)
                  .toList();

          if (filtered.isEmpty) {
            return _buildEmptyState();
          }

          // Group by context type
          return _buildThreadsList(filtered);
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showNewThreadSheet(context),
        child: const Icon(Icons.add_comment),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.forum_outlined,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'No conversations yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Start a conversation with your child\'s care team',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade500,
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildThreadsList(List<Conversation> conversations) {
    // Group by context type
    final Map<ContextType, List<Conversation>> grouped = {};
    final List<Conversation> noContext = [];

    for (final conv in conversations) {
      if (conv.context != null) {
        grouped.putIfAbsent(conv.context!.type, () => []).add(conv);
      } else {
        noContext.add(conv);
      }
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 80),
      children: [
        // Care Team threads first
        if (grouped.containsKey(ContextType.learner))
          _buildContextSection(
            ContextType.learner,
            grouped[ContextType.learner]!,
          ),

        // Action Plan threads
        if (grouped.containsKey(ContextType.actionPlan))
          _buildContextSection(
            ContextType.actionPlan,
            grouped[ContextType.actionPlan]!,
          ),

        // Meeting threads
        if (grouped.containsKey(ContextType.meeting))
          _buildContextSection(
            ContextType.meeting,
            grouped[ContextType.meeting]!,
          ),

        // Other threads
        if (noContext.isNotEmpty)
          _buildContextSection(null, noContext),
      ],
    );
  }

  Widget _buildContextSection(ContextType? type, List<Conversation> conversations) {
    final title = type?.displayName ?? 'Other Conversations';
    final icon = type?.icon ?? '💬';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const Spacer(),
              Text(
                '${conversations.length}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
                    ),
              ),
            ],
          ),
        ),
        ...conversations.map((conv) => _buildConversationTile(conv)),
      ],
    );
  }

  Widget _buildConversationTile(Conversation conversation) {
    final hasUnread = conversation.unreadCount > 0;

    return ListTile(
      leading: _buildAvatar(conversation),
      title: Row(
        children: [
          Expanded(
            child: Text(
              conversation.name,
              style: TextStyle(
                fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (hasUnread)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${conversation.unreadCount}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (conversation.context != null && conversation.context!.learnerName != null)
            Text(
              conversation.context!.learnerName!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
          if (conversation.lastMessagePreview != null)
            Text(
              conversation.lastMessagePreview!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: hasUnread ? Colors.black87 : Colors.grey,
              ),
            ),
        ],
      ),
      trailing: conversation.lastMessageAt != null
          ? Text(
              _formatTime(conversation.lastMessageAt!),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: hasUnread
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey,
                    fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
                  ),
            )
          : null,
      onTap: () => _openConversation(conversation),
    );
  }

  Widget _buildAvatar(Conversation conversation) {
    if (conversation.avatarUrl != null) {
      return CircleAvatar(
        backgroundImage: NetworkImage(conversation.avatarUrl!),
      );
    }

    // Use context icon
    final icon = conversation.context?.type.icon ?? '💬';
    return CircleAvatar(
      backgroundColor: _getContextColor(conversation.context?.type),
      child: Text(icon, style: const TextStyle(fontSize: 18)),
    );
  }

  Color _getContextColor(ContextType? type) {
    switch (type) {
      case ContextType.learner:
        return Colors.blue.shade100;
      case ContextType.actionPlan:
        return Colors.green.shade100;
      case ContextType.meeting:
        return Colors.orange.shade100;
      case ContextType.goal:
        return Colors.purple.shade100;
      default:
        return Colors.grey.shade200;
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d';
    } else {
      return '${time.month}/${time.day}';
    }
  }

  void _openConversation(Conversation conversation) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ConversationScreen(conversation: conversation),
      ),
    );
  }

  void _showNewThreadSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const _NewThreadSheet(),
    );
  }
}

/// Bottom sheet for creating new thread
class _NewThreadSheet extends ConsumerStatefulWidget {
  const _NewThreadSheet();

  @override
  ConsumerState<_NewThreadSheet> createState() => _NewThreadSheetState();
}

class _NewThreadSheetState extends ConsumerState<_NewThreadSheet> {
  ContextType _selectedType = ContextType.learner;
  String? _selectedLearnerId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Start New Conversation',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),

            // Thread type selection
            Text(
              'Conversation Type',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _buildTypeChip(ContextType.learner, 'Care Team'),
                _buildTypeChip(ContextType.actionPlan, 'Action Plan'),
                _buildTypeChip(ContextType.meeting, 'Meeting'),
              ],
            ),
            const SizedBox(height: 24),

            // Learner selection
            Text(
              'Select Learner',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            _buildLearnerDropdown(),
            const SizedBox(height: 24),

            // Start button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _selectedLearnerId != null ? _startThread : null,
                child: const Text('Start Conversation'),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeChip(ContextType type, String label) {
    final isSelected = _selectedType == type;
    return ChoiceChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(type.icon),
          const SizedBox(width: 4),
          Text(label),
        ],
      ),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) setState(() => _selectedType = type);
      },
    );
  }

  Widget _buildLearnerDropdown() {
    // Mock learners
    final learners = [
      {'id': 'learner-1', 'name': 'Emma Johnson'},
      {'id': 'learner-2', 'name': 'Liam Johnson'},
    ];

    return DropdownButtonFormField<String>(
      initialValue: _selectedLearnerId,
      decoration: const InputDecoration(
        border: OutlineInputBorder(),
        hintText: 'Choose a learner',
      ),
      items: learners.map((l) {
        return DropdownMenuItem(
          value: l['id'],
          child: Text(l['name']!),
        );
      }).toList(),
      onChanged: (value) => setState(() => _selectedLearnerId = value),
    );
  }

  Future<void> _startThread() async {
    if (_selectedLearnerId == null) return;

    final service = ref.read(messagingServiceProvider);
    final learnerName = _selectedLearnerId == 'learner-1' ? 'Emma Johnson' : 'Liam Johnson';

    try {
      final conversation = await service.findOrCreateLearnerThread(
        learnerId: _selectedLearnerId!,
        learnerName: learnerName,
        participantIds: ['current-user'],
      );

      if (!mounted) return;

      Navigator.pop(context);
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ConversationScreen(conversation: conversation),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating thread: $e')),
      );
    }
  }
}

/// Conversation screen for viewing and sending messages
class ConversationScreen extends ConsumerStatefulWidget {
  final Conversation conversation;

  const ConversationScreen({super.key, required this.conversation});

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  List<Message> _messages = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final service = ref.read(messagingServiceProvider);
    try {
      final messages = await service.getMessages(widget.conversation.id);
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoading = false;
        });
        // Mark as read
        service.markMessagesAsRead(widget.conversation.id);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.conversation.name,
              style: const TextStyle(fontSize: 16),
            ),
            if (widget.conversation.context != null)
              Text(
                '${widget.conversation.context!.type.icon} ${widget.conversation.context!.type.displayName}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.white70,
                    ),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showConversationInfo(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Context banner
          if (widget.conversation.context != null)
            _buildContextBanner(),

          // Messages
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _buildMessagesList(),
          ),

          // Input
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildContextBanner() {
    final context = widget.conversation.context!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: _getContextColor(context.type).withOpacity(0.3),
      child: Row(
        children: [
          Text(context.type.icon, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              context.displayLabel,
              style: Theme.of(this.context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ),
          TextButton(
            onPressed: () {
              // TODO: Navigate to context (action plan, meeting, etc.)
            },
            child: const Text('View'),
          ),
        ],
      ),
    );
  }

  Color _getContextColor(ContextType type) {
    switch (type) {
      case ContextType.learner:
        return Colors.blue;
      case ContextType.actionPlan:
        return Colors.green;
      case ContextType.meeting:
        return Colors.orange;
      case ContextType.goal:
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  Widget _buildMessagesList() {
    if (_messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              'No messages yet',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.grey.shade600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start the conversation!',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade500,
                  ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        final isMe = message.senderId == 'current-user';
        final showAvatar = index == 0 ||
            _messages[index - 1].senderId != message.senderId;

        return _buildMessageBubble(message, isMe, showAvatar);
      },
    );
  }

  Widget _buildMessageBubble(Message message, bool isMe, bool showAvatar) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe && showAvatar)
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.grey.shade200,
              child: Text(
                message.senderName[0].toUpperCase(),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            )
          else if (!isMe)
            const SizedBox(width: 32),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (showAvatar && !isMe)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 4),
                    child: Text(
                      message.senderName,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: isMe
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade200,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                  ),
                  child: Text(
                    message.content,
                    style: TextStyle(
                      color: isMe ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    _formatMessageTime(message.createdAt),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                          fontSize: 10,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
    );
  }

  String _formatMessageTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      return '${time.hour}:${time.minute.toString().padLeft(2, '0')}';
    } else {
      return '${time.month}/${time.day} ${time.hour}:${time.minute.toString().padLeft(2, '0')}';
    }
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.attach_file),
              onPressed: () {
                // TODO: Implement attachment
              },
            ),
            Expanded(
              child: TextField(
                controller: _messageController,
                focusNode: _focusNode,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                ),
                textCapitalization: TextCapitalization.sentences,
                minLines: 1,
                maxLines: 4,
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sendMessage,
              icon: const Icon(Icons.send),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    _messageController.clear();

    final service = ref.read(messagingServiceProvider);
    try {
      final message = await service.sendMessage(
        conversationId: widget.conversation.id,
        content: content,
      );

      if (mounted) {
        setState(() {
          _messages.add(message);
        });
        // Scroll to bottom
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 100,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error sending message: $e')),
        );
      }
    }
  }

  void _showConversationInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.conversation.name,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (widget.conversation.description != null) ...[
              const SizedBox(height: 8),
              Text(
                widget.conversation.description!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Participants',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ...widget.conversation.participants.map((p) => ListTile(
                  leading: CircleAvatar(
                    child: Text(p.name[0].toUpperCase()),
                  ),
                  title: Text(p.name),
                  subtitle: Text(p.role),
                  trailing: p.isOnline
                      ? Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        )
                      : null,
                  contentPadding: EdgeInsets.zero,
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
