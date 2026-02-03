/// Learning Path Tree Widget
///
/// Visual node tree showing learning progression.
library;

import 'package:flutter/material.dart';

import '../models/ai_brain_state.dart';

/// Visual tree showing learning path nodes.
class LearningPathTree extends StatelessWidget {
  const LearningPathTree({
    super.key,
    required this.path,
    this.onNodeTap,
    this.horizontal = false,
  });

  final LearningPath path;
  final void Function(LearningPathNode)? onNodeTap;
  final bool horizontal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (path.nodes.isEmpty) {
      return Center(
        child: Text(
          'No learning path available',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    if (horizontal) {
      return SizedBox(
        height: 160,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: path.nodes.length,
          itemBuilder: (context, index) {
            return Row(
              children: [
                _LearningPathNodeCard(
                  node: path.nodes[index],
                  isCurrent: index == path.currentNodeIndex,
                  onTap: onNodeTap != null
                      ? () => onNodeTap!(path.nodes[index])
                      : null,
                ),
                if (index < path.nodes.length - 1)
                  _ConnectionLine(horizontal: true),
              ],
            );
          },
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: path.nodes.length,
      itemBuilder: (context, index) {
        return Column(
          children: [
            _LearningPathNodeCard(
              node: path.nodes[index],
              isCurrent: index == path.currentNodeIndex,
              onTap: onNodeTap != null
                  ? () => onNodeTap!(path.nodes[index])
                  : null,
            ),
            if (index < path.nodes.length - 1)
              _ConnectionLine(horizontal: false),
          ],
        );
      },
    );
  }
}

/// Individual node card in the learning path.
class _LearningPathNodeCard extends StatelessWidget {
  const _LearningPathNodeCard({
    required this.node,
    required this.isCurrent,
    this.onTap,
  });

  final LearningPathNode node;
  final bool isCurrent;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(node.status);
    final isLocked = node.status == NodeStatus.locked;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isCurrent
            ? BorderSide(color: theme.colorScheme.primary, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: isLocked ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Opacity(
          opacity: isLocked ? 0.5 : 1.0,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Status indicator
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(color: statusColor, width: 2),
                  ),
                  child: Center(
                    child: Icon(
                      _getStatusIcon(node.status),
                      color: statusColor,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              node.topic,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (isCurrent)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Current',
                                style: TextStyle(
                                  color: theme.colorScheme.onPrimary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _StatusChip(status: node.status),
                          if (node.estimatedMinutes != null) ...[
                            const SizedBox(width: 8),
                            Icon(
                              Icons.timer_outlined,
                              size: 14,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              '${node.estimatedMinutes} min',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (node.masteryLevel != null) ...[
                        const SizedBox(height: 8),
                        _MasteryBar(level: node.masteryLevel!),
                      ],
                    ],
                  ),
                ),
                if (!isLocked)
                  Icon(
                    Icons.chevron_right,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(NodeStatus status) {
    switch (status) {
      case NodeStatus.locked:
        return Colors.grey;
      case NodeStatus.available:
        return Colors.blue;
      case NodeStatus.inProgress:
        return Colors.orange;
      case NodeStatus.completed:
        return Colors.green;
      case NodeStatus.mastered:
        return Colors.purple;
      case NodeStatus.needsReview:
        return Colors.amber;
    }
  }

  IconData _getStatusIcon(NodeStatus status) {
    switch (status) {
      case NodeStatus.locked:
        return Icons.lock;
      case NodeStatus.available:
        return Icons.play_arrow;
      case NodeStatus.inProgress:
        return Icons.pending;
      case NodeStatus.completed:
        return Icons.check;
      case NodeStatus.mastered:
        return Icons.star;
      case NodeStatus.needsReview:
        return Icons.refresh;
    }
  }
}

/// Status chip for node status.
class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final NodeStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor(status);
    final label = _getStatusLabel(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getStatusColor(NodeStatus status) {
    switch (status) {
      case NodeStatus.locked:
        return Colors.grey;
      case NodeStatus.available:
        return Colors.blue;
      case NodeStatus.inProgress:
        return Colors.orange;
      case NodeStatus.completed:
        return Colors.green;
      case NodeStatus.mastered:
        return Colors.purple;
      case NodeStatus.needsReview:
        return Colors.amber;
    }
  }

  String _getStatusLabel(NodeStatus status) {
    switch (status) {
      case NodeStatus.locked:
        return 'Locked';
      case NodeStatus.available:
        return 'Ready';
      case NodeStatus.inProgress:
        return 'In Progress';
      case NodeStatus.completed:
        return 'Completed';
      case NodeStatus.mastered:
        return 'Mastered';
      case NodeStatus.needsReview:
        return 'Needs Review';
    }
  }
}

/// Mastery progress bar.
class _MasteryBar extends StatelessWidget {
  const _MasteryBar({required this.level});

  final double level;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Text(
          'Mastery',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: level,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(_getMasteryColor(level)),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${(level * 100).round()}%',
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Color _getMasteryColor(double level) {
    if (level >= 0.9) return Colors.purple;
    if (level >= 0.7) return Colors.green;
    if (level >= 0.5) return Colors.blue;
    if (level >= 0.3) return Colors.orange;
    return Colors.red;
  }
}

/// Connection line between nodes.
class _ConnectionLine extends StatelessWidget {
  const _ConnectionLine({required this.horizontal});

  final bool horizontal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (horizontal) {
      return Container(
        width: 24,
        height: 2,
        color: theme.colorScheme.outlineVariant,
      );
    }

    return Container(
      width: 2,
      height: 24,
      margin: const EdgeInsets.only(left: 35),
      color: theme.colorScheme.outlineVariant,
    );
  }
}
