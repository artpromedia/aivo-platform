/// Content Engagement List Widget
///
/// List showing engagement by content item.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/analytics.dart';

/// List of content engagement items.
class ContentEngagementList extends StatelessWidget {
  const ContentEngagementList({
    super.key,
    required this.items,
    this.onItemTap,
    this.maxItems,
  });

  final List<ContentEngagement> items;
  final void Function(ContentEngagement)? onItemTap;
  final int? maxItems;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayItems = maxItems != null ? items.take(maxItems!).toList() : items;

    if (displayItems.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(
            'No content engagement data',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: displayItems.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        return ContentEngagementTile(
          content: displayItems[index],
          onTap: onItemTap != null ? () => onItemTap!(displayItems[index]) : null,
        );
      },
    );
  }
}

/// Individual content engagement tile.
class ContentEngagementTile extends StatelessWidget {
  const ContentEngagementTile({
    super.key,
    required this.content,
    this.onTap,
  });

  final ContentEngagement content;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completionPercent = (content.completionRate * 100).round();
    final engagementPercent = (content.avgEngagementScore * 100).round();

    return ListTile(
      onTap: onTap,
      leading: _buildContentIcon(theme),
      title: Text(
        content.contentName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Row(
        children: [
          _buildMetricChip(
            Icons.visibility,
            '${content.viewCount}',
            theme,
          ),
          const SizedBox(width: 8),
          _buildMetricChip(
            Icons.check_circle_outline,
            '$completionPercent%',
            theme,
            color: _getCompletionColor(content.completionRate),
          ),
          const SizedBox(width: 8),
          _buildMetricChip(
            Icons.timer_outlined,
            '${content.avgTimeSpent.round()}m',
            theme,
          ),
        ],
      ),
      trailing: _buildEngagementIndicator(engagementPercent, theme),
    );
  }

  Widget _buildContentIcon(ThemeData theme) {
    final iconData = _getContentTypeIcon(content.contentType);
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        iconData,
        color: theme.colorScheme.primary,
        size: 20,
      ),
    );
  }

  Widget _buildMetricChip(IconData icon, String value, ThemeData theme,
      {Color? color}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: color ?? theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 2),
        Text(
          value,
          style: theme.textTheme.bodySmall?.copyWith(
            color: color ?? theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildEngagementIndicator(int percent, ThemeData theme) {
    final color = _getEngagementColor(percent / 100);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          '$percent%',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          'engagement',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  IconData _getContentTypeIcon(String contentType) {
    switch (contentType.toLowerCase()) {
      case 'video':
        return Icons.play_circle_outline;
      case 'quiz':
        return Icons.quiz_outlined;
      case 'reading':
        return Icons.menu_book_outlined;
      case 'activity':
        return Icons.extension_outlined;
      case 'assignment':
        return Icons.assignment_outlined;
      case 'lesson':
        return Icons.school_outlined;
      default:
        return Icons.article_outlined;
    }
  }

  Color _getCompletionColor(double rate) {
    if (rate >= 0.8) return AivoBrand.success;
    if (rate >= 0.5) return AivoBrand.warning;
    return AivoBrand.error;
  }

  Color _getEngagementColor(double score) {
    if (score >= 0.75) return Colors.blue;
    if (score >= 0.5) return AivoBrand.success;
    if (score >= 0.25) return AivoBrand.warning;
    return AivoBrand.error;
  }
}

/// Compact grid view for content engagement.
class ContentEngagementGrid extends StatelessWidget {
  const ContentEngagementGrid({
    super.key,
    required this.items,
    this.onItemTap,
  });

  final List<ContentEngagement> items;
  final void Function(ContentEngagement)? onItemTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (items.isEmpty) {
      return Center(
        child: Text(
          'No content data',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.5,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        return _ContentEngagementCard(
          content: items[index],
          onTap: onItemTap != null ? () => onItemTap!(items[index]) : null,
        );
      },
    );
  }
}

class _ContentEngagementCard extends StatelessWidget {
  const _ContentEngagementCard({
    required this.content,
    this.onTap,
  });

  final ContentEngagement content;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final engagementScore = content.avgEngagementScore;
    final color = _getEngagementColor(engagementScore);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      content.contentName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${content.viewCount} views',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        '${(content.completionRate * 100).round()}% completed',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${(engagementScore * 100).round()}%',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getEngagementColor(double score) {
    if (score >= 0.75) return Colors.blue;
    if (score >= 0.5) return AivoBrand.success;
    if (score >= 0.25) return AivoBrand.warning;
    return AivoBrand.error;
  }
}
