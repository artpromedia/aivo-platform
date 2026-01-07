/// Class Roster Screen
///
/// Shows list of students in a class with quick actions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:share_plus/share_plus.dart';

/// Student model for roster.
class RosterStudent {
  const RosterStudent({
    required this.id,
    required this.name,
    required this.avatarUrl,
    this.status,
    this.lastActivity,
    this.needsAttention = false,
  });

  final String id;
  final String name;
  final String? avatarUrl;
  final String? status; // present, absent, tardy, unknown
  final DateTime? lastActivity;
  final bool needsAttention;

  factory RosterStudent.fromJson(Map<String, dynamic> json) {
    return RosterStudent(
      id: json['id'] as String,
      name: json['displayName'] as String? ?? json['name'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      status: json['status'] as String?,
      lastActivity: json['lastActivity'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['lastActivity'] as int)
          : null,
      needsAttention: json['needsAttention'] as bool? ?? false,
    );
  }
}

/// Roster state.
class RosterState {
  const RosterState({
    this.students = const [],
    this.isLoading = false,
    this.error,
  });

  final List<RosterStudent> students;
  final bool isLoading;
  final String? error;
}

/// Roster notifier.
class RosterNotifier extends StateNotifier<RosterState> {
  RosterNotifier() : super(const RosterState());

  Future<void> loadRoster(String classId) async {
    state = const RosterState(isLoading: true);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.get('/teacher-planning/classes/$classId/roster');
      final data = response.data as List;

      final students = data
          .map((json) => RosterStudent.fromJson(json as Map<String, dynamic>))
          .toList();

      state = RosterState(students: students);
    } catch (e) {
      state = RosterState(
        error: e is ApiException ? e.message : 'Failed to load roster',
      );
    }
  }
}

final rosterProvider =
    StateNotifierProvider.family<RosterNotifier, RosterState, String>((ref, classId) {
  return RosterNotifier()..loadRoster(classId);
});

class ClassRosterScreen extends ConsumerWidget {
  const ClassRosterScreen({
    super.key,
    required this.classId,
    required this.className,
  });

  final String classId;
  final String className;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rosterState = ref.watch(rosterProvider(classId));

    return Scaffold(
      appBar: AppBar(
        title: Text(className),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(rosterProvider(classId).notifier).loadRoster(classId),
            tooltip: 'Refresh',
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'session':
                  context.push('/class/$classId/session?name=${Uri.encodeComponent(className)}');
                  break;
                case 'export':
                  _exportRoster(context, ref);
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'session',
                child: ListTile(
                  leading: Icon(Icons.calendar_today),
                  title: Text('View Session Plan'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: ListTile(
                  leading: Icon(Icons.download),
                  title: Text('Export Roster'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: _buildBody(context, rosterState, ref),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/class/$classId/session?name=${Uri.encodeComponent(className)}'),
        icon: const Icon(Icons.play_arrow),
        label: const Text('Start Session'),
      ),
    );
  }

  Widget _buildBody(BuildContext context, RosterState state, WidgetRef ref) {
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
                  ref.read(rosterProvider(classId).notifier).loadRoster(classId),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.students.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.people_outline,
              size: 64,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            const Text('No students in this class'),
          ],
        ),
      );
    }

    // Group students by needs attention
    final needsAttention = state.students.where((s) => s.needsAttention).toList();
    final others = state.students.where((s) => !s.needsAttention).toList();

    return RefreshIndicator(
      onRefresh: () => ref.read(rosterProvider(classId).notifier).loadRoster(classId),
      child: CustomScrollView(
        slivers: [
          // Summary stats
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  _StatChip(
                    label: 'Total',
                    value: '${state.students.length}',
                    icon: Icons.people,
                  ),
                  const SizedBox(width: 12),
                  _StatChip(
                    label: 'Attention',
                    value: '${needsAttention.length}',
                    icon: Icons.warning_amber,
                    isWarning: needsAttention.isNotEmpty,
                  ),
                ],
              ),
            ),
          ),

          // Needs attention section
          if (needsAttention.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Text(
                  'Needs Attention',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.error,
                      ),
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _StudentTile(
                  student: needsAttention[index],
                  onTap: () => _navigateToStudent(context, needsAttention[index]),
                ),
                childCount: needsAttention.length,
              ),
            ),
            const SliverToBoxAdapter(
              child: Divider(height: 32),
            ),
          ],

          // All students section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                'All Students',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => _StudentTile(
                student: others[index],
                onTap: () => _navigateToStudent(context, others[index]),
              ),
              childCount: others.length,
            ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  void _navigateToStudent(BuildContext context, RosterStudent student) {
    context.push('/learner/${student.id}?name=${Uri.encodeComponent(student.name)}');
  }

  void _exportRoster(BuildContext context, WidgetRef ref) {
    final roster = ref.read(classRosterProvider(classId)).roster;
    if (roster == null || roster.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No students to export')),
      );
      return;
    }

    // Generate CSV content
    final buffer = StringBuffer();
    buffer.writeln('Name,Status,Last Activity,Needs Attention');
    for (final student in roster) {
      buffer.writeln(
        '${student.name},${student.status ?? ""},${student.lastActivity ?? ""},${student.needsAttention}',
      );
    }

    // Share the CSV
    Share.share(
      buffer.toString(),
      subject: '$className - Class Roster',
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.value,
    required this.icon,
    this.isWarning = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final bool isWarning;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isWarning
            ? colorScheme.errorContainer
            : colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 20,
            color: isWarning
                ? colorScheme.onErrorContainer
                : colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isWarning ? colorScheme.onErrorContainer : null,
                    ),
              ),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isWarning
                          ? colorScheme.onErrorContainer
                          : colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StudentTile extends StatelessWidget {
  const _StudentTile({
    required this.student,
    required this.onTap,
  });

  final RosterStudent student;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: student.needsAttention
            ? colorScheme.errorContainer
            : colorScheme.primaryContainer,
        backgroundImage: student.avatarUrl != null
            ? NetworkImage(student.avatarUrl!)
            : null,
        child: student.avatarUrl == null
            ? Text(
                student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                style: TextStyle(
                  color: student.needsAttention
                      ? colorScheme.onErrorContainer
                      : colorScheme.onPrimaryContainer,
                ),
              )
            : null,
      ),
      title: Text(student.name),
      subtitle: student.lastActivity != null
          ? Text(
              'Last active: ${_formatTime(student.lastActivity!)}',
              style: theme.textTheme.bodySmall,
            )
          : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (student.needsAttention)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_amber,
                    size: 14,
                    color: colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Attention',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onErrorContainer,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 5) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
