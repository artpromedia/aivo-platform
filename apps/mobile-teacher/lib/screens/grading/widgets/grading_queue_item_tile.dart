/// Grading Queue Item Tile Widget
///
/// Tile for displaying a grading queue item.
library;

import 'package:flutter/material.dart';

import '../../../models/rubric.dart';

/// Tile for a grading queue item.
class GradingQueueItemTile extends StatelessWidget {
  const GradingQueueItemTile({
    super.key,
    required this.item,
    this.onTap,
    this.onPriorityChanged,
    this.onSkip,
  });

  final GradingQueueItem item;
  final VoidCallback? onTap;
  final ValueChanged<GradingPriority>? onPriorityChanged;
  final VoidCallback? onSkip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // ignore: unused_local_variable
    final statusColor = _getStatusColor(item.status);
    // ignore: unused_local_variable
    final priorityColor = _getPriorityColor(item.priority);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Student avatar
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Text(
                      _getInitials(item.studentName),
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Student name and assignment
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.studentName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          item.assignmentTitle,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  // Priority badge
                  if (item.priority != GradingPriority.normal)
                    _PriorityBadge(priority: item.priority),
                  // Status badge
                  _StatusBadge(status: item.status),
                ],
              ),
              const SizedBox(height: 12),
              // Info row
              Row(
                children: [
                  // Submitted time
                  Icon(
                    Icons.schedule,
                    size: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatSubmittedTime(item.submittedAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  // Overdue indicator
                  if (item.isOverdue) ...[
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
                            Icons.warning,
                            size: 12,
                            color: Colors.red,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            'Overdue',
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
                  // AI suggestion indicator
                  if (item.hasAISuggestion) ...[
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            size: 12,
                            color: Colors.purple,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            'AI: ${item.aiSuggestedScore?.toStringAsFixed(1)}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Colors.purple,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const Spacer(),
                  // Score if graded
                  if (item.score != null && item.maxScore != null) ...[
                    Text(
                      '${item.score!.toStringAsFixed(1)}/${item.maxScore!.toStringAsFixed(0)}',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: _getScoreColor(item.percentage ?? 0),
                      ),
                    ),
                  ],
                ],
              ),
              // Flags row
              if (item.flags.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: item.flags.map((flag) {
                    return Chip(
                      label: Text(flag),
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      labelStyle: const TextStyle(fontSize: 10),
                      padding: EdgeInsets.zero,
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  String _formatSubmittedTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    }
    return '${time.month}/${time.day}';
  }

  Color _getStatusColor(GradingStatus status) {
    switch (status) {
      case GradingStatus.pending:
        return Colors.orange;
      case GradingStatus.inProgress:
        return Colors.blue;
      case GradingStatus.graded:
        return Colors.green;
      case GradingStatus.returned:
        return Colors.teal;
      case GradingStatus.resubmitted:
        return Colors.purple;
    }
  }

  Color _getPriorityColor(GradingPriority priority) {
    switch (priority) {
      case GradingPriority.low:
        return Colors.grey;
      case GradingPriority.normal:
        return Colors.blue;
      case GradingPriority.high:
        return Colors.orange;
      case GradingPriority.urgent:
        return Colors.red;
    }
  }

  Color _getScoreColor(double percentage) {
    if (percentage >= 90) return Colors.green;
    if (percentage >= 80) return Colors.blue;
    if (percentage >= 70) return Colors.orange;
    if (percentage >= 60) return Colors.deepOrange;
    return Colors.red;
  }
}

/// Status badge.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final GradingStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Color _getStatusColor(GradingStatus status) {
    switch (status) {
      case GradingStatus.pending:
        return Colors.orange;
      case GradingStatus.inProgress:
        return Colors.blue;
      case GradingStatus.graded:
        return Colors.green;
      case GradingStatus.returned:
        return Colors.teal;
      case GradingStatus.resubmitted:
        return Colors.purple;
    }
  }
}

/// Priority badge.
class _PriorityBadge extends StatelessWidget {
  const _PriorityBadge({required this.priority});

  final GradingPriority priority;

  @override
  Widget build(BuildContext context) {
    final color = _getPriorityColor(priority);

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(
          _getPriorityIcon(priority),
          size: 14,
          color: color,
        ),
      ),
    );
  }

  IconData _getPriorityIcon(GradingPriority priority) {
    switch (priority) {
      case GradingPriority.low:
        return Icons.arrow_downward;
      case GradingPriority.normal:
        return Icons.remove;
      case GradingPriority.high:
        return Icons.arrow_upward;
      case GradingPriority.urgent:
        return Icons.priority_high;
    }
  }

  Color _getPriorityColor(GradingPriority priority) {
    switch (priority) {
      case GradingPriority.low:
        return Colors.grey;
      case GradingPriority.normal:
        return Colors.blue;
      case GradingPriority.high:
        return Colors.orange;
      case GradingPriority.urgent:
        return Colors.red;
    }
  }
}

/// Queue statistics card.
class GradingQueueStatsCard extends StatelessWidget {
  const GradingQueueStatsCard({
    super.key,
    required this.stats,
    this.onTap,
  });

  final GradingQueueStats stats;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // ignore: unused_local_variable
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _StatItem(
                value: '${stats.totalPending}',
                label: 'Pending',
                icon: Icons.pending_actions,
                color: Colors.orange,
              ),
              _StatItem(
                value: '${stats.overdueCount}',
                label: 'Overdue',
                icon: Icons.warning,
                color: Colors.red,
              ),
              _StatItem(
                value: '${stats.gradedToday}',
                label: 'Today',
                icon: Icons.check_circle,
                color: Colors.green,
              ),
              _StatItem(
                value: _formatDuration(stats.averageTime),
                label: 'Avg Time',
                icon: Icons.timer,
                color: Colors.blue,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDuration(Duration duration) {
    if (duration.inMinutes < 1) return '<1m';
    if (duration.inMinutes < 60) return '${duration.inMinutes}m';
    return '${duration.inHours}h ${duration.inMinutes % 60}m';
  }
}

/// Single stat item.
class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Expanded(
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
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
