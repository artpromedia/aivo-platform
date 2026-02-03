/// Performance Level Tile Widget
///
/// Tile for selecting a performance level during grading.
library;

import 'package:flutter/material.dart';

import '../../../models/rubric.dart';

/// Tile for selecting a performance level.
class PerformanceLevelTile extends StatelessWidget {
  const PerformanceLevelTile({
    super.key,
    required this.level,
    this.isSelected = false,
    this.isAISuggested = false,
    this.onTap,
  });

  final PerformanceLevel level;
  final bool isSelected;
  final bool isAISuggested;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getLevelColor(level.points, 4);

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
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: isSelected
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      color.withValues(alpha: 0.1),
                      color.withValues(alpha: 0.05),
                    ],
                  )
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isSelected ? color : theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        level.points.toStringAsFixed(
                          level.points.truncateToDouble() == level.points ? 0 : 1,
                        ),
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : color,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      level.label,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isSelected ? color : null,
                      ),
                    ),
                  ),
                  if (isAISuggested)
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
                            'AI',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Colors.purple,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (isSelected)
                    Icon(
                      Icons.check_circle,
                      color: color,
                      size: 20,
                    ),
                ],
              ),
              if (level.description.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  level.description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getLevelColor(double points, double maxPoints) {
    final ratio = points / maxPoints;
    if (ratio >= 0.9) return Colors.green;
    if (ratio >= 0.7) return Colors.blue;
    if (ratio >= 0.5) return Colors.orange;
    if (ratio >= 0.25) return Colors.deepOrange;
    return Colors.red;
  }
}

/// Grid of performance levels for selection.
class PerformanceLevelGrid extends StatelessWidget {
  const PerformanceLevelGrid({
    super.key,
    required this.levels,
    required this.selectedLevelId,
    this.aiSuggestedLevelId,
    required this.onLevelSelected,
  });

  final List<PerformanceLevel> levels;
  final String? selectedLevelId;
  final String? aiSuggestedLevelId;
  final ValueChanged<PerformanceLevel> onLevelSelected;

  @override
  Widget build(BuildContext context) {
    // Sort levels by points descending
    final sortedLevels = List<PerformanceLevel>.from(levels)
      ..sort((a, b) => b.points.compareTo(a.points));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: sortedLevels.map((level) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: PerformanceLevelTile(
            level: level,
            isSelected: level.id == selectedLevelId,
            isAISuggested: level.id == aiSuggestedLevelId,
            onTap: () => onLevelSelected(level),
          ),
        );
      }).toList(),
    );
  }
}

/// Compact horizontal level selector.
class LevelQuickSelector extends StatelessWidget {
  const LevelQuickSelector({
    super.key,
    required this.levels,
    required this.selectedLevelId,
    required this.onLevelSelected,
  });

  final List<PerformanceLevel> levels;
  final String? selectedLevelId;
  final ValueChanged<PerformanceLevel> onLevelSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sortedLevels = List<PerformanceLevel>.from(levels)
      ..sort((a, b) => b.points.compareTo(a.points));
    final maxPoints = sortedLevels.isEmpty ? 1.0 : sortedLevels.first.points;

    return Row(
      children: sortedLevels.map((level) {
        final isSelected = level.id == selectedLevelId;
        final color = _getLevelColor(level.points, maxPoints);

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: level != sortedLevels.last ? 4 : 0,
            ),
            child: InkWell(
              onTap: () => onLevelSelected(level),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 8,
                  horizontal: 4,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? color : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? color : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      level.points.toStringAsFixed(
                        level.points.truncateToDouble() == level.points ? 0 : 1,
                      ),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : color,
                      ),
                    ),
                    Text(
                      level.label,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.9)
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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

  Color _getLevelColor(double points, double maxPoints) {
    final ratio = points / maxPoints;
    if (ratio >= 0.9) return Colors.green;
    if (ratio >= 0.7) return Colors.blue;
    if (ratio >= 0.5) return Colors.orange;
    if (ratio >= 0.25) return Colors.deepOrange;
    return Colors.red;
  }
}
