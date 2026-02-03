/// Adaptation Card Widget
///
/// Card showing what the AI adjusted and why.
library;

import 'package:flutter/material.dart';

import '../models/ai_brain_state.dart';

/// Card displaying an AI adaptation.
class AdaptationCard extends StatelessWidget {
  const AdaptationCard({
    super.key,
    required this.adaptation,
    this.onTap,
    this.compact = false,
  });

  final LearningAdaptation adaptation;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: compact ? _buildCompactContent(theme) : _buildFullContent(theme),
        ),
      ),
    );
  }

  Widget _buildCompactContent(ThemeData theme) {
    return Row(
      children: [
        _buildIcon(theme),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _getAdaptationTitle(adaptation.adaptationType),
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                adaptation.reason,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (adaptation.wasSuccessful)
          Icon(Icons.check_circle, color: Colors.green, size: 20),
        const SizedBox(width: 8),
        Text(
          _formatRelativeTime(adaptation.timestamp),
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildFullContent(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _buildIcon(theme),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _getAdaptationTitle(adaptation.adaptationType),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    _formatRelativeTime(adaptation.timestamp),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (adaptation.wasSuccessful)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check, size: 14, color: Colors.green),
                    const SizedBox(width: 4),
                    Text(
                      'Effective',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.green,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        // Reason in plain language
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
                Icons.lightbulb_outline,
                size: 18,
                color: Colors.amber,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Why this change?',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      adaptation.reason,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (adaptation.previousValue != null && adaptation.newValue != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildValueCard(
                  'Before',
                  adaptation.previousValue!,
                  theme,
                  isOld: true,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Icon(
                  Icons.arrow_forward,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              Expanded(
                child: _buildValueCard(
                  'After',
                  adaptation.newValue!,
                  theme,
                  isOld: false,
                ),
              ),
            ],
          ),
        ],
        if (adaptation.impact != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.trending_up, size: 16, color: Colors.blue),
              const SizedBox(width: 4),
              Text(
                'Impact: ${adaptation.impact}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.blue,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildIcon(ThemeData theme) {
    final iconData = _getAdaptationIcon(adaptation.adaptationType);
    final color = _getAdaptationColor(adaptation.adaptationType);

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(iconData, color: color, size: 20),
    );
  }

  Widget _buildValueCard(String label, String value, ThemeData theme, {required bool isOld}) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isOld
            ? Colors.grey.withValues(alpha: 0.1)
            : Colors.green.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isOld
              ? Colors.grey.withValues(alpha: 0.3)
              : Colors.green.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getAdaptationIcon(AdaptationType type) {
    switch (type) {
      case AdaptationType.difficultyAdjustment:
        return Icons.tune;
      case AdaptationType.contentChange:
        return Icons.library_books;
      case AdaptationType.paceChange:
        return Icons.speed;
      case AdaptationType.approachChange:
        return Icons.route;
      case AdaptationType.scaffoldingAdded:
        return Icons.support;
      case AdaptationType.scaffoldingRemoved:
        return Icons.flight_takeoff;
      case AdaptationType.topicSwitch:
        return Icons.swap_horiz;
      case AdaptationType.breakSuggested:
        return Icons.free_breakfast;
      case AdaptationType.encouragementStyle:
        return Icons.emoji_emotions;
      case AdaptationType.explanationStyle:
        return Icons.description;
    }
  }

  Color _getAdaptationColor(AdaptationType type) {
    switch (type) {
      case AdaptationType.difficultyAdjustment:
        return Colors.orange;
      case AdaptationType.contentChange:
        return Colors.blue;
      case AdaptationType.paceChange:
        return Colors.purple;
      case AdaptationType.approachChange:
        return Colors.teal;
      case AdaptationType.scaffoldingAdded:
      case AdaptationType.scaffoldingRemoved:
        return Colors.green;
      case AdaptationType.topicSwitch:
        return Colors.indigo;
      case AdaptationType.breakSuggested:
        return Colors.brown;
      case AdaptationType.encouragementStyle:
      case AdaptationType.explanationStyle:
        return Colors.pink;
    }
  }

  String _getAdaptationTitle(AdaptationType type) {
    switch (type) {
      case AdaptationType.difficultyAdjustment:
        return 'Difficulty Adjusted';
      case AdaptationType.contentChange:
        return 'Content Changed';
      case AdaptationType.paceChange:
        return 'Pace Adjusted';
      case AdaptationType.approachChange:
        return 'Teaching Approach Changed';
      case AdaptationType.scaffoldingAdded:
        return 'Added Extra Support';
      case AdaptationType.scaffoldingRemoved:
        return 'Removed Training Wheels';
      case AdaptationType.topicSwitch:
        return 'Switched Topics';
      case AdaptationType.breakSuggested:
        return 'Suggested Break';
      case AdaptationType.encouragementStyle:
        return 'Changed Encouragement Style';
      case AdaptationType.explanationStyle:
        return 'Changed Explanation Style';
    }
  }

  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

/// List of adaptation cards.
class AdaptationList extends StatelessWidget {
  const AdaptationList({
    super.key,
    required this.adaptations,
    this.onItemTap,
    this.compact = true,
  });

  final List<LearningAdaptation> adaptations;
  final void Function(LearningAdaptation)? onItemTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (adaptations.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.psychology, size: 48, color: Colors.grey),
              const SizedBox(height: 8),
              Text(
                'No recent adaptations',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
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
      itemCount: adaptations.length,
      itemBuilder: (context, index) {
        return AdaptationCard(
          adaptation: adaptations[index],
          compact: compact,
          onTap: onItemTap != null
              ? () => onItemTap!(adaptations[index])
              : null,
        );
      },
    );
  }
}
