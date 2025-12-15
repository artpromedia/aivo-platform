/// Learner Collaboration Screen for Teachers
///
/// Shows collaboration details for a specific learner.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';

/// Learner collaboration detail screen for teachers.
class LearnerCollaborationScreen extends ConsumerWidget {
  const LearnerCollaborationScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text('$learnerName\'s Care Team'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Care Team'),
              Tab(text: 'Action Plans'),
              Tab(text: 'Notes'),
              Tab(text: 'Meetings'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _CareTeamTab(learnerId: learnerId),
            _ActionPlansTab(learnerId: learnerId),
            _NotesTab(learnerId: learnerId, learnerName: learnerName),
            _MeetingsTab(learnerId: learnerId),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARE TEAM TAB
// ═══════════════════════════════════════════════════════════════════════════════

class _CareTeamTab extends ConsumerWidget {
  const _CareTeamTab({required this.learnerId});

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final careTeamAsync = ref.watch(learnerCareTeamProvider(learnerId));

    return careTeamAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
      data: (members) => members.isEmpty
          ? const Center(child: Text('No care team members'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: members.length,
              itemBuilder: (context, index) => _CareTeamMemberCard(member: members[index]),
            ),
    );
  }
}

class _CareTeamMemberCard extends StatelessWidget {
  const _CareTeamMemberCard({required this.member});

  final CareTeamMember member;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: _getRoleColor(member.role),
              child: Text(
                member.displayName.isNotEmpty ? member.displayName[0].toUpperCase() : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.displayName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    member.title ?? member.roleDisplayName,
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getRoleColor(member.role).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      member.roleDisplayName,
                      style: TextStyle(
                        fontSize: 11,
                        color: _getRoleColor(member.role),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Contact buttons
            if (member.contactEmail != null)
              IconButton(
                icon: const Icon(Icons.email, color: Colors.blue),
                onPressed: () => _launchEmail(member.contactEmail!),
                tooltip: 'Email',
              ),
            if (member.contactPhone != null)
              IconButton(
                icon: const Icon(Icons.phone, color: Colors.green),
                onPressed: () => _launchPhone(member.contactPhone!),
                tooltip: 'Call',
              ),
          ],
        ),
      ),
    );
  }

  Color _getRoleColor(CareTeamRole role) {
    switch (role) {
      case CareTeamRole.parent:
      case CareTeamRole.guardian:
        return Colors.indigo;
      case CareTeamRole.teacher:
        return Colors.green;
      case CareTeamRole.therapist:
        return Colors.purple;
      case CareTeamRole.counselor:
        return Colors.orange;
      case CareTeamRole.specialist:
        return Colors.teal;
      default:
        return Colors.blueGrey;
    }
  }

  Future<void> _launchEmail(String email) async {
    final uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _launchPhone(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION PLANS TAB
// ═══════════════════════════════════════════════════════════════════════════════

class _ActionPlansTab extends ConsumerWidget {
  const _ActionPlansTab({required this.learnerId});

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plansAsync = ref.watch(learnerActionPlansProvider(learnerId));
    final schoolTasksAsync = ref.watch(learnerSchoolTasksProvider(learnerId));

    return CustomScrollView(
      slivers: [
        // School tasks section
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(Icons.school, size: 20, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  'My School Tasks',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
        schoolTasksAsync.when(
          loading: () => const SliverToBoxAdapter(
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, _) => SliverToBoxAdapter(
            child: Center(child: Text('Error: $error')),
          ),
          data: (tasks) => tasks.isEmpty
              ? const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No school tasks assigned', style: TextStyle(color: Colors.grey)),
                  ),
                )
              : SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _TaskCard(task: tasks[index]),
                    childCount: tasks.length,
                  ),
                ),
        ),

        // All plans section
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Row(
              children: [
                Icon(Icons.assignment, size: 20),
                SizedBox(width: 8),
                Text(
                  'All Action Plans',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
        plansAsync.when(
          loading: () => const SliverToBoxAdapter(
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, _) => SliverToBoxAdapter(
            child: Center(child: Text('Error: $error')),
          ),
          data: (plans) => plans.isEmpty
              ? const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No action plans', style: TextStyle(color: Colors.grey)),
                  ),
                )
              : SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _ActionPlanCard(plan: plans[index]),
                    childCount: plans.length,
                  ),
                ),
        ),

        const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
      ],
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task});

  final ActionPlanTask task;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.green.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.school, color: Colors.green, size: 20),
        ),
        title: Text(task.title),
        subtitle: Text(
          task.timeOfDay ?? task.contextDisplayName,
          style: const TextStyle(fontSize: 12),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.check_circle_outline),
          color: Colors.green,
          onPressed: () {
            // TODO: Record completion
          },
          tooltip: 'Mark Complete',
        ),
        onTap: () {
          // TODO: Show task detail
        },
      ),
    );
  }
}

class _ActionPlanCard extends StatelessWidget {
  const _ActionPlanCard({required this.plan});

  final ActionPlan plan;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: () {
          // TODO: Navigate to plan detail
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      plan.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  _StatusChip(status: plan.status),
                ],
              ),
              if (plan.description != null) ...[
                const SizedBox(height: 4),
                Text(
                  plan.description!,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: plan.focusAreas.map((area) => Chip(
                      label: Text(area.replaceAll('-', ' ')),
                      labelStyle: const TextStyle(fontSize: 10),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    )).toList(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.task, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    '${plan.taskCount} tasks',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.note, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    '${plan.noteCount} notes',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final ActionPlanStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      ActionPlanStatus.draft => (Colors.grey, 'Draft'),
      ActionPlanStatus.active => (Colors.green, 'Active'),
      ActionPlanStatus.onHold => (Colors.orange, 'On Hold'),
      ActionPlanStatus.completed => (Colors.blue, 'Complete'),
      ActionPlanStatus.archived => (Colors.blueGrey, 'Archived'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES TAB
// ═══════════════════════════════════════════════════════════════════════════════

class _NotesTab extends ConsumerWidget {
  const _NotesTab({
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(learnerCareNotesProvider(learnerId));

    return Scaffold(
      body: notesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
        data: (notes) => notes.isEmpty
            ? const Center(child: Text('No notes yet'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: notes.length,
                itemBuilder: (context, index) => _NoteCard(
                  note: notes[index],
                  learnerId: learnerId,
                ),
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddNoteSheet(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add Note'),
      ),
    );
  }

  void _showAddNoteSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _AddNoteSheet(
          learnerId: learnerId,
          learnerName: learnerName,
        ),
      ),
    );
  }
}

class _NoteCard extends ConsumerWidget {
  const _NoteCard({
    required this.note,
    required this.learnerId,
  });

  final CareNote note;
  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: _getNoteTypeColor(note.noteType).withValues(alpha: 0.15),
                  child: Icon(
                    _getNoteTypeIcon(note.noteType),
                    size: 16,
                    color: _getNoteTypeColor(note.noteType),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        note.author.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        '${note.author.roleDisplayName} • ${_formatDate(note.createdAt)}',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _getNoteTypeColor(note.noteType).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    note.noteTypeDisplayName,
                    style: TextStyle(
                      fontSize: 10,
                      color: _getNoteTypeColor(note.noteType),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Content
            if (note.title != null) ...[
              Text(
                note.title!,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
            ],
            Text(note.content),
            // Footer
            const SizedBox(height: 12),
            Row(
              children: [
                if (note.requiresFollowUp) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.flag, size: 12, color: Colors.orange[700]),
                        const SizedBox(width: 2),
                        Text(
                          'Follow-up',
                          style: TextStyle(fontSize: 10, color: Colors.orange[700]),
                        ),
                      ],
                    ),
                  ),
                ],
                const Spacer(),
                if (!note.isAcknowledged)
                  TextButton.icon(
                    onPressed: () => _acknowledge(ref),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Acknowledge'),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                    ),
                  ),
              ],
            ),
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
      default:
        return Icons.note;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    }
    return '${date.month}/${date.day}';
  }

  Future<void> _acknowledge(WidgetRef ref) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    await service.acknowledgeCareNote(learnerId, note.id);
    ref.invalidate(learnerCareNotesProvider(learnerId));
  }
}

class _AddNoteSheet extends ConsumerStatefulWidget {
  const _AddNoteSheet({
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<_AddNoteSheet> createState() => _AddNoteSheetState();
}

class _AddNoteSheetState extends ConsumerState<_AddNoteSheet> {
  final _contentController = TextEditingController();
  CareNoteType _selectedType = CareNoteType.schoolUpdate;
  bool _requiresFollowUp = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _contentController.dispose();
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
          Row(
            children: [
              Text(
                'Note about ${widget.learnerName}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Note type
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _NoteTypeChoice(
                  icon: Icons.school,
                  label: 'Classroom',
                  isSelected: _selectedType == CareNoteType.schoolUpdate,
                  onTap: () => setState(() => _selectedType = CareNoteType.schoolUpdate),
                ),
                const SizedBox(width: 8),
                _NoteTypeChoice(
                  icon: Icons.visibility,
                  label: 'Observation',
                  isSelected: _selectedType == CareNoteType.observation,
                  onTap: () => setState(() => _selectedType = CareNoteType.observation),
                ),
                const SizedBox(width: 8),
                _NoteTypeChoice(
                  icon: Icons.celebration,
                  label: 'Celebration',
                  isSelected: _selectedType == CareNoteType.celebration,
                  onTap: () => setState(() => _selectedType = CareNoteType.celebration),
                ),
                const SizedBox(width: 8),
                _NoteTypeChoice(
                  icon: Icons.trending_up,
                  label: 'Progress',
                  isSelected: _selectedType == CareNoteType.progressUpdate,
                  onTap: () => setState(() => _selectedType = CareNoteType.progressUpdate),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _contentController,
            decoration: const InputDecoration(
              labelText: 'Note',
              hintText: 'Share an observation or update...',
              border: OutlineInputBorder(),
            ),
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          CheckboxListTile(
            title: const Text('Requires follow-up'),
            value: _requiresFollowUp,
            onChanged: (v) => setState(() => _requiresFollowUp = v ?? false),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting || _contentController.text.isEmpty ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Share with Care Team'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_contentController.text.isEmpty) return;

    setState(() => _isSubmitting = true);

    try {
      final service = ref.read(teacherCollaborationServiceProvider);
      await service.createCareNote(
        learnerId: widget.learnerId,
        noteType: _selectedType,
        content: _contentController.text,
        requiresFollowUp: _requiresFollowUp,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Note shared with care team!'),
            backgroundColor: Colors.green,
          ),
        );
        ref.invalidate(learnerCareNotesProvider(widget.learnerId));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
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

class _NoteTypeChoice extends StatelessWidget {
  const _NoteTypeChoice({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.15) : null,
          border: Border.all(
            color: isSelected ? Theme.of(context).colorScheme.primary : Colors.grey.withValues(alpha: 0.3),
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Theme.of(context).colorScheme.primary : Colors.grey,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Theme.of(context).colorScheme.primary : Colors.grey,
                fontWeight: isSelected ? FontWeight.w500 : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEETINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════

class _MeetingsTab extends ConsumerWidget {
  const _MeetingsTab({required this.learnerId});

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meetingsAsync = ref.watch(learnerMeetingsProvider(learnerId));

    return meetingsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
      data: (meetings) => meetings.isEmpty
          ? const Center(child: Text('No meetings scheduled'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: meetings.length,
              itemBuilder: (context, index) => _MeetingCard(meeting: meetings[index]),
            ),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  const _MeetingCard({required this.meeting});

  final CareMeeting meeting;

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
                Container(
                  width: 48,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        _getMonthAbbr(meeting.scheduledAt.month),
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.blue,
                        ),
                      ),
                      Text(
                        '${meeting.scheduledAt.day}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        meeting.title,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${_formatTime(meeting.scheduledAt)} • ${meeting.durationMinutes}min',
                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                      if (meeting.location != null)
                        Text(
                          meeting.location!,
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                    ],
                  ),
                ),
                if (meeting.videoLink != null)
                  IconButton(
                    icon: const Icon(Icons.videocam, color: Colors.blue),
                    onPressed: () {
                      // TODO: Open video link
                    },
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _getMonthAbbr(int month) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months[month - 1];
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${date.minute.toString().padLeft(2, '0')} $period';
  }
}
