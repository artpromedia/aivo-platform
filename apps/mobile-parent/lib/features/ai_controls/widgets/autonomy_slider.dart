/// Autonomy Slider Widget
///
/// Slider for selecting AI autonomy level.
library;

import 'package:flutter/material.dart';

import '../models/ai_autonomy_settings.dart';

/// A slider widget for selecting AI autonomy level.
class AutonomySlider extends StatelessWidget {
  const AutonomySlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final AutonomyLevel value;
  final ValueChanged<AutonomyLevel> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final levels = AutonomyLevel.values;
    final currentIndex = levels.indexOf(value);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Level indicator
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: levels.map((level) {
            final isSelected = level == value;
            return Expanded(
              child: GestureDetector(
                onTap: enabled ? () => onChanged(level) : null,
                child: Column(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected
                            ? _getLevelColor(level)
                            : theme.colorScheme.surfaceContainerHighest,
                        border: Border.all(
                          color: isSelected
                              ? _getLevelColor(level)
                              : theme.colorScheme.outline.withValues(alpha: 0.5),
                          width: 2,
                        ),
                      ),
                      child: isSelected
                          ? Icon(
                              _getLevelIcon(level),
                              size: 14,
                              color: Colors.white,
                            )
                          : null,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getLevelLabel(level),
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected
                            ? _getLevelColor(level)
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        // Slider
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 8,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 12),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 24),
            activeTrackColor: _getLevelColor(value),
            inactiveTrackColor: theme.colorScheme.surfaceContainerHighest,
            thumbColor: _getLevelColor(value),
          ),
          child: Slider(
            value: currentIndex.toDouble(),
            min: 0,
            max: (levels.length - 1).toDouble(),
            divisions: levels.length - 1,
            onChanged: enabled
                ? (newValue) {
                    onChanged(levels[newValue.round()]);
                  }
                : null,
          ),
        ),
        const SizedBox(height: 8),
        // Description
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: _getLevelColor(value).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _getLevelColor(value).withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                _getLevelIcon(value),
                color: _getLevelColor(value),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getLevelLabel(value),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: _getLevelColor(value),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _getLevelDescription(value),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _getLevelLabel(AutonomyLevel level) {
    switch (level) {
      case AutonomyLevel.full:
        return 'Full';
      case AutonomyLevel.moderate:
        return 'Moderate';
      case AutonomyLevel.limited:
        return 'Limited';
      case AutonomyLevel.requireApproval:
        return 'Approval';
    }
  }

  String _getLevelDescription(AutonomyLevel level) {
    switch (level) {
      case AutonomyLevel.full:
        return 'AI makes decisions independently to optimize learning';
      case AutonomyLevel.moderate:
        return 'AI operates with oversight, notifying you of major changes';
      case AutonomyLevel.limited:
        return 'AI has limited control, requesting approval for most changes';
      case AutonomyLevel.requireApproval:
        return 'All AI decisions require your approval before taking effect';
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

/// Compact autonomy level indicator.
class AutonomyLevelBadge extends StatelessWidget {
  const AutonomyLevelBadge({
    super.key,
    required this.level,
    this.showLabel = true,
  });

  final AutonomyLevel level;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getLevelColor(level).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getLevelColor(level).withValues(alpha: 0.5),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getLevelIcon(level),
            size: 14,
            color: _getLevelColor(level),
          ),
          if (showLabel) ...[
            const SizedBox(width: 4),
            Text(
              _getLevelLabel(level),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _getLevelColor(level),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _getLevelLabel(AutonomyLevel level) {
    switch (level) {
      case AutonomyLevel.full:
        return 'Full';
      case AutonomyLevel.moderate:
        return 'Moderate';
      case AutonomyLevel.limited:
        return 'Limited';
      case AutonomyLevel.requireApproval:
        return 'Approval';
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
