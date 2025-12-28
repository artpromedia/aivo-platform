/// Student Detail Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen showing student details.
class StudentDetailScreen extends ConsumerWidget {
  const StudentDetailScreen({
    super.key,
    required this.studentId,
    this.initialTab = 0,
  });

  final String studentId;
  final int initialTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentAsync = ref.watch(studentProvider(studentId));

    return studentAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error: $e')),
      ),
      data: (student) {
        if (student == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('Student not found')),
          );
        }
        return _StudentDetailView(student: student);
      },
    );
  }
}

class _StudentDetailView extends ConsumerWidget {
  const _StudentDetailView({required this.student});

  final Student student;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goalsAsync = ref.watch(studentGoalsProvider(student.id));

    return Scaffold(
      appBar: AppBar(
        title: Text('${student.firstName} ${student.lastName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.message),
            onPressed: () => context.push('/messages/compose?studentId=${student.id}'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile header
          _ProfileHeader(student: student),
          const SizedBox(height: 16),

          // Quick info cards
          Row(
            children: [
              Expanded(child: _InfoCard(label: 'Grade', value: student.gradeLevel?.toString() ?? 'N/A')),
              const SizedBox(width: 12),
              Expanded(child: _InfoCard(label: 'Status', value: student.status.name)),
            ],
          ),
          const SizedBox(height: 16),

          // IEP section
          if (student.hasIep) ...[
            Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ListTile(
                    leading: const Icon(Icons.assignment, color: Colors.blue),
                    title: const Text('IEP Goals'),
                    trailing: TextButton(
                      onPressed: () => context.push('/students/${student.id}/iep'),
                      child: const Text('View All'),
                    ),
                  ),
                  goalsAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (_, __) => const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Error loading goals'),
                    ),
                    data: (goals) => Column(
                      children: goals.take(3).map((goal) => ListTile(
                        title: Text(
                          goal.description,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: LinearProgressIndicator(
                          value: goal.currentValue / goal.targetValue,
                          backgroundColor: Colors.grey.shade200,
                        ),
                        trailing: Text(
                          '${((goal.currentValue / goal.targetValue) * 100).round()}%',
                        ),
                      )).toList(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Accommodations
          if (student.accommodations.isNotEmpty) ...[
            Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const ListTile(
                    leading: Icon(Icons.accessibility, color: Colors.purple),
                    title: Text('Accommodations'),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: student.accommodations.map((a) => Chip(
                        label: Text(a),
                        backgroundColor: Colors.purple.shade50,
                      )).toList(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Actions
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.play_circle),
                  title: const Text('Start Session'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/sessions/new?studentId=${student.id}'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.history),
                  title: const Text('View Progress'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/students/${student.id}/progress'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.assessment),
                  title: const Text('Generate Report'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/reports/student/${student.id}'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.student});

  final Student student;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 40,
          backgroundImage: student.avatarUrl != null
              ? NetworkImage(student.avatarUrl!)
              : null,
          child: student.avatarUrl == null
              ? Text(student.initials, style: const TextStyle(fontSize: 24))
              : null,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${student.firstName} ${student.lastName}',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              if (student.email != null)
                Text(student.email!, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
