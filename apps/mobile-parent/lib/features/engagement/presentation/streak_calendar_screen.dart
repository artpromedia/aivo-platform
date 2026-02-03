/// Streak Calendar Screen
///
/// Full screen view of learning streaks and calendar.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/engagement_models.dart';
import '../providers/engagement_provider.dart';
import '../widgets/widgets.dart';

/// Screen showing learning streak calendar and statistics.
class StreakCalendarScreen extends ConsumerWidget {
  const StreakCalendarScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final streakAsync = ref.watch(streakNotifierProvider(childId));
    final milestonesAsync = ref.watch(inProgressMilestonesProvider(childId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Learning Streaks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showGoalSettings(context, ref),
            tooltip: 'Streak Settings',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(streakNotifierProvider(childId));
          ref.invalidate(currentMonthStreakProvider(childId));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Current streak card
            streakAsync.when(
              loading: () => const Card(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (e, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Error: $e'),
                ),
              ),
              data: (streak) => _StreakSummaryCard(streak: streak),
            ),
            const SizedBox(height: 16),

            // Calendar
            StreakCalendar(childId: childId),
            const SizedBox(height: 16),

            // Weekly goal progress
            streakAsync.whenData((streak) {
              return _WeeklyGoalCard(
                weeklyGoal: streak.weeklyGoal,
                weeklyProgress: streak.weeklyProgress,
              );
            }).value ?? const SizedBox.shrink(),
            const SizedBox(height: 16),

            // Milestone progress
            Text(
              'Upcoming Milestones',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            milestonesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Error loading milestones: $e'),
              data: (milestones) {
                if (milestones.isEmpty) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(
                              Icons.emoji_events,
                              size: 48,
                              color: theme.colorScheme.outline,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'All milestones achieved!',
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }
                return Column(
                  children: milestones
                      .take(3)
                      .map((m) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _MilestoneCard(milestone: m),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  void _showGoalSettings(BuildContext context, WidgetRef ref) {
    final streak = ref.read(streakNotifierProvider(childId)).valueOrNull;
    if (streak == null) return;

    showModalBottomSheet(
      context: context,
      builder: (context) => _GoalSettingsSheet(
        childId: childId,
        currentGoal: streak.weeklyGoal,
      ),
    );
  }
}

/// Card showing current streak summary.
class _StreakSummaryCard extends StatelessWidget {
  const _StreakSummaryCard({required this.streak});

  final LearningStreak streak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _StreakStat(
                  value: streak.currentStreak,
                  label: 'Current Streak',
                  icon: Icons.local_fire_department,
                  color: Colors.orange,
                  isHighlighted: true,
                ),
                Container(
                  height: 60,
                  width: 1,
                  color: theme.dividerColor,
                ),
                _StreakStat(
                  value: streak.longestStreak,
                  label: 'Longest Streak',
                  icon: Icons.emoji_events,
                  color: Colors.amber,
                ),
                Container(
                  height: 60,
                  width: 1,
                  color: theme.dividerColor,
                ),
                _StreakStat(
                  value: streak.totalActiveDays,
                  label: 'Total Active',
                  icon: Icons.calendar_today,
                  color: Colors.blue,
                ),
              ],
            ),
            if (streak.currentStreak > 0) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.local_fire_department,
                      color: Colors.orange,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _getStreakMessage(streak.currentStreak),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.orange,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getStreakMessage(int days) {
    if (days >= 30) return 'Amazing! $days day streak!';
    if (days >= 14) return 'Incredible! 2 weeks strong!';
    if (days >= 7) return 'One week streak! Keep going!';
    if (days >= 3) return '$days days in a row!';
    return 'Building momentum!';
  }
}

/// Individual streak stat.
class _StreakStat extends StatelessWidget {
  const _StreakStat({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    this.isHighlighted = false,
  });

  final int value;
  final String label;
  final IconData icon;
  final Color color;
  final bool isHighlighted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Icon(icon, color: color, size: isHighlighted ? 32 : 24),
        const SizedBox(height: 8),
        Text(
          '$value',
          style: (isHighlighted
                  ? theme.textTheme.headlineMedium
                  : theme.textTheme.titleLarge)
              ?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.outline,
          ),
        ),
      ],
    );
  }
}

/// Weekly goal progress card.
class _WeeklyGoalCard extends StatelessWidget {
  const _WeeklyGoalCard({
    required this.weeklyGoal,
    required this.weeklyProgress,
  });

  final int weeklyGoal;
  final int weeklyProgress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = weeklyGoal > 0 ? weeklyProgress / weeklyGoal : 0.0;
    final isComplete = weeklyProgress >= weeklyGoal;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isComplete ? Icons.check_circle : Icons.flag,
                  color: isComplete ? Colors.green : theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Weekly Goal',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  '$weeklyProgress / $weeklyGoal days',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: isComplete ? Colors.green : null,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                minHeight: 12,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation(
                  isComplete ? Colors.green : theme.colorScheme.primary,
                ),
              ),
            ),
            if (isComplete) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.celebration, color: Colors.green, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Weekly goal achieved!',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.green,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Milestone progress card.
class _MilestoneCard extends StatelessWidget {
  const _MilestoneCard({required this.milestone});

  final EngagementMilestone milestone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = milestone.requirement > 0
        ? milestone.progress / milestone.requirement
        : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _getMilestoneColor(milestone.type).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getMilestoneIcon(milestone.type),
                color: _getMilestoneColor(milestone.type),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    milestone.title,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: progress.clamp(0.0, 1.0),
                            minHeight: 6,
                            backgroundColor:
                                theme.colorScheme.surfaceContainerHighest,
                            valueColor: AlwaysStoppedAnimation(
                              _getMilestoneColor(milestone.type),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${milestone.progress}/${milestone.requirement}',
                        style: theme.textTheme.labelSmall,
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

  IconData _getMilestoneIcon(MilestoneType type) {
    switch (type) {
      case MilestoneType.streak:
        return Icons.local_fire_department;
      case MilestoneType.totalMinutes:
        return Icons.timer;
      case MilestoneType.lessonsCompleted:
        return Icons.school;
      case MilestoneType.weeklyGoal:
        return Icons.flag;
      case MilestoneType.subjectsExplored:
        return Icons.explore;
    }
  }

  Color _getMilestoneColor(MilestoneType type) {
    switch (type) {
      case MilestoneType.streak:
        return Colors.orange;
      case MilestoneType.totalMinutes:
        return Colors.blue;
      case MilestoneType.lessonsCompleted:
        return Colors.green;
      case MilestoneType.weeklyGoal:
        return Colors.purple;
      case MilestoneType.subjectsExplored:
        return Colors.teal;
    }
  }
}

/// Bottom sheet for goal settings.
class _GoalSettingsSheet extends ConsumerStatefulWidget {
  const _GoalSettingsSheet({
    required this.childId,
    required this.currentGoal,
  });

  final String childId;
  final int currentGoal;

  @override
  ConsumerState<_GoalSettingsSheet> createState() => _GoalSettingsSheetState();
}

class _GoalSettingsSheetState extends ConsumerState<_GoalSettingsSheet> {
  late int _selectedGoal;

  @override
  void initState() {
    super.initState();
    _selectedGoal = widget.currentGoal;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Weekly Goal',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Set how many days per week you want your child to learn',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [3, 4, 5, 6, 7].map((days) {
              final isSelected = _selectedGoal == days;
              return InkWell(
                onTap: () => setState(() => _selectedGoal = days),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? theme.colorScheme.primaryContainer
                        : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    border: isSelected
                        ? Border.all(color: theme.colorScheme.primary, width: 2)
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$days',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? theme.colorScheme.primary
                              : null,
                        ),
                      ),
                      Text(
                        'days',
                        style: theme.textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                ref
                    .read(streakNotifierProvider(widget.childId).notifier)
                    .updateWeeklyGoal(_selectedGoal);
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Weekly goal updated to $_selectedGoal days'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
              child: const Text('Save Goal'),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
