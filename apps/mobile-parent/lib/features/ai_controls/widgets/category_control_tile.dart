/// Category Control Tile Widget
///
/// Tile for controlling autonomy per decision category.
library;

import 'package:flutter/material.dart';

import '../models/ai_autonomy_settings.dart';
import 'autonomy_slider.dart';

/// A tile widget for controlling a specific decision category.
class CategoryControlTile extends StatelessWidget {
  const CategoryControlTile({
    super.key,
    required this.category,
    required this.autonomy,
    required this.onChanged,
    this.expanded = false,
    this.onExpandChanged,
  });

  final DecisionCategory category;
  final CategoryAutonomy autonomy;
  final ValueChanged<CategoryAutonomy> onChanged;
  final bool expanded;
  final ValueChanged<bool>? onExpandChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Header
          InkWell(
            onTap: onExpandChanged != null
                ? () => onExpandChanged!(!expanded)
                : null,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _getCategoryColor(category).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getCategoryIcon(category),
                      color: _getCategoryColor(category),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getCategoryLabel(category),
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          _getCategoryDescription(category),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Switch(
                    value: autonomy.enabled,
                    onChanged: (value) {
                      onChanged(autonomy.copyWith(enabled: value));
                    },
                  ),
                  if (onExpandChanged != null)
                    Icon(
                      expanded ? Icons.expand_less : Icons.expand_more,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                ],
              ),
            ),
          ),
          // Expanded content
          if (expanded)
            Container(
              color: theme.colorScheme.surfaceContainerLowest,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Autonomy Level',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _MiniAutonomySelector(
                    value: autonomy.level,
                    enabled: autonomy.enabled,
                    onChanged: (level) {
                      onChanged(autonomy.copyWith(level: level));
                    },
                  ),
                  if (autonomy.customMessage != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: theme.colorScheme.onPrimaryContainer,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              autonomy.customMessage!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _getCategoryLabel(DecisionCategory category) {
    switch (category) {
      case DecisionCategory.difficulty:
        return 'Difficulty Adjustments';
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
        return 'Assessments';
      case DecisionCategory.interventions:
        return 'Support Interventions';
    }
  }

  String _getCategoryDescription(DecisionCategory category) {
    switch (category) {
      case DecisionCategory.difficulty:
        return 'Adjust content difficulty based on performance';
      case DecisionCategory.pace:
        return 'Control the speed of learning progression';
      case DecisionCategory.topics:
        return 'Choose which topics to focus on';
      case DecisionCategory.rewards:
        return 'Manage rewards, badges, and achievements';
      case DecisionCategory.breaks:
        return 'Suggest breaks and rest periods';
      case DecisionCategory.communication:
        return 'Adjust how the AI communicates';
      case DecisionCategory.assessments:
        return 'Schedule and manage assessments';
      case DecisionCategory.interventions:
        return 'Recommend support measures';
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

/// Mini autonomy level selector.
class _MiniAutonomySelector extends StatelessWidget {
  const _MiniAutonomySelector({
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  final AutonomyLevel value;
  final bool enabled;
  final ValueChanged<AutonomyLevel> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: AutonomyLevel.values.map((level) {
        final isSelected = level == value;

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: level != AutonomyLevel.values.last ? 8 : 0,
            ),
            child: InkWell(
              onTap: enabled ? () => onChanged(level) : null,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? _getLevelColor(level).withValues(alpha: 0.2)
                      : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected
                        ? _getLevelColor(level)
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      _getLevelIcon(level),
                      size: 20,
                      color: enabled
                          ? (isSelected
                              ? _getLevelColor(level)
                              : theme.colorScheme.onSurfaceVariant)
                          : theme.colorScheme.onSurface.withValues(alpha: 0.38),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getLevelLabel(level),
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        color: enabled
                            ? (isSelected
                                ? _getLevelColor(level)
                                : theme.colorScheme.onSurfaceVariant)
                            : theme.colorScheme.onSurface
                                .withValues(alpha: 0.38),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  String _getLevelLabel(AutonomyLevel level) {
    switch (level) {
      case AutonomyLevel.full:
        return 'Full';
      case AutonomyLevel.moderate:
        return 'Mod';
      case AutonomyLevel.limited:
        return 'Ltd';
      case AutonomyLevel.requireApproval:
        return 'Ask';
    }
  }

  IconData _getLevelIcon(AutonomyLevel level) {
    switch (level) {
      case AutonomyLevel.full:
        return Icons.rocket_launch;
      case AutonomyLevel.moderate:
        return Icons.balance;
      case AutonomyLevel.limited:
        return Icons.shield;
      case AutonomyLevel.requireApproval:
        return Icons.lock;
    }
  }

  Color _getLevelColor(AutonomyLevel level) {
    switch (level) {
      case AutonomyLevel.full:
        return Colors.green;
      case AutonomyLevel.moderate:
        return Colors.blue;
      case AutonomyLevel.limited:
        return Colors.orange;
      case AutonomyLevel.requireApproval:
        return Colors.red;
    }
  }
}

/// Compact category list tile for summary views.
class CategoryControlChip extends StatelessWidget {
  const CategoryControlChip({
    super.key,
    required this.category,
    required this.level,
    this.onTap,
  });

  final DecisionCategory category;
  final AutonomyLevel level;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getCategoryIcon(category),
              size: 16,
              color: _getCategoryColor(category),
            ),
            const SizedBox(width: 6),
            Text(
              _getCategoryLabel(category),
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(width: 8),
            AutonomyLevelBadge(level: level, showLabel: false),
          ],
        ),
      ),
    );
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
