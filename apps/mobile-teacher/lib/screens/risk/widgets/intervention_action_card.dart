/// Intervention card widget
/// Actionable card for displaying intervention suggestions
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import '../../../models/intervention.dart';
import 'risk_level_badge.dart';

/// Card displaying an intervention with actions
class InterventionActionCard extends StatelessWidget {
  const InterventionActionCard({
    super.key,
    required this.intervention,
    this.onAccept,
    this.onDismiss,
    this.onViewDetails,
    this.showActions = true,
    this.compact = false,
  });

  final Intervention intervention;
  final VoidCallback? onAccept;
  final VoidCallback? onDismiss;
  final VoidCallback? onViewDetails;
  final bool showActions;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final priorityColor = _getPriorityColor(intervention.priority);

    if (compact) {
      return _buildCompactCard(context, theme, priorityColor);
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onViewDetails,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Priority indicator
            Container(
              height: 4,
              color: priorityColor,
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category icon
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: priorityColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _getCategoryIcon(intervention.category),
                          size: 24,
                          color: priorityColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Title and category
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              intervention.title,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                _CategoryChip(category: intervention.category),
                                const SizedBox(width: 8),
                                _PriorityBadge(priority: intervention.priority),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Status indicator
                      _StatusBadge(status: intervention.status),
                    ],
                  ),

                  // Description
                  const SizedBox(height: 12),
                  Text(
                    intervention.description,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),

                  // Target risk factors
                  if (intervention.targetRiskFactors.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: intervention.targetRiskFactors.take(3).map((factor) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            factor,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  // Duration and timing
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 16,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${intervention.estimatedDurationDays} days',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if (intervention.startDate != null) ...[
                        const SizedBox(width: 16),
                        Icon(
                          Icons.event,
                          size: 16,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatDate(intervention.startDate!),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                      if (intervention.isOverdue) ...[
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AivoBrand.error.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.warning_amber,
                                size: 14,
                                color: AivoBrand.error,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Overdue',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AivoBrand.error,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),

                  // Actions
                  if (showActions && intervention.status == InterventionStatus.suggested) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: onDismiss,
                            child: const Text('Dismiss'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: FilledButton.icon(
                            onPressed: onAccept,
                            icon: const Icon(Icons.check, size: 18),
                            label: const Text('Accept'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactCard(
    BuildContext context,
    ThemeData theme,
    Color priorityColor,
  ) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onViewDetails,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: priorityColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getCategoryIcon(intervention.category),
                  size: 20,
                  color: priorityColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      intervention.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        _StatusBadge(
                          status: intervention.status,
                          compact: true,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${intervention.estimatedDurationDays}d',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (intervention.isOverdue)
                const Icon(Icons.warning_amber, color: AivoBrand.error, size: 20)
              else
                Icon(
                  Icons.chevron_right,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getPriorityColor(InterventionPriority priority) {
    switch (priority) {
      case InterventionPriority.urgent:
        return RiskLevelColors.critical;
      case InterventionPriority.high:
        return RiskLevelColors.atRisk;
      case InterventionPriority.medium:
        return RiskLevelColors.watch;
      case InterventionPriority.low:
        return RiskLevelColors.onTrack;
    }
  }

  IconData _getCategoryIcon(InterventionCategory category) {
    switch (category) {
      case InterventionCategory.academic:
        return Icons.school;
      case InterventionCategory.behavioral:
        return Icons.psychology;
      case InterventionCategory.social:
        return Icons.favorite;
      case InterventionCategory.attendance:
        return Icons.calendar_today;
      case InterventionCategory.engagement:
        return Icons.touch_app;
      case InterventionCategory.other:
        return Icons.more_horiz;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}';
  }
}

/// Category chip widget
class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.category});

  final InterventionCategory category;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        category.label,
        style: TextStyle(
          fontSize: 11,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// Priority badge widget
class _PriorityBadge extends StatelessWidget {
  const _PriorityBadge({required this.priority});

  final InterventionPriority priority;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (priority) {
      InterventionPriority.urgent => (RiskLevelColors.critical, 'Urgent'),
      InterventionPriority.high => (RiskLevelColors.atRisk, 'High'),
      InterventionPriority.medium => (RiskLevelColors.watch, 'Medium'),
      InterventionPriority.low => (RiskLevelColors.onTrack, 'Low'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
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
}

/// Status badge widget
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.status,
    this.compact = false,
  });

  final InterventionStatus status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (color, icon, label) = switch (status) {
      InterventionStatus.suggested => (Colors.blue, Icons.lightbulb_outline, 'Suggested'),
      InterventionStatus.planned => (Colors.purple, Icons.schedule, 'Planned'),
      InterventionStatus.inProgress => (AivoBrand.warning, Icons.play_circle, 'In Progress'),
      InterventionStatus.completed => (AivoBrand.success, Icons.check_circle, 'Completed'),
      InterventionStatus.dismissed => (AivoBrand.gray, Icons.cancel, 'Dismissed'),
      InterventionStatus.onHold => (Colors.orange, Icons.pause_circle, 'On Hold'),
    };

    if (compact) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// AI suggestion card with confidence score
class InterventionSuggestionCard extends StatelessWidget {
  const InterventionSuggestionCard({
    super.key,
    required this.suggestion,
    this.onAccept,
    this.onDismiss,
    this.onViewDetails,
  });

  final InterventionSuggestion suggestion;
  final VoidCallback? onAccept;
  final VoidCallback? onDismiss;
  final VoidCallback? onViewDetails;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final template = suggestion.template;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onViewDetails,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI header bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    theme.colorScheme.primary,
                    theme.colorScheme.primary.withOpacity(0.8),
                  ],
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.auto_awesome,
                    size: 16,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI Recommendation',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${(suggestion.relevanceScore * 100).round()}% match',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    template.title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _CategoryChip(category: template.category),
                      const SizedBox(width: 8),
                      Text(
                        '${template.estimatedDurationDays} days',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),

                  // AI reasoning
                  if (suggestion.reasoning.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.psychology,
                            size: 18,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              suggestion.reasoning,
                              style: theme.textTheme.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Matched risk factors
                  if (suggestion.matchedRiskFactors.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Addresses',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: suggestion.matchedRiskFactors.take(4).map((factor) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: RiskLevelColors.atRisk.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: RiskLevelColors.atRisk.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            factor,
                            style: const TextStyle(
                              fontSize: 11,
                              color: RiskLevelColors.atRisk,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  // Expected impact
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _ImpactIndicator(
                        label: 'Effectiveness',
                        value: suggestion.expectedEffectiveness ?? 0.7,
                        color: AivoBrand.success,
                      ),
                      const SizedBox(width: 16),
                      _ImpactIndicator(
                        label: 'Risk Impact',
                        value: suggestion.estimatedImpact ?? 0.15,
                        color: theme.colorScheme.primary,
                      ),
                    ],
                  ),

                  // Actions
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onDismiss,
                          child: const Text('Not Now'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: FilledButton.icon(
                          onPressed: onAccept,
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Create Intervention'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Impact indicator widget
class _ImpactIndicator extends StatelessWidget {
  const _ImpactIndicator({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 60,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: value.clamp(0.0, 1.0),
                  backgroundColor: color.withOpacity(0.1),
                  valueColor: AlwaysStoppedAnimation(color),
                  minHeight: 6,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${(value * 100).round()}%',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
