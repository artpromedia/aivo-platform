/// Session Plan Screen
///
/// Shows the daily session plan for a class including activities and materials.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

/// Planned activity model.
class PlannedActivity {
  const PlannedActivity({
    required this.id,
    required this.title,
    required this.description,
    required this.durationMinutes,
    required this.type,
    this.materials,
    this.standards,
    this.differentiations,
  });

  final String id;
  final String title;
  final String description;
  final int durationMinutes;
  final String type; // whole-class, small-group, individual, assessment
  final List<String>? materials;
  final List<String>? standards;
  final List<String>? differentiations;

  factory PlannedActivity.fromJson(Map<String, dynamic> json) {
    return PlannedActivity(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      durationMinutes: json['durationMinutes'] as int,
      type: json['type'] as String,
      materials: (json['materials'] as List?)?.cast<String>(),
      standards: (json['standards'] as List?)?.cast<String>(),
      differentiations: (json['differentiations'] as List?)?.cast<String>(),
    );
  }
}

/// Session plan model.
class SessionPlan {
  const SessionPlan({
    required this.date,
    required this.subject,
    required this.objective,
    required this.activities,
    this.notes,
  });

  final DateTime date;
  final String subject;
  final String objective;
  final List<PlannedActivity> activities;
  final String? notes;

  factory SessionPlan.fromJson(Map<String, dynamic> json) {
    return SessionPlan(
      date: DateTime.fromMillisecondsSinceEpoch(json['date'] as int),
      subject: json['subject'] as String,
      objective: json['objective'] as String,
      activities: (json['activities'] as List)
          .map((a) => PlannedActivity.fromJson(a as Map<String, dynamic>))
          .toList(),
      notes: json['notes'] as String?,
    );
  }

  int get totalDuration =>
      activities.fold(0, (sum, a) => sum + a.durationMinutes);
}

/// Session plan state.
class SessionPlanState {
  const SessionPlanState({
    this.plan,
    this.isLoading = false,
    this.error,
  });

  final SessionPlan? plan;
  final bool isLoading;
  final String? error;
}

/// Session plan notifier.
class SessionPlanNotifier extends StateNotifier<SessionPlanState> {
  SessionPlanNotifier() : super(const SessionPlanState());

  Future<void> loadPlan(String classId) async {
    state = const SessionPlanState(isLoading: true);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.get('/teacher-planning/classes/$classId/plan/today');
      final data = response.data as Map<String, dynamic>;

      state = SessionPlanState(plan: SessionPlan.fromJson(data));
    } catch (e) {
      state = SessionPlanState(
        error: e is ApiException ? e.message : 'Failed to load plan',
      );
    }
  }
}

final sessionPlanProvider =
    StateNotifierProvider.family<SessionPlanNotifier, SessionPlanState, String>(
  (ref, classId) => SessionPlanNotifier()..loadPlan(classId),
);

class SessionPlanScreen extends ConsumerWidget {
  const SessionPlanScreen({
    super.key,
    required this.classId,
    required this.className,
  });

  final String classId;
  final String className;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final planState = ref.watch(sessionPlanProvider(classId));

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Today's Plan"),
            Text(
              className,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => _showEditPlanSheet(context, ref),
            tooltip: 'Edit Plan',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(sessionPlanProvider(classId).notifier).loadPlan(classId),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(context, planState, ref),
      floatingActionButton: planState.plan != null
          ? FloatingActionButton.extended(
              onPressed: () => _startSession(context, ref),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start Session'),
            )
          : null,
    );
  }

  Widget _buildBody(BuildContext context, SessionPlanState state, WidgetRef ref) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(state.error!),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () =>
                  ref.read(sessionPlanProvider(classId).notifier).loadPlan(classId),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final plan = state.plan;
    if (plan == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            const Text('No plan for today'),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => _showCreatePlanSheet(context, ref),
              child: const Text('Create Plan'),
            ),
          ],
        ),
      );
    }

    return CustomScrollView(
      slivers: [
        // Header card with objective
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.flag_outlined,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          "Today's Objective",
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(plan.objective),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _InfoChip(
                          icon: Icons.subject,
                          label: plan.subject,
                        ),
                        const SizedBox(width: 8),
                        _InfoChip(
                          icon: Icons.timer_outlined,
                          label: '${plan.totalDuration} min',
                        ),
                        const SizedBox(width: 8),
                        _InfoChip(
                          icon: Icons.list,
                          label: '${plan.activities.length} activities',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Activities list
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Text(
              'Activities',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final activity = plan.activities[index];
              return _ActivityCard(
                activity: activity,
                index: index + 1,
                onTap: () => _showActivityDetails(context, activity),
              );
            },
            childCount: plan.activities.length,
          ),
        ),

        // Notes section
        if (plan.notes != null && plan.notes!.isNotEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.note_outlined, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Notes',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(plan.notes!),
                    ],
                  ),
                ),
              ),
            ),
          ),

        const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
      ],
    );
  }

  Future<void> _startSession(BuildContext context, WidgetRef ref) async {
    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.post(
        '/session/classroom-sessions',
        data: {
          'classId': classId,
          'sessionType': 'class',
          'startedAt': DateTime.now().millisecondsSinceEpoch,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final sessionId = data['sessionId'] as String;

      if (context.mounted) {
        context.push('/session/$sessionId/log');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start session: $e')),
        );
      }
    }
  }

  void _showEditPlanSheet(BuildContext context, WidgetRef ref) {
    final plan = ref.read(sessionPlanProvider(classId)).plan;
    final objectiveController = TextEditingController(text: plan?.objective ?? '');
    final notesController = TextEditingController(text: plan?.notes ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.5,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) => SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Edit Plan',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: objectiveController,
                  decoration: const InputDecoration(
                    labelText: 'Objective',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Plan updated')),
                    );
                  },
                  child: const Text('Save Changes'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showCreatePlanSheet(BuildContext context, WidgetRef ref) {
    final objectiveController = TextEditingController();
    final subjectController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) => SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Create New Plan',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: subjectController,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: objectiveController,
                  decoration: const InputDecoration(
                    labelText: 'Learning Objective',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 24),
                Text(
                  'Activities',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    // Would open activity editor
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Add Activity'),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ref.read(sessionPlanProvider(classId).notifier).loadPlan(classId);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Plan created')),
                    );
                  },
                  child: const Text('Create Plan'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showActivityDetails(BuildContext context, PlannedActivity activity) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                activity.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _InfoChip(
                    icon: Icons.timer_outlined,
                    label: '${activity.durationMinutes} min',
                  ),
                  const SizedBox(width: 8),
                  _InfoChip(
                    icon: _getTypeIcon(activity.type),
                    label: _getTypeLabel(activity.type),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(activity.description),
              if (activity.materials != null && activity.materials!.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Materials',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                ...activity.materials!.map((m) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.check, size: 16),
                          const SizedBox(width: 8),
                          Text(m),
                        ],
                      ),
                    )),
              ],
              if (activity.standards != null && activity.standards!.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Standards Addressed',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: activity.standards!
                      .map((s) => Chip(label: Text(s)))
                      .toList(),
                ),
              ],
              if (activity.differentiations != null &&
                  activity.differentiations!.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Differentiation',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                ...activity.differentiations!.map((d) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.adjust, size: 16),
                          const SizedBox(width: 8),
                          Expanded(child: Text(d)),
                        ],
                      ),
                    )),
              ],
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'whole-class':
        return Icons.groups;
      case 'small-group':
        return Icons.group;
      case 'individual':
        return Icons.person;
      case 'assessment':
        return Icons.quiz;
      default:
        return Icons.play_circle;
    }
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'whole-class':
        return 'Whole Class';
      case 'small-group':
        return 'Small Group';
      case 'individual':
        return 'Individual';
      case 'assessment':
        return 'Assessment';
      default:
        return type;
    }
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium,
          ),
        ],
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({
    required this.activity,
    required this.index,
    required this.onTap,
  });

  final PlannedActivity activity;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '$index',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activity.title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 14,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${activity.durationMinutes} min',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Icon(
                            _getTypeIcon(activity.type),
                            size: 14,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _getTypeLabel(activity.type),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'whole-class':
        return Icons.groups;
      case 'small-group':
        return Icons.group;
      case 'individual':
        return Icons.person;
      case 'assessment':
        return Icons.quiz;
      default:
        return Icons.play_circle;
    }
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'whole-class':
        return 'Whole';
      case 'small-group':
        return 'Group';
      case 'individual':
        return 'Individual';
      case 'assessment':
        return 'Assessment';
      default:
        return type;
    }
  }
}
