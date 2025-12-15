/// Action Plan Detail Screen
///
/// Shows detailed view of an action plan with tasks and progress tracking.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';

/// Screen showing action plan details.
class ActionPlanDetailScreen extends ConsumerWidget {
  const ActionPlanDetailScreen({
    super.key,
    required this.learnerId,
    required this.planId,
  });

  final String learnerId;
  final String planId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(
      actionPlanDetailProvider((learnerId: learnerId, planId: planId)),
    );

    return Scaffold(
      body: planAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load action plan: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(
                  actionPlanDetailProvider((learnerId: learnerId, planId: planId)),
                ),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (plan) => _ActionPlanDetailView(
          learnerId: learnerId,
          plan: plan,
        ),
      ),
    );
  }
}

class _ActionPlanDetailView extends ConsumerStatefulWidget {
  const _ActionPlanDetailView({
    required this.learnerId,
    required this.plan,
  });

  final String learnerId;
  final ActionPlan plan;

  @override
  ConsumerState<_ActionPlanDetailView> createState() => _ActionPlanDetailViewState();
}

class _ActionPlanDetailViewState extends ConsumerState<_ActionPlanDetailView>
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

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;

    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) => [
        SliverAppBar(
          expandedHeight: 180,
          floating: false,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            title: Text(
              plan.title,
              style: const TextStyle(fontSize: 16),
            ),
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Theme.of(context).colorScheme.primary,
                    Theme.of(context).colorScheme.primary.withValues(alpha: 0.8),
                  ],
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 40),
                      if (plan.description != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            plan.description!,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      Wrap(
                        spacing: 8,
                        children: plan.focusAreas.map((area) => Chip(
                          label: Text(
                            area.split('-').map((w) => w[0].toUpperCase() + w.substring(1)).join(' '),
                            style: const TextStyle(fontSize: 11),
                          ),
                          backgroundColor: Colors.white.withValues(alpha: 0.2),
                          labelStyle: const TextStyle(color: Colors.white),
                          padding: EdgeInsets.zero,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        )).toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          bottom: TabBar(
            controller: _tabController,
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: const [
              Tab(text: 'Tasks'),
              Tab(text: 'Activity'),
            ],
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabController,
        children: [
          _TasksTab(
            learnerId: widget.learnerId,
            plan: plan,
          ),
          _ActivityTab(
            learnerId: widget.learnerId,
            plan: plan,
          ),
        ],
      ),
    );
  }
}

class _TasksTab extends StatelessWidget {
  const _TasksTab({
    required this.learnerId,
    required this.plan,
  });

  final String learnerId;
  final ActionPlan plan;

  @override
  Widget build(BuildContext context) {
    if (plan.tasks.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.task_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No tasks yet',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Group tasks by context
    final homeTasks = plan.tasks.where((t) => t.context == TaskContext.home).toList();
    final schoolTasks = plan.tasks.where((t) => t.context == TaskContext.school).toList();
    final therapyTasks = plan.tasks.where((t) => t.context == TaskContext.therapy).toList();
    final sharedTasks = plan.tasks
        .where((t) => t.context == TaskContext.shared || t.context == TaskContext.community)
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (homeTasks.isNotEmpty) ...[
          _TaskSectionHeader(
            title: 'Home',
            icon: Icons.home_outlined,
            color: Colors.blue,
          ),
          ...homeTasks.map((t) => _TaskCard(
                learnerId: learnerId,
                planId: plan.id,
                task: t,
              )),
          const SizedBox(height: 16),
        ],
        if (schoolTasks.isNotEmpty) ...[
          _TaskSectionHeader(
            title: 'School',
            icon: Icons.school_outlined,
            color: Colors.green,
          ),
          ...schoolTasks.map((t) => _TaskCard(
                learnerId: learnerId,
                planId: plan.id,
                task: t,
              )),
          const SizedBox(height: 16),
        ],
        if (therapyTasks.isNotEmpty) ...[
          _TaskSectionHeader(
            title: 'Therapy',
            icon: Icons.psychology_outlined,
            color: Colors.purple,
          ),
          ...therapyTasks.map((t) => _TaskCard(
                learnerId: learnerId,
                planId: plan.id,
                task: t,
              )),
          const SizedBox(height: 16),
        ],
        if (sharedTasks.isNotEmpty) ...[
          _TaskSectionHeader(
            title: 'All Settings',
            icon: Icons.public_outlined,
            color: Colors.orange,
          ),
          ...sharedTasks.map((t) => _TaskCard(
                learnerId: learnerId,
                planId: plan.id,
                task: t,
              )),
        ],
      ],
    );
  }
}

class _TaskSectionHeader extends StatelessWidget {
  const _TaskSectionHeader({
    required this.title,
    required this.icon,
    required this.color,
  });

  final String title;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends ConsumerWidget {
  const _TaskCard({
    required this.learnerId,
    required this.planId,
    required this.task,
  });

  final String learnerId;
  final String planId;
  final ActionPlanTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        leading: IconButton(
          icon: const Icon(Icons.check_circle_outline),
          color: Colors.green,
          onPressed: () => _markComplete(context, ref),
        ),
        title: Text(
          task.title,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Row(
          children: [
            Icon(
              Icons.schedule,
              size: 14,
              color: Colors.grey[600],
            ),
            const SizedBox(width: 4),
            Text(
              task.frequencyDisplayName,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            if (task.timeOfDay != null) ...[
              const SizedBox(width: 8),
              Text(
                '• ${task.timeOfDay}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (task.description != null) ...[
                  Text(
                    task.description!,
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                ],
                // Supports
                if (task.supports.activeSupports.isNotEmpty) ...[
                  const Text(
                    'Supports:',
                    style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: task.supports.activeSupports
                        .map((s) => _SupportChip(label: s))
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                ],
                // Success criteria
                if (task.successCriteria != null) ...[
                  const Text(
                    'Success looks like:',
                    style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    task.successCriteria!,
                    style: const TextStyle(
                      color: Colors.green,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                // Assignee
                if (task.assignee != null)
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'Supported by: ${task.assignee!.displayName}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                // Completion count
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.check_circle, size: 16, color: Colors.green),
                    const SizedBox(width: 4),
                    Text(
                      'Completed ${task.completionCount} times',
                      style: const TextStyle(fontSize: 12, color: Colors.green),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _markComplete(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _CompleteTaskSheet(
        learnerId: learnerId,
        planId: planId,
        task: task,
      ),
    );
  }
}

class _SupportChip extends StatelessWidget {
  const _SupportChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.purple.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, color: Colors.purple),
      ),
    );
  }
}

class _CompleteTaskSheet extends ConsumerStatefulWidget {
  const _CompleteTaskSheet({
    required this.learnerId,
    required this.planId,
    required this.task,
  });

  final String learnerId;
  final String planId;
  final ActionPlanTask task;

  @override
  ConsumerState<_CompleteTaskSheet> createState() => _CompleteTaskSheetState();
}

class _CompleteTaskSheetState extends ConsumerState<_CompleteTaskSheet> {
  final _notesController = TextEditingController();
  int _rating = 3;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Log Completion',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            widget.task.title,
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          const Text(
            'How did it go?',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(5, (index) {
              final rating = index + 1;
              return GestureDetector(
                onTap: () => setState(() => _rating = rating),
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _rating == rating
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey[200],
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      _getRatingEmoji(rating),
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(
              labelText: 'Notes (optional)',
              hintText: 'What worked well? Any challenges?',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Log Completion'),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _getRatingEmoji(int rating) {
    switch (rating) {
      case 1:
        return '😟';
      case 2:
        return '😕';
      case 3:
        return '😐';
      case 4:
        return '😊';
      case 5:
        return '🎉';
      default:
        return '😐';
    }
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);

    try {
      final service = ref.read(collaborationServiceProvider);
      await service.recordTaskCompletion(
        learnerId: widget.learnerId,
        planId: widget.planId,
        taskId: widget.task.id,
        status: TaskCompletionStatus.completed,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        effectivenessRating: _rating,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Task completion logged!'),
            backgroundColor: Colors.green,
          ),
        );
        // Refresh the plan
        ref.invalidate(
          actionPlanDetailProvider((
            learnerId: widget.learnerId,
            planId: widget.planId,
          )),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to log completion: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}

class _ActivityTab extends ConsumerWidget {
  const _ActivityTab({
    required this.learnerId,
    required this.plan,
  });

  final String learnerId;
  final ActionPlan plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(careNotesProvider(learnerId));

    return notesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
      data: (notes) {
        // Filter notes for this action plan
        final planNotes = notes.where((n) => n.actionPlan?.id == plan.id).toList();

        if (planNotes.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.note_outlined, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text(
                  'No activity yet',
                  style: TextStyle(fontSize: 18, color: Colors.grey),
                ),
                SizedBox(height: 8),
                Text(
                  'Notes and updates will appear here',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: planNotes.length,
          itemBuilder: (context, index) {
            final note = planNotes[index];
            return _NoteCard(note: note);
          },
        );
      },
    );
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({required this.note});

  final CareNote note;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: _getNoteTypeColor(note.noteType),
                  child: Icon(
                    _getNoteTypeIcon(note.noteType),
                    size: 16,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        note.author.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        '${note.noteTypeDisplayName} • ${_formatDate(note.createdAt)}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                if (note.requiresFollowUp)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Follow-up',
                      style: TextStyle(fontSize: 10, color: Colors.orange),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (note.title != null) ...[
              Text(
                note.title!,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
            ],
            Text(note.content),
          ],
        ),
      ),
    );
  }

  Color _getNoteTypeColor(CareNoteType type) {
    switch (type) {
      case CareNoteType.celebration:
        return Colors.amber;
      case CareNoteType.question:
        return Colors.blue;
      case CareNoteType.homeUpdate:
        return Colors.indigo;
      case CareNoteType.schoolUpdate:
        return Colors.green;
      case CareNoteType.therapyUpdate:
        return Colors.purple;
      case CareNoteType.strategyFeedback:
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getNoteTypeIcon(CareNoteType type) {
    switch (type) {
      case CareNoteType.celebration:
        return Icons.celebration;
      case CareNoteType.question:
        return Icons.help_outline;
      case CareNoteType.homeUpdate:
        return Icons.home;
      case CareNoteType.schoolUpdate:
        return Icons.school;
      case CareNoteType.therapyUpdate:
        return Icons.psychology;
      case CareNoteType.strategyFeedback:
        return Icons.feedback;
      case CareNoteType.observation:
        return Icons.visibility;
      case CareNoteType.progressUpdate:
        return Icons.trending_up;
      case CareNoteType.meetingNotes:
        return Icons.meeting_room;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}
