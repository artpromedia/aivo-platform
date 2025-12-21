/// Student List Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen showing list of all students.
class StudentListScreen extends ConsumerStatefulWidget {
  const StudentListScreen({super.key});

  @override
  ConsumerState<StudentListScreen> createState() => _StudentListScreenState();
}

class _StudentListScreenState extends ConsumerState<StudentListScreen> {
  String _searchQuery = '';
  StudentStatus? _statusFilter;
  bool _showIepOnly = false;

  @override
  void initState() {
    super.initState();
    ref.read(studentsProvider.notifier).loadStudents();
  }

  List<Student> _filterStudents(List<Student> students) {
    return students.where((s) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final name = '${s.firstName} ${s.lastName}'.toLowerCase();
        if (!name.contains(query)) return false;
      }
      // Status filter
      if (_statusFilter != null && s.status != _statusFilter) return false;
      // IEP filter
      if (_showIepOnly && !s.hasIep) return false;
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentsProvider);
    final filteredStudents = _filterStudents(state.students);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Students'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search students...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          // Filter chips
          if (_statusFilter != null || _showIepOnly)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                children: [
                  if (_statusFilter != null)
                    Chip(
                      label: Text(_statusFilter!.name),
                      onDeleted: () => setState(() => _statusFilter = null),
                    ),
                  if (_showIepOnly)
                    Chip(
                      label: const Text('IEP Only'),
                      onDeleted: () => setState(() => _showIepOnly = false),
                    ),
                ],
              ),
            ),
          // Student list
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => ref.read(studentsProvider.notifier).refreshStudents(),
                    child: ListView.builder(
                      itemCount: filteredStudents.length,
                      itemBuilder: (context, index) {
                        final student = filteredStudents[index];
                        return StudentListTile(
                          student: student,
                          onTap: () => context.push('/students/${student.id}'),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Filter Students', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Show IEP students only'),
              value: _showIepOnly,
              onChanged: (v) {
                setState(() => _showIepOnly = v);
                Navigator.pop(context);
              },
            ),
            const Divider(),
            const Text('Status'),
            Wrap(
              spacing: 8,
              children: StudentStatus.values.map((status) {
                return FilterChip(
                  label: Text(status.name),
                  selected: _statusFilter == status,
                  onSelected: (selected) {
                    setState(() => _statusFilter = selected ? status : null);
                    Navigator.pop(context);
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

/// List tile for a student.
class StudentListTile extends StatelessWidget {
  const StudentListTile({
    super.key,
    required this.student,
    required this.onTap,
  });

  final Student student;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundImage: student.avatarUrl != null
            ? NetworkImage(student.avatarUrl!)
            : null,
        child: student.avatarUrl == null ? Text(student.initials) : null,
      ),
      title: Text('${student.firstName} ${student.lastName}'),
      subtitle: Row(
        children: [
          if (student.hasIep) ...[
            const Icon(Icons.assignment, size: 14, color: Colors.blue),
            const SizedBox(width: 4),
            const Text('IEP', style: TextStyle(fontSize: 12)),
            const SizedBox(width: 8),
          ],
          Text('Grade ${student.gradeLevel}'),
        ],
      ),
      trailing: student.needsAttention
          ? const Icon(Icons.warning_amber, color: Colors.orange)
          : const Icon(Icons.chevron_right),
    );
  }
}
