/// IEP Reports Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen for IEP progress reports.
class IepReportsScreen extends ConsumerStatefulWidget {
  const IepReportsScreen({super.key});

  @override
  ConsumerState<IepReportsScreen> createState() => _IepReportsScreenState();
}

class _IepReportsScreenState extends ConsumerState<IepReportsScreen> {
  DateRange _selectedRange = DateRange(
    start: DateTime.now().subtract(const Duration(days: 30)),
    end: DateTime.now(),
  );

  @override
  void initState() {
    super.initState();
    ref.read(iepProvider.notifier).loadAllGoals();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(iepProvider);
    final goalsAtRiskAsync = ref.watch(goalsAtRiskProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('IEP Progress'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Date range chip
          Chip(
            label: Text(
              '${DateFormat('MMM d').format(_selectedRange.start)} - ${DateFormat('MMM d').format(_selectedRange.end)}',
            ),
            onDeleted: _selectDateRange,
            deleteIcon: const Icon(Icons.edit, size: 16),
          ),
          const SizedBox(height: 16),

          // Summary card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Goals Overview',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _StatItem(
                          label: 'Total Goals',
                          value: '${state.goals.length}',
                          color: Colors.blue,
                        ),
                      ),
                      Expanded(
                        child: _StatItem(
                          label: 'On Track',
                          value: '${state.goals.where((g) => g.isOnTrack).length}',
                          color: Colors.green,
                        ),
                      ),
                      Expanded(
                        child: goalsAtRiskAsync.when(
                          data: (goals) => _StatItem(
                            label: 'At Risk',
                            value: '${goals.length}',
                            color: Colors.red,
                          ),
                          loading: () => const _StatItem(
                            label: 'At Risk',
                            value: '-',
                            color: Colors.red,
                          ),
                          error: (_, __) => const _StatItem(
                            label: 'At Risk',
                            value: '?',
                            color: Colors.red,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Goals at risk section
          goalsAtRiskAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Error: $e'),
            data: (goalsAtRisk) {
              if (goalsAtRisk.isEmpty) {
                return Card(
                  color: Colors.green.shade50,
                  child: const Padding(
                    padding: EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green),
                        SizedBox(width: 12),
                        Text('All goals are on track!'),
                      ],
                    ),
                  ),
                );
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Goals At Risk',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  ...goalsAtRisk.map((goal) => _GoalRiskCard(goal: goal)),
                ],
              );
            },
          ),

          const SizedBox(height: 16),

          // Progress by category
          Text(
            'Progress by Category',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...GoalCategory.values.map((category) {
            final categoryGoals = state.goals.where((g) => g.category == category).toList();
            if (categoryGoals.isEmpty) return const SizedBox.shrink();

            final avgProgress = categoryGoals.fold<double>(
              0,
              (sum, g) => sum + (g.currentValue / g.targetValue),
            ) / categoryGoals.length;

            return _CategoryProgressTile(
              category: category,
              goalCount: categoryGoals.length,
              progress: avgProgress,
            );
          }),
        ],
      ),
    );
  }

  void _selectDateRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(
        start: _selectedRange.start,
        end: _selectedRange.end,
      ),
    );

    if (range != null) {
      setState(() {
        _selectedRange = DateRange(start: range.start, end: range.end);
      });
    }
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _GoalRiskCard extends StatelessWidget {
  const _GoalRiskCard({required this.goal});

  final IepGoal goal;

  @override
  Widget build(BuildContext context) {
    final progress = goal.currentValue / goal.targetValue;

    return Card(
      color: Colors.red.shade50,
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.red.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    goal.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: progress.clamp(0, 1),
              backgroundColor: Colors.red.shade100,
              color: Colors.red,
            ),
            const SizedBox(height: 4),
            Text(
              '${(progress * 100).round()}% complete • Target: ${DateFormat('MMM d').format(goal.targetDate)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryProgressTile extends StatelessWidget {
  const _CategoryProgressTile({
    required this.category,
    required this.goalCount,
    required this.progress,
  });

  final GoalCategory category;
  final int goalCount;
  final double progress;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(_iconForCategory(category), color: Colors.blue),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.name,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  Text(
                    '$goalCount goal${goalCount == 1 ? '' : 's'}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 100,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${(progress * 100).round()}%',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _progressColor(progress),
                    ),
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: progress.clamp(0, 1),
                    backgroundColor: Colors.grey.shade200,
                    color: _progressColor(progress),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForCategory(GoalCategory category) {
    switch (category) {
      case GoalCategory.reading: return Icons.menu_book;
      case GoalCategory.math: return Icons.calculate;
      case GoalCategory.writing: return Icons.edit;
      case GoalCategory.behavior: return Icons.psychology;
      case GoalCategory.socialEmotional: return Icons.favorite;
      case GoalCategory.speech: return Icons.record_voice_over;
      case GoalCategory.occupationalTherapy: return Icons.accessibility;
      case GoalCategory.physicalTherapy: return Icons.directions_run;
      case GoalCategory.other: return Icons.category;
    }
  }

  Color _progressColor(double progress) {
    if (progress >= 0.8) return Colors.green;
    if (progress >= 0.5) return Colors.orange;
    return Colors.red;
  }
}
