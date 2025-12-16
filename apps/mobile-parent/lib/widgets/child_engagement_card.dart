import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../engagement/models.dart';
import '../engagement/providers.dart';

/// Card showing child's engagement summary on parent dashboard
class ChildEngagementCard extends ConsumerWidget {
  const ChildEngagementCard({
    super.key,
    required this.learner,
  });

  final Learner learner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final engagementAsync = ref.watch(childEngagementProvider(learner.id));

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/child/${learner.id}/engagement'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: engagementAsync.when(
            loading: () => _buildLoadingState(theme),
            error: (error, _) => _buildErrorState(theme, ref),
            data: (summary) => _buildContent(context, theme, summary),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingState(ThemeData theme) {
    return Row(
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            learner.name.isNotEmpty ? learner.name[0].toUpperCase() : '?',
            style: TextStyle(
              color: theme.colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                learner.name,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              const LinearProgressIndicator(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(ThemeData theme, WidgetRef ref) {
    return Row(
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: theme.colorScheme.errorContainer,
          child: Icon(
            Icons.error_outline,
            color: theme.colorScheme.onErrorContainer,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                learner.name,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Failed to load engagement',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.invalidate(childEngagementProvider(learner.id)),
        ),
      ],
    );
  }

  Widget _buildContent(
    BuildContext context,
    ThemeData theme,
    ChildEngagementSummary summary,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Text(
                learner.name.isNotEmpty ? learner.name[0].toUpperCase() : '?',
                style: TextStyle(
                  color: theme.colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    learner.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Level ${summary.level}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Divider(height: 1),
        const SizedBox(height: 16),
        Row(
          children: [
            _StatItem(
              icon: Icons.star,
              iconColor: Colors.amber,
              label: 'XP',
              value: _formatNumber(summary.totalXp),
            ),
            const SizedBox(width: 24),
            _StatItem(
              icon: Icons.local_fire_department,
              iconColor: Colors.deepOrange,
              label: 'Streak',
              value: '${summary.streakDays}d',
            ),
            const SizedBox(width: 24),
            _StatItem(
              icon: Icons.emoji_events,
              iconColor: Colors.amber,
              label: 'Badges',
              value: '${summary.totalBadges}',
            ),
            const SizedBox(width: 24),
            _StatItem(
              icon: Icons.favorite,
              iconColor: Colors.pink,
              label: 'Kudos',
              value: '${summary.kudosReceived}',
            ),
          ],
        ),
        if (summary.recentBadges > 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🎉', style: TextStyle(fontSize: 14)),
                const SizedBox(width: 4),
                Text(
                  '${summary.recentBadges} new badge${summary.recentBadges > 1 ? 's' : ''} this week!',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000) {
      return '${(n / 1000).toStringAsFixed(1)}k';
    }
    return n.toString();
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

/// Dialog for sending kudos to a child
class SendKudosDialog extends ConsumerStatefulWidget {
  const SendKudosDialog({
    super.key,
    required this.learner,
    required this.parentId,
  });

  final Learner learner;
  final String parentId;

  @override
  ConsumerState<SendKudosDialog> createState() => _SendKudosDialogState();
}

class _SendKudosDialogState extends ConsumerState<SendKudosDialog> {
  final _controller = TextEditingController();
  bool _sending = false;
  final List<String> _quickMessages = [
    'Great job today! 🌟',
    'I\'m so proud of you! 💪',
    'Keep up the amazing work! 🎉',
    'You\'re doing fantastic! ⭐',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: Text('Send Kudos to ${widget.learner.name}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Send an encouraging message:',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _quickMessages.map((msg) {
              return ActionChip(
                label: Text(msg),
                onPressed: () => _controller.text = msg,
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            maxLines: 3,
            maxLength: 280,
            decoration: const InputDecoration(
              hintText: 'Or write your own message...',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _sending ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton.icon(
          onPressed: _sending ? null : _sendKudos,
          icon: _sending
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.send),
          label: const Text('Send'),
        ),
      ],
    );
  }

  Future<void> _sendKudos() async {
    final message = _controller.text.trim();
    if (message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a message')),
      );
      return;
    }

    setState(() => _sending = true);

    try {
      final service = ref.read(parentEngagementServiceProvider);
      await service.sendKudos(
        learnerId: widget.learner.id,
        parentId: widget.parentId,
        message: message,
      );

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Kudos sent to ${widget.learner.name}! 💖')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _sending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send kudos')),
        );
      }
    }
  }
}
