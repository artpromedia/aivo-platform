/// Student AI Conversations Screen
///
/// View and review AI conversations for a specific student.
/// Allows teachers to see how students interact with AI tutoring.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/ai_transparency.dart';
import '../../providers/ai_transparency_provider.dart';

/// Screen displaying AI conversations for a specific student.
class StudentAIConversationsScreen extends ConsumerStatefulWidget {
  const StudentAIConversationsScreen({
    super.key,
    required this.studentId,
    this.studentName,
  });

  final String studentId;
  final String? studentName;

  @override
  ConsumerState<StudentAIConversationsScreen> createState() =>
      _StudentAIConversationsScreenState();
}

class _StudentAIConversationsScreenState
    extends ConsumerState<StudentAIConversationsScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentAIConversationsProvider(widget.studentId));
    final notifier = ref.read(studentAIConversationsProvider(widget.studentId).notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.studentName ?? 'AI Conversations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => notifier.loadConversations(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildErrorView(state.error!, notifier)
              : state.conversations.isEmpty
                  ? _buildEmptyState()
                  : _buildConversationsList(state, notifier),
    );
  }

  Widget _buildErrorView(String error, StudentAIConversationsNotifier notifier) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            'Error loading conversations',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => notifier.loadConversations(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No AI conversations yet',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'AI interactions will appear here',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade500,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationsList(
    StudentAIConversationsState state,
    StudentAIConversationsNotifier notifier,
  ) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.conversations.length,
      itemBuilder: (context, index) {
        final conversation = state.conversations[index];
        return _ConversationCard(
          conversation: conversation,
          onTap: () => _showConversationDetail(conversation, notifier),
          onFlag: () => _showFlagDialog(conversation, notifier),
        );
      },
    );
  }

  void _showConversationDetail(
    AIConversation conversation,
    StudentAIConversationsNotifier notifier,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => _ConversationDetailSheet(
          conversation: conversation,
          scrollController: scrollController,
          onFlag: () {
            Navigator.pop(context);
            _showFlagDialog(conversation, notifier);
          },
          onAddNote: (note) {
            notifier.addTeacherNote(conversation.id, note);
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Note added')),
            );
          },
        ),
      ),
    );
  }

  void _showFlagDialog(
    AIConversation conversation,
    StudentAIConversationsNotifier notifier,
  ) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Flag Conversation'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Why are you flagging this conversation?'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Enter reason...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                notifier.flagConversation(conversation.id, controller.text);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Conversation flagged for review')),
                );
              }
            },
            child: const Text('Flag'),
          ),
        ],
      ),
    );
  }
}

class _ConversationCard extends StatelessWidget {
  const _ConversationCard({
    required this.conversation,
    required this.onTap,
    required this.onFlag,
  });

  final AIConversation conversation;
  final VoidCallback onTap;
  final VoidCallback onFlag;

  @override
  Widget build(BuildContext context) {
    final interactionConfig = _getInteractionConfig(conversation.interactionType);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: interactionConfig.color.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      interactionConfig.icon,
                      size: 20,
                      color: interactionConfig.color,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              interactionConfig.label,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            if (conversation.isFlagged) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: conversation.flagStatus == AIFlagStatus.flagged
                                      ? Colors.red.shade100
                                      : Colors.orange.shade100,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  conversation.flagStatus == AIFlagStatus.flagged
                                      ? 'Flagged'
                                      : 'Review',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: conversation.flagStatus == AIFlagStatus.flagged
                                        ? Colors.red.shade700
                                        : Colors.orange.shade700,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        if (conversation.topic != null)
                          Text(
                            conversation.topic!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey.shade600,
                                ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      conversation.isFlagged ? Icons.flag : Icons.flag_outlined,
                      color: conversation.isFlagged ? Colors.orange : Colors.grey,
                    ),
                    onPressed: onFlag,
                    tooltip: 'Flag for review',
                  ),
                ],
              ),

              // Summary
              if (conversation.summary != null) ...[
                const SizedBox(height: 12),
                Text(
                  conversation.summary!,
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],

              // Metadata
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetadataChip(
                    icon: Icons.access_time,
                    label: _formatDateTime(conversation.startedAt),
                  ),
                  const SizedBox(width: 12),
                  _MetadataChip(
                    icon: Icons.chat_bubble_outline,
                    label: '${conversation.messageCount} messages',
                  ),
                  if (conversation.duration != null) ...[
                    const SizedBox(width: 12),
                    _MetadataChip(
                      icon: Icons.timer_outlined,
                      label: _formatDuration(conversation.duration!),
                    ),
                  ],
                  const Spacer(),
                  if (conversation.sentiment != null)
                    _SentimentIndicator(sentiment: conversation.sentiment!),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  _InteractionConfig _getInteractionConfig(AIInteractionType type) {
    switch (type) {
      case AIInteractionType.tutoring:
        return _InteractionConfig('Tutoring', Icons.school, Colors.blue);
      case AIInteractionType.homework:
        return _InteractionConfig('Homework Help', Icons.assignment, Colors.green);
      case AIInteractionType.writing:
        return _InteractionConfig('Writing', Icons.edit_note, Colors.purple);
      case AIInteractionType.focusBreak:
        return _InteractionConfig('Focus Break', Icons.self_improvement, Colors.teal);
      case AIInteractionType.assessment:
        return _InteractionConfig('Assessment', Icons.quiz, Colors.orange);
      case AIInteractionType.socialEmotional:
        return _InteractionConfig('SEL', Icons.favorite, Colors.pink);
      case AIInteractionType.other:
        return _InteractionConfig('Other', Icons.chat, Colors.grey);
    }
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inDays == 0) {
      return 'Today ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${dateTime.month}/${dateTime.day}/${dateTime.year}';
    }
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    if (minutes < 60) {
      return '${minutes}m';
    }
    final hours = duration.inHours;
    final remainingMinutes = minutes % 60;
    return '${hours}h ${remainingMinutes}m';
  }
}

class _InteractionConfig {
  const _InteractionConfig(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;
}

class _MetadataChip extends StatelessWidget {
  const _MetadataChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey.shade600),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: Colors.grey.shade600,
              ),
        ),
      ],
    );
  }
}

class _SentimentIndicator extends StatelessWidget {
  const _SentimentIndicator({required this.sentiment});

  final String sentiment;

  @override
  Widget build(BuildContext context) {
    final config = _getSentimentConfig(sentiment);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 14, color: config.color),
          const SizedBox(width: 4),
          Text(
            config.label,
            style: TextStyle(
              fontSize: 11,
              color: config.color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  _SentimentConfig _getSentimentConfig(String sentiment) {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return _SentimentConfig('Positive', Icons.sentiment_satisfied, Colors.green);
      case 'neutral':
        return _SentimentConfig('Neutral', Icons.sentiment_neutral, Colors.grey);
      case 'negative':
        return _SentimentConfig('Negative', Icons.sentiment_dissatisfied, Colors.orange);
      case 'frustrated':
        return _SentimentConfig('Frustrated', Icons.sentiment_very_dissatisfied, Colors.red);
      default:
        return _SentimentConfig('Unknown', Icons.help_outline, Colors.grey);
    }
  }
}

class _SentimentConfig {
  const _SentimentConfig(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;
}

class _ConversationDetailSheet extends StatelessWidget {
  const _ConversationDetailSheet({
    required this.conversation,
    required this.scrollController,
    required this.onFlag,
    required this.onAddNote,
  });

  final AIConversation conversation;
  final ScrollController scrollController;
  final VoidCallback onFlag;
  final ValueChanged<String> onAddNote;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        conversation.topic ?? 'AI Conversation',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${conversation.subject ?? 'General'} - ${_formatDateTime(conversation.startedAt)}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.flag_outlined),
                  onPressed: onFlag,
                  tooltip: 'Flag',
                ),
                IconButton(
                  icon: const Icon(Icons.note_add_outlined),
                  onPressed: () => _showAddNoteDialog(context),
                  tooltip: 'Add Note',
                ),
              ],
            ),
          ),

          const Divider(),

          // Messages
          Expanded(
            child: ListView.builder(
              controller: scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: conversation.messages.length,
              itemBuilder: (context, index) {
                final message = conversation.messages[index];
                return _MessageBubble(message: message);
              },
            ),
          ),

          // Summary if available
          if (conversation.summary != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                border: Border(
                  top: BorderSide(color: Colors.grey.shade300),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Summary',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    conversation.summary!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),

          // Teacher notes if available
          if (conversation.teacherNotes != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                border: Border(
                  top: BorderSide(color: Colors.blue.shade200),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.note, size: 16, color: Colors.blue.shade700),
                      const SizedBox(width: 4),
                      Text(
                        'Teacher Note',
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    conversation.teacherNotes!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  void _showAddNoteDialog(BuildContext context) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Teacher Note'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Enter your note...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                Navigator.pop(context);
                onAddNote(controller.text);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.month}/${dateTime.day}/${dateTime.year} at ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final AIMessage message;

  @override
  Widget build(BuildContext context) {
    final isStudent = message.isFromStudent;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isStudent ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isStudent) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.purple.shade100,
              child: Icon(Icons.smart_toy, size: 18, color: Colors.purple.shade700),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isStudent ? Colors.blue.shade100 : Colors.grey.shade200,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isStudent ? 16 : 4),
                  bottomRight: Radius.circular(isStudent ? 4 : 16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.content,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(message.timestamp),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ],
              ),
            ),
          ),
          if (isStudent) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.blue.shade100,
              child: Icon(Icons.person, size: 18, color: Colors.blue.shade700),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
