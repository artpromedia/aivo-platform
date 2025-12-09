import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../plan/plan_controller.dart';

class TodayPlanScreen extends ConsumerStatefulWidget {
  const TodayPlanScreen({super.key, required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<TodayPlanScreen> createState() => _TodayPlanScreenState();
}

class _TodayPlanScreenState extends ConsumerState<TodayPlanScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch today's plan when the screen loads
    Future.microtask(() {
      ref.read(planControllerProvider(widget.learnerId).notifier).fetchTodaysPlan();
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    final planState = ref.watch(planControllerProvider(widget.learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.todayPlan),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(planControllerProvider(widget.learnerId).notifier)
                  .fetchTodaysPlan(forceRefresh: true);
            },
          ),
        ],
      ),
      body: _buildBody(context, planState),
    );
  }

  Widget _buildBody(BuildContext context, PlanState planState) {
    if (planState.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (planState.error != null) {
      return _buildErrorState(context, planState.error!);
    }

    final plan = planState.plan;
    if (plan == null || plan.activities.isEmpty) {
      return _buildEmptyState(context);
    }

    return _buildPlanContent(context, plan);
  }

  Widget _buildErrorState(BuildContext context, String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Failed to load plan', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                ref.read(planControllerProvider(widget.learnerId).notifier)
                    .fetchTodaysPlan(forceRefresh: true);
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline, size: 64, color: Colors.green),
            const SizedBox(height: 16),
            Text('All done for today!', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'You\'ve completed all available activities. Check back tomorrow!',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanContent(BuildContext context, TodaysPlan plan) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(
            'Your plan for today',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Text(
            '${plan.activities.length} activities • ~${plan.totalMinutes} minutes',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
          const SizedBox(height: 16),

          // Activities list
          Expanded(
            child: ListView.builder(
              itemCount: plan.activities.length,
              itemBuilder: (context, index) {
                return _ActivityCard(
                  activity: plan.activities[index],
                  index: index + 1,
                );
              },
            ),
          ),

          // Start button
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => context.go('/complete'),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start Learning'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Card widget displaying a single activity.
class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.activity, required this.index});

  final TodaysPlanActivity activity;
  final int index;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getDomainColor(activity.domain),
          child: Text(
            index.toString(),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          activity.title,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.timer_outlined, size: 14, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text('${activity.estimatedMinutes} min'),
                const SizedBox(width: 16),
                Icon(_getObjectTypeIcon(activity.objectType), size: 14, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(_getObjectTypeLabel(activity.objectType)),
              ],
            ),
            const SizedBox(height: 4),
            _DifficultyIndicator(level: activity.difficultyLevel),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }

  Color _getDomainColor(String domain) {
    switch (domain.toLowerCase()) {
      case 'reading_foundations':
        return Colors.blue;
      case 'reading_comprehension':
        return Colors.indigo;
      case 'number_sense':
        return Colors.orange;
      case 'operations':
        return Colors.red;
      case 'problem_solving':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  IconData _getObjectTypeIcon(LearningObjectType type) {
    switch (type) {
      case LearningObjectType.lesson:
        return Icons.menu_book;
      case LearningObjectType.exercise:
        return Icons.edit_note;
      case LearningObjectType.assessment:
        return Icons.assignment;
      case LearningObjectType.game:
        return Icons.sports_esports;
      case LearningObjectType.video:
        return Icons.play_circle;
      case LearningObjectType.reading:
        return Icons.auto_stories;
    }
  }

  String _getObjectTypeLabel(LearningObjectType type) {
    switch (type) {
      case LearningObjectType.lesson:
        return 'Lesson';
      case LearningObjectType.exercise:
        return 'Exercise';
      case LearningObjectType.assessment:
        return 'Assessment';
      case LearningObjectType.game:
        return 'Game';
      case LearningObjectType.video:
        return 'Video';
      case LearningObjectType.reading:
        return 'Reading';
    }
  }
}

/// Visual indicator for difficulty level (1-5).
class _DifficultyIndicator extends StatelessWidget {
  const _DifficultyIndicator({required this.level});

  final int level;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Difficulty: ',
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        ...List.generate(5, (index) {
          return Icon(
            Icons.circle,
            size: 8,
            color: index < level ? _getDifficultyColor(level) : Colors.grey[300],
          );
        }),
      ],
    );
  }

  Color _getDifficultyColor(int level) {
    if (level <= 2) return Colors.green;
    if (level <= 3) return Colors.orange;
    return Colors.red;
  }
}
