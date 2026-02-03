/// Preset Selector Widget
///
/// Widget for selecting autonomy presets.
library;

import 'package:flutter/material.dart';

import '../models/ai_autonomy_settings.dart';

/// A widget for selecting from predefined autonomy presets.
class PresetSelector extends StatelessWidget {
  const PresetSelector({
    super.key,
    required this.presets,
    required this.currentLevel,
    required this.onPresetSelected,
    this.selectedPresetId,
  });

  final List<AutonomyPreset> presets;
  final AutonomyLevel currentLevel;
  final ValueChanged<AutonomyPreset> onPresetSelected;
  final String? selectedPresetId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Setup',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Choose a preset to quickly configure AI autonomy',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: presets.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final preset = presets[index];
            final isSelected = preset.id == selectedPresetId;

            return PresetCard(
              preset: preset,
              isSelected: isSelected,
              onTap: () => onPresetSelected(preset),
            );
          },
        ),
      ],
    );
  }
}

/// A card for displaying a single preset.
class PresetCard extends StatelessWidget {
  const PresetCard({
    super.key,
    required this.preset,
    required this.isSelected,
    required this.onTap,
  });

  final AutonomyPreset preset;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getLevelColor(preset.defaultLevel);

    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? color : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getPresetIcon(preset),
                  color: color,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          preset.name,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (preset.isRecommended) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.amber.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.star,
                                  size: 10,
                                  color: Colors.amber.shade700,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  'Recommended',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.amber.shade700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      preset.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: preset.categoryLevels.entries
                          .take(4)
                          .map((entry) => _CategoryLevelChip(
                                category: entry.key,
                                level: entry.value,
                              ))
                          .toList(),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.white,
                    size: 16,
                  ),
                )
              else
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: theme.colorScheme.outline,
                      width: 2,
                    ),
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getPresetIcon(AutonomyPreset preset) {
    switch (preset.icon) {
      case IconType.shield:
        return Icons.shield;
      case IconType.balance:
        return Icons.balance;
      case IconType.rocket:
        return Icons.rocket_launch;
      case IconType.lock:
        return Icons.lock;
      case null:
        return _getLevelIcon(preset.defaultLevel);
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

/// Compact category-level chip.
class _CategoryLevelChip extends StatelessWidget {
  const _CategoryLevelChip({
    required this.category,
    required this.level,
  });

  final DecisionCategory category;
  final AutonomyLevel level;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getCategoryIcon(category),
            size: 10,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 2),
          Icon(
            _getLevelIcon(level),
            size: 10,
            color: _getLevelColor(level),
          ),
        ],
      ),
    );
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

/// Quick preset chips for inline selection.
class PresetQuickChips extends StatelessWidget {
  const PresetQuickChips({
    super.key,
    required this.presets,
    required this.onPresetSelected,
    this.selectedPresetId,
  });

  final List<AutonomyPreset> presets;
  final ValueChanged<AutonomyPreset> onPresetSelected;
  final String? selectedPresetId;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: presets.map((preset) {
          final isSelected = preset.id == selectedPresetId;
          final color = _getLevelColor(preset.defaultLevel);

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(preset.name),
              selected: isSelected,
              onSelected: (_) => onPresetSelected(preset),
              avatar: Icon(
                _getLevelIcon(preset.defaultLevel),
                size: 16,
                color: isSelected ? Colors.white : color,
              ),
              selectedColor: color,
            ),
          );
        }).toList(),
      ),
    );
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
