/// Intervention Timeline Widget
///
/// Timeline view of interventions.
library;

import 'package:flutter/material.dart';

import '../models/intervention_history.dart';

/// Timeline showing interventions chronologically.
class InterventionTimeline extends StatelessWidget {
  const InterventionTimeline({
    super.key,
    required this.interventions,
    this.onItemTap,
  });

  final List<InterventionRecord> interventions;
  final void Function(InterventionRecord)? onItemTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (interventions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(Icons.history, size: 48, color: Colors.grey),
              const SizedBox(height: 8),
              Text(
                'No intervention history',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: interventions.length,
      itemBuilder: (context, index) {
        final intervention = interventions[index];
        final isFirst = index == 0;
        final isLast = index == interventions.length - 1;

        return _TimelineItem(
          intervention: intervention,
          isFirst: isFirst,
          isLast: isLast,
          onTap: onItemTap != null ? () => onItemTap!(intervention) : null,
        );
      },
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.intervention,
    required this.isFirst,
    required this.isLast,
    this.onTap,
  });

  final InterventionRecord intervention;
  final bool isFirst;
  final bool isLast;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(intervention.status);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline line and dot
          SizedBox(
            width: 40,
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (!isFirst)
                  Positioned(
                    top: 0,
                    bottom: 20,
                    child: Container(
                      width: 2,
                      color: theme.colorScheme.outlineVariant,
                    ),
                  ),
                if (!isLast)
                  Positioned(
                    top: 20,
                    bottom: 0,
                    child: Container(
                      width: 2,
                      color: theme.colorScheme.outlineVariant,
                    ),
                  ),
                Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: statusColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ],
            ),
          ),
          // Content card
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: InterventionCard(
                intervention: intervention,
                onTap: onTap,
                compact: true,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return Colors.blue;
      case InterventionStatus.completed:
        return Colors.green;
      case InterventionStatus.paused:
        return Colors.orange;
      case InterventionStatus.discontinued:
        return Colors.grey;
      case InterventionStatus.pending:
        return Colors.purple;
    }
  }
}

/// Card showing an intervention.
class InterventionCard extends StatelessWidget {
  const InterventionCard({
    super.key,
    required this.intervention,
    this.onTap,
    this.compact = false,
  });

  final InterventionRecord intervention;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // ignore: unused_local_variable
    final statusColor = _getStatusColor(intervention.status);
    final categoryColor = _getCategoryColor(intervention.category);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Type icon
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: categoryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getCategoryIcon(intervention.category),
                      color: categoryColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Title and type
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          intervention.title,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: compact ? 1 : 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _getTypeLabel(intervention.type),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Status badge
                  _StatusBadge(status: intervention.status),
                ],
              ),
              if (!compact) ...[
                const SizedBox(height: 12),
                Text(
                  intervention.description,
                  style: theme.textTheme.bodyMedium,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              // Date info
              Row(
                children: [
                  Icon(
                    Icons.calendar_today,
                    size: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Started ${_formatDate(intervention.startDate)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (intervention.endDate != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      '- ${_formatDate(intervention.endDate!)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (intervention.outcome != null)
                    OutcomeBadge(outcome: intervention.outcome!),
                ],
              ),
              if (!compact && intervention.goals.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: intervention.goals.take(3).map((goal) {
                    return Chip(
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      label: Text(goal, style: const TextStyle(fontSize: 10)),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
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

  Color _getStatusColor(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return Colors.blue;
      case InterventionStatus.completed:
        return Colors.green;
      case InterventionStatus.paused:
        return Colors.orange;
      case InterventionStatus.discontinued:
        return Colors.grey;
      case InterventionStatus.pending:
        return Colors.purple;
    }
  }

  Color _getCategoryColor(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Colors.blue;
      case InterventionCategory.behavioral:
        return Colors.orange;
      case InterventionCategory.social:
        return Colors.green;
      case InterventionCategory.accessibility:
        return Colors.purple;
      case InterventionCategory.engagement:
        return Colors.teal;
      case InterventionCategory.motivation:
        return Colors.pink;
    }
  }

  IconData _getCategoryIcon(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Icons.school;
      case InterventionCategory.behavioral:
        return Icons.psychology;
      case InterventionCategory.social:
        return Icons.people;
      case InterventionCategory.accessibility:
        return Icons.accessibility;
      case InterventionCategory.engagement:
        return Icons.trending_up;
      case InterventionCategory.motivation:
        return Icons.emoji_events;
    }
  }

  String _getTypeLabel(InterventionType type) {
    switch (type) {
      case InterventionType.aiAdaptive:
        return 'AI-Powered Support';
      case InterventionType.teacherRecommended:
        return 'Teacher Recommendation';
      case InterventionType.systemGenerated:
        return 'Automated Support';
      case InterventionType.parentRequested:
        return 'Parent Request';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

/// Badge showing intervention status.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final InterventionStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor(status);
    final label = _getStatusLabel(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getStatusColor(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return Colors.blue;
      case InterventionStatus.completed:
        return Colors.green;
      case InterventionStatus.paused:
        return Colors.orange;
      case InterventionStatus.discontinued:
        return Colors.grey;
      case InterventionStatus.pending:
        return Colors.purple;
    }
  }

  String _getStatusLabel(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.active:
        return 'Active';
      case InterventionStatus.completed:
        return 'Completed';
      case InterventionStatus.paused:
        return 'Paused';
      case InterventionStatus.discontinued:
        return 'Ended';
      case InterventionStatus.pending:
        return 'Pending';
    }
  }
}

/// Badge showing intervention outcome.
class OutcomeBadge extends StatelessWidget {
  const OutcomeBadge({
    super.key,
    required this.outcome,
  });

  final InterventionOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final color = _getSuccessColor(outcome.successLevel);
    final icon = _getSuccessIcon(outcome.successLevel);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            _getSuccessLabel(outcome.successLevel),
            style: TextStyle(
              fontSize: 10,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getSuccessColor(SuccessLevel level) {
    switch (level) {
      case SuccessLevel.notYetMeasured:
        return Colors.grey;
      case SuccessLevel.minimal:
        return Colors.red;
      case SuccessLevel.partial:
        return Colors.orange;
      case SuccessLevel.significant:
        return Colors.blue;
      case SuccessLevel.full:
        return Colors.green;
    }
  }

  IconData _getSuccessIcon(SuccessLevel level) {
    switch (level) {
      case SuccessLevel.notYetMeasured:
        return Icons.hourglass_empty;
      case SuccessLevel.minimal:
        return Icons.sentiment_dissatisfied;
      case SuccessLevel.partial:
        return Icons.sentiment_neutral;
      case SuccessLevel.significant:
        return Icons.sentiment_satisfied;
      case SuccessLevel.full:
        return Icons.sentiment_very_satisfied;
    }
  }

  String _getSuccessLabel(SuccessLevel level) {
    switch (level) {
      case SuccessLevel.notYetMeasured:
        return 'Pending';
      case SuccessLevel.minimal:
        return 'Minimal';
      case SuccessLevel.partial:
        return 'Partial';
      case SuccessLevel.significant:
        return 'Good';
      case SuccessLevel.full:
        return 'Successful';
    }
  }
}
