/// Approval Card Widget
///
/// Card for displaying and responding to AI approval requests.
library;

import 'package:flutter/material.dart';

import '../models/ai_autonomy_settings.dart';

/// A card widget for displaying an approval request.
class ApprovalCard extends StatelessWidget {
  const ApprovalCard({
    super.key,
    required this.request,
    this.onApprove,
    this.onDeny,
    this.onTap,
    this.showActions = true,
  });

  final ApprovalRequest request;
  final VoidCallback? onApprove;
  final VoidCallback? onDeny;
  final VoidCallback? onTap;
  final bool showActions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPending = request.status == ApprovalStatus.pending;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(12),
              color: _getCategoryColor(request.category).withValues(alpha: 0.1),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: _getCategoryColor(request.category),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getCategoryIcon(request.category),
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getCategoryLabel(request.category),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: _getCategoryColor(request.category),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          request.title,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: request.status),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    request.description,
                    style: theme.textTheme.bodyMedium,
                  ),
                  if (request.aiReasoning != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer
                            .withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.psychology,
                            size: 16,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'AI Reasoning',
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: theme.colorScheme.primary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  request.aiReasoning!,
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  // Time info
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 14,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatTime(request.requestedAt),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if (request.isUrgent) ...[
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.priority_high,
                                size: 12,
                                color: Colors.red,
                              ),
                              const SizedBox(width: 2),
                              Text(
                                'Urgent',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.red,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (request.expiresAt != null) ...[
                        const Spacer(),
                        Text(
                          'Expires ${_formatExpiry(request.expiresAt!)}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: _isExpiringSoon(request.expiresAt!)
                                ? Colors.orange
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Actions
            if (showActions && isPending) ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: onDeny,
                      icon: const Icon(Icons.close, size: 18),
                      label: const Text('Deny'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: onApprove,
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Approve'),
                    ),
                  ],
                ),
              ),
            ],
            // Response info for resolved requests
            if (!isPending && request.parentResponse != null) ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.comment,
                      size: 16,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your Response',
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            request.parentResponse!,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${time.month}/${time.day}';
  }

  String _formatExpiry(DateTime expiry) {
    final now = DateTime.now();
    final diff = expiry.difference(now);

    if (diff.isNegative) return 'Expired';
    if (diff.inMinutes < 60) return 'in ${diff.inMinutes}m';
    if (diff.inHours < 24) return 'in ${diff.inHours}h';
    return 'in ${diff.inDays}d';
  }

  bool _isExpiringSoon(DateTime expiry) {
    final diff = expiry.difference(DateTime.now());
    return diff.inHours < 2;
  }

  String _getCategoryLabel(DecisionCategory category) {
    switch (category) {
      case DecisionCategory.difficulty:
        return 'Difficulty';
      case DecisionCategory.pace:
        return 'Pace';
      case DecisionCategory.topics:
        return 'Topics';
      case DecisionCategory.rewards:
        return 'Rewards';
      case DecisionCategory.breaks:
        return 'Breaks';
      case DecisionCategory.communication:
        return 'Communication';
      case DecisionCategory.assessments:
        return 'Assessments';
      case DecisionCategory.interventions:
        return 'Interventions';
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

/// Status badge for approval request.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final ApprovalStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getStatusColor(status).withValues(alpha: 0.5),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getStatusIcon(status),
            size: 12,
            color: _getStatusColor(status),
          ),
          const SizedBox(width: 4),
          Text(
            _getStatusLabel(status),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: _getStatusColor(status),
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusLabel(ApprovalStatus status) {
    switch (status) {
      case ApprovalStatus.pending:
        return 'Pending';
      case ApprovalStatus.approved:
        return 'Approved';
      case ApprovalStatus.denied:
        return 'Denied';
      case ApprovalStatus.expired:
        return 'Expired';
    }
  }

  IconData _getStatusIcon(ApprovalStatus status) {
    switch (status) {
      case ApprovalStatus.pending:
        return Icons.hourglass_empty;
      case ApprovalStatus.approved:
        return Icons.check_circle;
      case ApprovalStatus.denied:
        return Icons.cancel;
      case ApprovalStatus.expired:
        return Icons.timer_off;
    }
  }

  Color _getStatusColor(ApprovalStatus status) {
    switch (status) {
      case ApprovalStatus.pending:
        return Colors.orange;
      case ApprovalStatus.approved:
        return Colors.green;
      case ApprovalStatus.denied:
        return Colors.red;
      case ApprovalStatus.expired:
        return Colors.grey;
    }
  }
}

/// Empty state for approval queue.
class EmptyApprovalState extends StatelessWidget {
  const EmptyApprovalState({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                size: 40,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'All Caught Up!',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No pending approval requests.\nThe AI is working within your guidelines.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
