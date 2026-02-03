/// Approval Queue Screen
///
/// Screen for managing pending AI approval requests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/ai_autonomy_settings.dart';
import '../providers/ai_controls_provider.dart';
import '../widgets/widgets.dart';

/// Screen for managing pending AI approval requests.
class ApprovalQueueScreen extends ConsumerStatefulWidget {
  const ApprovalQueueScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<ApprovalQueueScreen> createState() => _ApprovalQueueScreenState();
}

class _ApprovalQueueScreenState extends ConsumerState<ApprovalQueueScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Approval Requests'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Pending'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _PendingTab(childId: widget.childId),
          _HistoryTab(childId: widget.childId),
        ],
      ),
    );
  }
}

/// Tab showing pending approval requests.
class _PendingTab extends ConsumerWidget {
  const _PendingTab({required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingAsync = ref.watch(approvalQueueNotifierProvider(childId));

    return pendingAsync.when(
      data: (pending) {
        if (pending.isEmpty) {
          return const EmptyApprovalState();
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(approvalQueueNotifierProvider(childId));
          },
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: pending.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final request = pending[index];
              return ApprovalCard(
                request: request,
                onApprove: () => _handleApprove(context, ref, request),
                onDeny: () => _handleDeny(context, ref, request),
                onTap: () => _showDetails(context, request),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Failed to load requests: $error'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => ref.invalidate(approvalQueueNotifierProvider(childId)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _handleApprove(
    BuildContext context,
    WidgetRef ref,
    ApprovalRequest request,
  ) async {
    final comment = await _showCommentDialog(context, 'Approve', 'approval');

    if (context.mounted && comment != null) {
      ref
          .read(approvalQueueNotifierProvider(childId).notifier)
          .approve(request.id, comment: comment.isEmpty ? null : comment);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Request approved'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  void _handleDeny(
    BuildContext context,
    WidgetRef ref,
    ApprovalRequest request,
  ) async {
    final comment = await _showCommentDialog(context, 'Deny', 'denial');

    if (context.mounted && comment != null) {
      ref
          .read(approvalQueueNotifierProvider(childId).notifier)
          .deny(request.id, comment: comment.isEmpty ? null : comment);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Request denied'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<String?> _showCommentDialog(
    BuildContext context,
    String action,
    String type,
  ) async {
    final controller = TextEditingController();

    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$action Request'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Add an optional comment for this $type:'),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'Comment (optional)',
                border: const OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(null),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            style: action == 'Deny'
                ? FilledButton.styleFrom(backgroundColor: Colors.red)
                : null,
            child: Text(action),
          ),
        ],
      ),
    );
  }

  void _showDetails(BuildContext context, ApprovalRequest request) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (context, scrollController) => _RequestDetailsSheet(
          request: request,
          scrollController: scrollController,
        ),
      ),
    );
  }
}

/// Tab showing approval history.
class _HistoryTab extends ConsumerWidget {
  const _HistoryTab({required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(approvalHistoryProvider(childId));

    return historyAsync.when(
      data: (history) {
        if (history.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.history,
                  size: 64,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(height: 16),
                Text(
                  'No History',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Previous approval requests will appear here',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(approvalHistoryProvider(childId));
          },
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: history.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final request = history[index];
              return ApprovalCard(
                request: request,
                showActions: false,
                onTap: () => _showDetails(context, request),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Failed to load history: $error'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => ref.invalidate(approvalHistoryProvider(childId)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetails(BuildContext context, ApprovalRequest request) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (context, scrollController) => _RequestDetailsSheet(
          request: request,
          scrollController: scrollController,
        ),
      ),
    );
  }
}

/// Details sheet for a request.
class _RequestDetailsSheet extends StatelessWidget {
  const _RequestDetailsSheet({
    required this.request,
    required this.scrollController,
  });

  final ApprovalRequest request;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getCategoryColor(request.category).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getCategoryIcon(request.category),
                  color: _getCategoryColor(request.category),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      request.title,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _getCategoryLabel(request.category),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: _getCategoryColor(request.category),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Description
          Text(
            'Description',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(request.description),
          const SizedBox(height: 24),

          // AI Reasoning
          if (request.aiReasoning != null) ...[
            Text(
              'AI Reasoning',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.psychology,
                    size: 20,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(request.aiReasoning!)),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Proposed Change
          if (request.proposedChange != null) ...[
            Text(
              'Proposed Change',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            _DetailCard(
              icon: Icons.arrow_forward,
              color: Colors.blue,
              data: request.proposedChange!,
            ),
            const SizedBox(height: 24),
          ],

          // Current State
          if (request.currentState != null) ...[
            Text(
              'Current State',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            _DetailCard(
              icon: Icons.info_outline,
              color: Colors.grey,
              data: request.currentState!,
            ),
            const SizedBox(height: 24),
          ],

          // Timeline
          Text(
            'Timeline',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          _TimelineItem(
            icon: Icons.schedule,
            label: 'Requested',
            time: request.requestedAt,
          ),
          if (request.expiresAt != null)
            _TimelineItem(
              icon: Icons.timer,
              label: 'Expires',
              time: request.expiresAt!,
              isWarning: request.expiresAt!.difference(DateTime.now()).inHours < 2,
            ),
          if (request.respondedAt != null)
            _TimelineItem(
              icon: request.status == ApprovalStatus.approved
                  ? Icons.check_circle
                  : Icons.cancel,
              label: request.status == ApprovalStatus.approved
                  ? 'Approved'
                  : 'Denied',
              time: request.respondedAt!,
              color: request.status == ApprovalStatus.approved
                  ? Colors.green
                  : Colors.red,
            ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String _getCategoryLabel(DecisionCategory category) {
    switch (category) {
      case DecisionCategory.difficulty:
        return 'Difficulty Adjustment';
      case DecisionCategory.pace:
        return 'Learning Pace';
      case DecisionCategory.topics:
        return 'Topic Selection';
      case DecisionCategory.rewards:
        return 'Rewards & Gamification';
      case DecisionCategory.breaks:
        return 'Breaks & Rest';
      case DecisionCategory.communication:
        return 'Communication Style';
      case DecisionCategory.assessments:
        return 'Assessment';
      case DecisionCategory.interventions:
        return 'Intervention';
    }
  }

  IconData _getCategoryIcon(DecisionCategory category) {
    switch (category) {
      case DecisionCategory.difficulty:
        return Icons.trending_up;
      case DecisionCategory.pace:
        return Icons.speed;
      case DecisionCategory.topics:
        return Icons.topic;
      case DecisionCategory.rewards:
        return Icons.emoji_events;
      case DecisionCategory.breaks:
        return Icons.free_breakfast;
      case DecisionCategory.communication:
        return Icons.chat;
      case DecisionCategory.assessments:
        return Icons.quiz;
      case DecisionCategory.interventions:
        return Icons.support;
    }
  }

  Color _getCategoryColor(DecisionCategory category) {
    switch (category) {
      case DecisionCategory.difficulty:
        return Colors.blue;
      case DecisionCategory.pace:
        return Colors.teal;
      case DecisionCategory.topics:
        return Colors.purple;
      case DecisionCategory.rewards:
        return Colors.amber;
      case DecisionCategory.breaks:
        return Colors.green;
      case DecisionCategory.communication:
        return Colors.pink;
      case DecisionCategory.assessments:
        return Colors.orange;
      case DecisionCategory.interventions:
        return Colors.indigo;
    }
  }
}

/// Detail card for JSON data.
class _DetailCard extends StatelessWidget {
  const _DetailCard({
    required this.icon,
    required this.color,
    required this.data,
  });

  final IconData icon;
  final Color color;
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: data.entries.map((entry) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_formatKey(entry.key)}:',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${entry.value}',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  String _formatKey(String key) {
    return key
        .replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}')
        .trim()
        .split(' ')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }
}

/// Timeline item.
class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.icon,
    required this.label,
    required this.time,
    this.color,
    this.isWarning = false,
  });

  final IconData icon;
  final String label;
  final DateTime time;
  final Color? color;
  final bool isWarning;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = isWarning ? Colors.orange : (color ?? theme.colorScheme.onSurfaceVariant);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: displayColor),
          const SizedBox(width: 8),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
              color: displayColor,
            ),
          ),
          const Spacer(),
          Text(
            _formatDateTime(time),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return '${_formatHour(dt.hour)}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return '${dt.month}/${dt.day} ${_formatHour(dt.hour)}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatHour(int hour) {
    if (hour == 0) return '12 AM';
    if (hour == 12) return '12 PM';
    if (hour < 12) return '$hour AM';
    return '${hour - 12} PM';
  }
}
