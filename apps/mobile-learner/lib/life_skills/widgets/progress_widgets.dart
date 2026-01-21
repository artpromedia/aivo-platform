/// Progress Widgets
/// 
/// Widgets for displaying learner progress in life skills.

import 'package:flutter/material.dart';
import '../life_skills_models.dart';

/// Progress Summary Card - overview of learner's life skills progress
class ProgressSummaryCard extends StatelessWidget {
  final int skillsInProgress;
  final int skillsAchieved;
  final double averageMastery;
  final int currentStreak;
  final int totalMinutes;

  const ProgressSummaryCard({
    super.key,
    required this.skillsInProgress,
    required this.skillsAchieved,
    required this.averageMastery,
    required this.currentStreak,
    required this.totalMinutes,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.emoji_events,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Your Progress',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Stats row
            Row(
              children: [
                _StatItem(
                  icon: Icons.stars,
                  value: skillsAchieved.toString(),
                  label: 'Mastered',
                  color: Colors.amber,
                ),
                _StatItem(
                  icon: Icons.trending_up,
                  value: skillsInProgress.toString(),
                  label: 'In Progress',
                  color: Colors.blue,
                ),
                _StatItem(
                  icon: Icons.local_fire_department,
                  value: '$currentStreak',
                  label: 'Day Streak',
                  color: Colors.orange,
                ),
                _StatItem(
                  icon: Icons.timer,
                  value: '${(totalMinutes / 60).floor()}h',
                  label: 'Practice',
                  color: Colors.purple,
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Mastery progress bar
            Row(
              children: [
                Text(
                  'Overall Mastery',
                  style: theme.textTheme.bodySmall,
                ),
                const Spacer(),
                Text(
                  '${(averageMastery * 100).round()}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: averageMastery,
                minHeight: 8,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation(_getMasteryColor(averageMastery)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getMasteryColor(double mastery) {
    if (mastery >= 0.8) return Colors.green;
    if (mastery >= 0.5) return Colors.orange;
    return Colors.blue;
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// Category Progress Card - shows progress for a skill category
class CategoryProgressCard extends StatelessWidget {
  final SkillCategory category;
  final int skillCount;
  final double averageMastery;
  final VoidCallback? onTap;

  const CategoryProgressCard({
    super.key,
    required this.category,
    required this.skillCount,
    required this.averageMastery,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Category icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    category.icon,
                    style: const TextStyle(fontSize: 24),
                  ),
                ),
              ),
              const SizedBox(width: 16),

              // Category info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.displayName,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$skillCount skills',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),

              // Mastery indicator
              SizedBox(
                width: 48,
                height: 48,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: averageMastery,
                      backgroundColor: theme.colorScheme.surfaceContainerHighest,
                      valueColor: AlwaysStoppedAnimation(_getMasteryColor(averageMastery)),
                      strokeWidth: 4,
                    ),
                    Text(
                      '${(averageMastery * 100).round()}%',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }

  Color _getMasteryColor(double mastery) {
    if (mastery >= 0.8) return Colors.green;
    if (mastery >= 0.5) return Colors.orange;
    return Colors.blue;
  }
}

/// Step List Tile - shows a step in a skill's task analysis
class StepListTile extends StatelessWidget {
  final SkillStep step;
  final int stepNumber;
  final int totalSteps;
  final StepProgress? progress;

  const StepListTile({
    super.key,
    required this.step,
    required this.stepNumber,
    required this.totalSteps,
    this.progress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCompleted = progress?.isAcquired ?? false;
    final isInProgress = progress != null && !progress!.isAcquired;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Step indicator
          Column(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? Colors.green
                      : isInProgress
                          ? theme.colorScheme.primary
                          : theme.colorScheme.surfaceContainerHighest,
                  shape: BoxShape.circle,
                  border: isInProgress
                      ? Border.all(color: theme.colorScheme.primary, width: 2)
                      : null,
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.check, color: Colors.white, size: 18)
                      : Text(
                          '$stepNumber',
                          style: TextStyle(
                            color: isInProgress
                                ? theme.colorScheme.onPrimary
                                : theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              if (stepNumber < totalSteps)
                Container(
                  width: 2,
                  height: 40,
                  color: isCompleted
                      ? Colors.green.withOpacity(0.3)
                      : theme.colorScheme.surfaceContainerHighest,
                ),
            ],
          ),
          const SizedBox(width: 12),

          // Step content
          Expanded(
            child: Card(
              elevation: isInProgress ? 2 : 0,
              color: isInProgress
                  ? theme.colorScheme.primaryContainer.withOpacity(0.5)
                  : null,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      step.instruction,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        decoration: isCompleted ? TextDecoration.lineThrough : null,
                        color: isCompleted
                            ? theme.colorScheme.onSurface.withOpacity(0.6)
                            : null,
                      ),
                    ),
                    if (step.detailedPrompt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        step.detailedPrompt!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.7),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (progress != null && progress!.totalAttempts > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.replay,
                            size: 14,
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${progress!.totalAttempts} attempts',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.5),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Icon(
                            Icons.trending_up,
                            size: 14,
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${progress!.successfulAttempts} successful',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.5),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
