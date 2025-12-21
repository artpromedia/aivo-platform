/// Student IEP Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen showing student's IEP goals and progress.
class StudentIepScreen extends ConsumerStatefulWidget {
  const StudentIepScreen({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<StudentIepScreen> createState() => _StudentIepScreenState();
}

class _StudentIepScreenState extends ConsumerState<StudentIepScreen> {
  GoalCategory? _categoryFilter;

  @override
  Widget build(BuildContext context) {
    final goalsAsync = ref.watch(studentGoalsProvider(widget.studentId));
    final studentAsync = ref.watch(studentProvider(widget.studentId));

    return Scaffold(
      appBar: AppBar(
        title: studentAsync.whenOrNull(
          data: (s) => Text('${s?.firstName ?? "Student"} IEP Goals'),
        ) ?? const Text('IEP Goals'),
      ),
      body: goalsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (goals) {
          final filtered = _categoryFilter == null
              ? goals
              : goals.where((g) => g.category == _categoryFilter).toList();

          return Column(
            children: [
              // Category filter
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All'),
                      selected: _categoryFilter == null,
                      onSelected: (_) => setState(() => _categoryFilter = null),
                    ),
                    const SizedBox(width: 8),
                    ...GoalCategory.values.map((cat) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(cat.name),
                        selected: _categoryFilter == cat,
                        onSelected: (_) => setState(() => _categoryFilter = cat),
                      ),
                    )),
                  ],
                ),
              ),
              // Goals list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    return GoalCard(
                      goal: filtered[index],
                      onRecordProgress: () => _showRecordProgressDialog(filtered[index]),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showRecordProgressDialog(IepGoal goal) {
    final controller = TextEditingController(text: goal.currentValue.toString());
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Record Progress'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(goal.description),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Value',
                suffixText: goal.measurementUnit,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = double.tryParse(controller.text);
              if (value != null) {
                ref.read(iepProvider.notifier).recordProgress(
                  RecordProgressDto(
                    goalId: goal.id,
                    value: value,
                    notes: notesController.text.isNotEmpty ? notesController.text : null,
                  ),
                );
              }
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

/// Card displaying a goal.
class GoalCard extends StatelessWidget {
  const GoalCard({
    super.key,
    required this.goal,
    required this.onRecordProgress,
  });

  final IepGoal goal;
  final VoidCallback onRecordProgress;

  @override
  Widget build(BuildContext context) {
    final progress = goal.currentValue / goal.targetValue;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _CategoryIcon(category: goal.category),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    goal.category.name.toUpperCase(),
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                _StatusChip(status: goal.status),
              ],
            ),
            const SizedBox(height: 12),
            Text(goal.description, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      LinearProgressIndicator(
                        value: progress.clamp(0, 1),
                        backgroundColor: Colors.grey.shade200,
                        color: _progressColor(progress),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${goal.currentValue} / ${goal.targetValue} ${goal.measurementUnit ?? ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  '${(progress * 100).round()}%',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: _progressColor(progress),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: onRecordProgress,
                  icon: const Icon(Icons.add),
                  label: const Text('Record Progress'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _progressColor(double progress) {
    if (progress >= 0.8) return Colors.green;
    if (progress >= 0.5) return Colors.orange;
    return Colors.red;
  }
}

class _CategoryIcon extends StatelessWidget {
  const _CategoryIcon({required this.category});

  final GoalCategory category;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Icon(_icon, size: 16, color: _color),
    );
  }

  Color get _color {
    switch (category) {
      case GoalCategory.reading: return Colors.blue;
      case GoalCategory.math: return Colors.purple;
      case GoalCategory.writing: return Colors.green;
      case GoalCategory.behavior: return Colors.orange;
      case GoalCategory.socialEmotional: return Colors.pink;
      case GoalCategory.speech: return Colors.teal;
      case GoalCategory.occupationalTherapy: return Colors.indigo;
      case GoalCategory.physicalTherapy: return Colors.red;
      case GoalCategory.other: return Colors.grey;
    }
  }

  IconData get _icon {
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
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final GoalStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.name,
        style: TextStyle(fontSize: 11, color: _color, fontWeight: FontWeight.w500),
      ),
    );
  }

  Color get _color {
    switch (status) {
      case GoalStatus.notStarted: return Colors.grey;
      case GoalStatus.inProgress: return Colors.blue;
      case GoalStatus.onTrack: return Colors.green;
      case GoalStatus.atRisk: return Colors.red;
      case GoalStatus.achieved: return Colors.teal;
      case GoalStatus.discontinued: return Colors.grey;
    }
  }
}
