/// Goals Management Screen
///
/// Allows learners to:
/// - Set personal learning goals
/// - Track goal progress
/// - View completed goals
/// - Celebrate achievements
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/error_widgets.dart';
import '../progress/progress_models.dart';
import '../progress/progress_service.dart';

/// Goals Screen
class GoalsScreen extends ConsumerStatefulWidget {
  const GoalsScreen({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends ConsumerState<GoalsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  IconData _getGoalIcon(GoalType type) {
    switch (type) {
      case GoalType.lessons:
        return Icons.menu_book;
      case GoalType.minutes:
        return Icons.timer;
      case GoalType.xp:
        return Icons.star;
      case GoalType.streak:
        return Icons.local_fire_department;
      case GoalType.subject:
        return Icons.school;
      case GoalType.custom:
        return Icons.flag;
    }
  }

  Color _getGoalColor(GoalType type) {
    switch (type) {
      case GoalType.lessons:
        return Colors.blue;
      case GoalType.minutes:
        return Colors.purple;
      case GoalType.xp:
        return Colors.amber;
      case GoalType.streak:
        return AivoBrand.warning;
      case GoalType.subject:
        return AivoBrand.success;
      case GoalType.custom:
        return Colors.teal;
    }
  }

  String _formatDeadline(DateTime? deadline) {
    if (deadline == null) return 'No deadline';
    final now = DateTime.now();
    final diff = deadline.difference(now);
    if (diff.isNegative) return 'Overdue';
    if (diff.inDays == 0) return 'Due today';
    if (diff.inDays == 1) return 'Due tomorrow';
    return 'Due in ${diff.inDays} days';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final goalsAsync = ref.watch(goalsDataProvider(widget.learnerId));

    return goalsAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('My Goals')),
        body: const GoalsLoadingWidget(),
      ),
      error: (error, stack) => Scaffold(
        appBar: AppBar(title: const Text('My Goals')),
        body: LearnerErrorWidget(
          message: 'We couldn\'t load your goals right now.',
          onRetry: () => ref.invalidate(goalsDataProvider(widget.learnerId)),
        ),
      ),
      data: (goalsData) => _buildGoalsScaffold(
        theme,
        colorScheme,
        goalsData.activeGoals,
        goalsData.completedGoals,
      ),
    );
  }

  Widget _buildGoalsScaffold(
    ThemeData theme,
    ColorScheme colorScheme,
    List<LearningGoal> activeGoals,
    List<LearningGoal> completedGoals,
  ) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Goals'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: const Icon(Icons.flag),
              text: 'Active (${activeGoals.length})',
            ),
            Tab(
              icon: const Icon(Icons.check_circle),
              text: 'Completed (${completedGoals.length})',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildActiveGoals(theme, colorScheme, activeGoals),
          _buildCompletedGoals(theme, colorScheme, completedGoals),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddGoalDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('New Goal'),
      ),
    );
  }

  Widget _buildActiveGoals(
      ThemeData theme, ColorScheme colorScheme, List<LearningGoal> activeGoals) {
    if (activeGoals.isEmpty) {
      return const EmptyStateWidget(
        emoji: '🎯',
        title: 'No goals yet!',
        message: 'Set a goal to start your adventure!',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: activeGoals.length,
      itemBuilder: (context, index) {
        final goal = activeGoals[index];
        return _GoalCard(
          goal: goal,
          getIcon: _getGoalIcon,
          getColor: _getGoalColor,
          formatDeadline: _formatDeadline,
          onTap: () => _showGoalDetails(context, goal),
        );
      },
    );
  }

  Widget _buildCompletedGoals(
      ThemeData theme, ColorScheme colorScheme, List<LearningGoal> completedGoals) {
    if (completedGoals.isEmpty) {
      return const EmptyStateWidget(
        emoji: '🏆',
        title: 'No completed goals yet',
        message: 'Keep working on your goals - you can do it!',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: completedGoals.length,
      itemBuilder: (context, index) {
        final goal = completedGoals[index];
        return _CompletedGoalCard(
          goal: goal,
          getIcon: _getGoalIcon,
          getColor: _getGoalColor,
        );
      },
    );
  }

  void _showGoalDetails(BuildContext context, LearningGoal goal) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final color = _getGoalColor(goal.type);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) {
          return Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Content
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Header
                      Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: color.withOpacity(0.2),
                            child: Icon(_getGoalIcon(goal.type), color: color),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  goal.title,
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  _formatDeadline(goal.deadline),
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Progress
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Progress',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: LinearProgressIndicator(
                                  value: goal.progress,
                                  backgroundColor: color.withOpacity(0.2),
                                  valueColor: AlwaysStoppedAnimation(color),
                                  minHeight: 16,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${goal.currentValue}/${goal.targetValue} ${goal.type.label}',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    '${(goal.progress * 100).round()}%',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: color,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      if (goal.description.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Description',
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(goal.description),
                              ],
                            ),
                          ),
                        ),
                      ],

                      // Objectives
                      if (goal.objectives.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Steps',
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                ...goal.objectives.map((obj) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      children: [
                                        Icon(
                                          obj.isComplete
                                              ? Icons.check_circle
                                              : Icons.radio_button_unchecked,
                                          color: obj.isComplete
                                              ? AivoBrand.success
                                              : colorScheme.onSurfaceVariant,
                                          size: 20,
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            obj.title,
                                            style: TextStyle(
                                              decoration: obj.isComplete
                                                  ? TextDecoration.lineThrough
                                                  : null,
                                              color: obj.isComplete
                                                  ? colorScheme.onSurfaceVariant
                                                  : null,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showAddGoalDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    final targetController = TextEditingController();
    GoalType selectedType = GoalType.lessons;
    bool hasDeadline = false;
    DateTime deadline = DateTime.now().add(const Duration(days: 7));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              left: 16,
              right: 16,
              top: 16,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Create New Goal',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),

                  // Goal type
                  Text(
                    'Goal Type',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: GoalType.values.map((type) {
                      final isSelected = type == selectedType;
                      final color = _getGoalColor(type);
                      return ChoiceChip(
                        label: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getGoalIcon(type),
                              size: 16,
                              color: isSelected ? Colors.white : color,
                            ),
                            const SizedBox(width: 4),
                            Text(type.label),
                          ],
                        ),
                        selected: isSelected,
                        onSelected: (selected) {
                          setModalState(() => selectedType = type);
                        },
                        selectedColor: color,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Title
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Goal Title',
                      border: OutlineInputBorder(),
                      hintText: 'e.g., Complete 5 Math Lessons',
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Description
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description (optional)',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),

                  // Target value
                  TextField(
                    controller: targetController,
                    decoration: InputDecoration(
                      labelText: 'Target ${selectedType.label}',
                      border: const OutlineInputBorder(),
                      hintText: 'e.g., 5',
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),

                  // Deadline toggle
                  SwitchListTile(
                    title: const Text('Set Deadline'),
                    value: hasDeadline,
                    onChanged: (value) {
                      setModalState(() => hasDeadline = value);
                    },
                    contentPadding: EdgeInsets.zero,
                  ),

                  if (hasDeadline) ...[
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: deadline,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setModalState(() => deadline = picked);
                        }
                      },
                      icon: const Icon(Icons.calendar_today),
                      label: Text(
                        '${deadline.day}/${deadline.month}/${deadline.year}',
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () {
                          // Create goal
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Goal created!')),
                          );
                        },
                        child: const Text('Create Goal'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.goal,
    required this.getIcon,
    required this.getColor,
    required this.formatDeadline,
    required this.onTap,
  });

  final LearningGoal goal;
  final IconData Function(GoalType) getIcon;
  final Color Function(GoalType) getColor;
  final String Function(DateTime?) formatDeadline;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final color = getColor(goal.type);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: color.withOpacity(0.2),
                    child: Icon(getIcon(goal.type), color: color, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          goal.title,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          formatDeadline(goal.deadline),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${(goal.progress * 100).round()}%',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: goal.progress,
                  backgroundColor: color.withOpacity(0.2),
                  valueColor: AlwaysStoppedAnimation(color),
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${goal.currentValue}/${goal.targetValue} ${goal.type.label.toLowerCase()}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompletedGoalCard extends StatelessWidget {
  const _CompletedGoalCard({
    required this.goal,
    required this.getIcon,
    required this.getColor,
  });

  final LearningGoal goal;
  final IconData Function(GoalType) getIcon;
  final Color Function(GoalType) getColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final color = getColor(goal.type);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.2),
              child: Icon(Icons.check, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    goal.title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${goal.targetValue} ${goal.type.label.toLowerCase()} completed',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const Text('🏆', style: TextStyle(fontSize: 24)),
          ],
        ),
      ),
    );
  }
}
