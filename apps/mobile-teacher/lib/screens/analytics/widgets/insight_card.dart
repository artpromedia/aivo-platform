/// Insight Card Widget
///
/// Displays AI-generated insights with actions.
library;

import 'package:flutter/material.dart';

import '../../../models/analytics.dart';

/// Card displaying an analytics insight.
class InsightCard extends StatelessWidget {
  const InsightCard({
    super.key,
    required this.insight,
    this.onTap,
    this.onActionTap,
    this.onDismiss,
    this.showDismiss = false,
    this.compact = false,
  });

  final AnalyticsInsight insight;
  final VoidCallback? onTap;
  final VoidCallback? onActionTap;
  final VoidCallback? onDismiss;
  final bool showDismiss;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final priorityColor = _getPriorityColor(insight.priority);
    final typeIcon = _getTypeIcon(insight.type);

    if (compact) {
      return _buildCompactCard(theme, priorityColor, typeIcon);
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
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
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: priorityColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          typeIcon,
                          color: priorityColor,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    insight.title,
                                    style: theme.textTheme.titleSmall?.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (showDismiss)
                                  IconButton(
                                    icon: const Icon(Icons.close, size: 18),
                                    onPressed: onDismiss,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            _buildPriorityBadge(theme, priorityColor),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    insight.description,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (insight.actionLabel != null) ...[
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.tonal(
                        onPressed: onActionTap,
                        child: Text(insight.actionLabel!),
                      ),
                    ),
                  ],
                  if (insight.relatedStudentIds.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _buildRelatedStudentsChip(theme),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactCard(ThemeData theme, Color priorityColor, IconData icon) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 40,
                decoration: BoxDecoration(
                  color: priorityColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),
              Icon(icon, color: priorityColor, size: 18),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      insight.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      insight.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(ThemeData theme, Color color) {
    final label = insight.priority.name.toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildRelatedStudentsChip(ThemeData theme) {
    final count = insight.relatedStudentIds.length;
    return Row(
      children: [
        Icon(
          Icons.people_outline,
          size: 16,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          '$count student${count > 1 ? 's' : ''} affected',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Color _getPriorityColor(InsightPriority priority) {
    switch (priority) {
      case InsightPriority.critical:
        return Colors.red;
      case InsightPriority.high:
        return Colors.orange;
      case InsightPriority.medium:
        return Colors.amber;
      case InsightPriority.low:
        return Colors.blue;
    }
  }

  IconData _getTypeIcon(InsightType type) {
    switch (type) {
      case InsightType.performance:
        return Icons.trending_up;
      case InsightType.engagement:
        return Icons.visibility;
      case InsightType.attendance:
        return Icons.calendar_today;
      case InsightType.atRisk:
        return Icons.warning;
      case InsightType.achievement:
        return Icons.emoji_events;
      case InsightType.trend:
        return Icons.show_chart;
      case InsightType.recommendation:
        return Icons.lightbulb;
      case InsightType.general:
        return Icons.info;
    }
  }
}

/// List of insight cards.
class InsightsList extends StatelessWidget {
  const InsightsList({
    super.key,
    required this.insights,
    this.title,
    this.maxVisible,
    this.onInsightTap,
    this.onViewAll,
    this.compact = false,
    this.emptyMessage = 'No insights available',
  });

  final List<AnalyticsInsight> insights;
  final String? title;
  final int? maxVisible;
  final void Function(AnalyticsInsight)? onInsightTap;
  final VoidCallback? onViewAll;
  final bool compact;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayInsights = maxVisible != null
        ? insights.take(maxVisible!).toList()
        : insights;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title!,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (onViewAll != null && insights.length > (maxVisible ?? 0))
                TextButton(
                  onPressed: onViewAll,
                  child: const Text('View All'),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (displayInsights.isEmpty)
          _buildEmptyState(theme)
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayInsights.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              return InsightCard(
                insight: displayInsights[index],
                onTap: onInsightTap != null
                    ? () => onInsightTap!(displayInsights[index])
                    : null,
                compact: compact,
              );
            },
          ),
      ],
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.lightbulb_outline,
              size: 40,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              emptyMessage,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Banner-style insight for highlighting important information.
class InsightBanner extends StatelessWidget {
  const InsightBanner({
    super.key,
    required this.insight,
    this.onTap,
    this.onDismiss,
  });

  final AnalyticsInsight insight;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getPriorityColor(insight.priority);

    return Material(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getTypeIcon(insight.type),
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      insight.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (insight.description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        insight.description,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              if (onDismiss != null)
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: onDismiss,
                )
              else
                const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }

  Color _getPriorityColor(InsightPriority priority) {
    switch (priority) {
      case InsightPriority.critical:
        return Colors.red;
      case InsightPriority.high:
        return Colors.orange;
      case InsightPriority.medium:
        return Colors.amber;
      case InsightPriority.low:
        return Colors.blue;
    }
  }

  IconData _getTypeIcon(InsightType type) {
    switch (type) {
      case InsightType.performance:
        return Icons.trending_up;
      case InsightType.engagement:
        return Icons.visibility;
      case InsightType.attendance:
        return Icons.calendar_today;
      case InsightType.atRisk:
        return Icons.warning;
      case InsightType.achievement:
        return Icons.emoji_events;
      case InsightType.trend:
        return Icons.show_chart;
      case InsightType.recommendation:
        return Icons.lightbulb;
      case InsightType.general:
        return Icons.info;
    }
  }
}
