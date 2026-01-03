/// Assignment List Screen
///
/// Shows all assignments with filtering and sorting.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../models/models.dart';
import '../../providers/providers.dart';

/// Main assignments list screen.
class AssignmentListScreen extends ConsumerStatefulWidget {
  const AssignmentListScreen({
    super.key,
    this.classId,
  });

  final String? classId;

  @override
  ConsumerState<AssignmentListScreen> createState() => _AssignmentListScreenState();
}

class _AssignmentListScreenState extends ConsumerState<AssignmentListScreen> {
  String _searchQuery = '';
  AssignmentStatus? _statusFilter;
  AssignmentType? _typeFilter;
  bool _showNeedsGradingOnly = false;

  @override
  void initState() {
    super.initState();
    if (widget.classId != null) {
      ref.read(assignmentsProvider.notifier).loadAssignmentsByClass(widget.classId!);
    } else {
      ref.read(assignmentsProvider.notifier).loadAssignments();
    }
  }

  List<Assignment> _filterAssignments(List<Assignment> assignments) {
    return assignments.where((a) {
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!a.title.toLowerCase().contains(query)) return false;
      }
      if (_statusFilter != null && a.status != _statusFilter) return false;
      if (_typeFilter != null && a.assignmentType != _typeFilter) return false;
      if (_showNeedsGradingOnly && a.ungradedCount == 0) return false;
      return true;
    }).toList()
      ..sort((a, b) => (b.dueAt ?? DateTime.now()).compareTo(a.dueAt ?? DateTime.now()));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assignmentsProvider);
    final filteredAssignments = _filterAssignments(state.assignments);
    final ungradedCount = ref.watch(ungradedCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assignments'),
        actions: [
          if (ungradedCount > 0)
            Badge(
              label: Text(ungradedCount.toString()),
              child: IconButton(
                icon: const Icon(Icons.grading),
                onPressed: () => setState(() => _showNeedsGradingOnly = true),
                tooltip: 'Needs grading',
              ),
            ),
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
                hintText: 'Search assignments...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          // Active filters
          if (_hasActiveFilters)
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
                  if (_typeFilter != null)
                    Chip(
                      label: Text(_typeFilter!.name),
                      onDeleted: () => setState(() => _typeFilter = null),
                    ),
                  if (_showNeedsGradingOnly)
                    Chip(
                      label: const Text('Needs grading'),
                      onDeleted: () => setState(() => _showNeedsGradingOnly = false),
                    ),
                ],
              ),
            ),
          // Assignment list
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => ref.read(assignmentsProvider.notifier).refreshAssignments(),
                    child: filteredAssignments.isEmpty
                        ? _buildEmptyState()
                        : ListView.builder(
                            itemCount: filteredAssignments.length,
                            itemBuilder: (context, index) {
                              final assignment = filteredAssignments[index];
                              return AssignmentCard(
                                assignment: assignment,
                                onTap: () => context.push('/assignments/${assignment.id}'),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/assignments/new'),
        icon: const Icon(Icons.add),
        label: const Text('New Assignment'),
      ),
    );
  }

  bool get _hasActiveFilters =>
      _statusFilter != null || _typeFilter != null || _showNeedsGradingOnly;

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.assignment_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            _hasActiveFilters ? 'No assignments match filters' : 'No assignments yet',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (_hasActiveFilters)
            TextButton(
              onPressed: () => setState(() {
                _statusFilter = null;
                _typeFilter = null;
                _showNeedsGradingOnly = false;
              }),
              child: const Text('Clear filters'),
            )
          else
            TextButton(
              onPressed: () => context.push('/assignments/new'),
              child: const Text('Create your first assignment'),
            ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Filter Assignments', style: Theme.of(context).textTheme.titleLarge),
                if (_hasActiveFilters)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _statusFilter = null;
                        _typeFilter = null;
                        _showNeedsGradingOnly = false;
                      });
                      Navigator.pop(context);
                    },
                    child: const Text('Clear all'),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Needs grading only'),
              value: _showNeedsGradingOnly,
              onChanged: (v) {
                setState(() => _showNeedsGradingOnly = v);
              },
            ),
            const Divider(),
            const Text('Status'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: AssignmentStatus.values.map((status) {
                return FilterChip(
                  label: Text(status.name),
                  selected: _statusFilter == status,
                  onSelected: (selected) {
                    setState(() => _statusFilter = selected ? status : null);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            const Text('Type'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: AssignmentType.values.map((type) {
                return FilterChip(
                  label: Text(type.name),
                  selected: _typeFilter == type,
                  onSelected: (selected) {
                    setState(() => _typeFilter = selected ? type : null);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Apply Filters'),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

/// Card widget for displaying an assignment.
class AssignmentCard extends StatelessWidget {
  const AssignmentCard({
    super.key,
    required this.assignment,
    required this.onTap,
  });

  final Assignment assignment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dueText = assignment.dueAt != null
        ? DateFormat.MMMd().add_jm().format(assignment.dueAt!)
        : 'No due date';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
                  _buildTypeIcon(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          assignment.title,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            _buildStatusChip(context),
                            const SizedBox(width: 8),
                            Text(
                              dueText,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: assignment.isPastDue ? Colors.red : null,
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${assignment.pointsPossible.toStringAsFixed(0)} pts',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      if (assignment.ungradedCount > 0)
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${assignment.ungradedCount} ungraded',
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: Colors.white,
                                ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              if (assignment.categoryName != null) ...[
                const SizedBox(height: 8),
                Text(
                  assignment.categoryName!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
              ],
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: assignment.completionRate,
                backgroundColor: Theme.of(context).dividerColor,
              ),
              const SizedBox(height: 4),
              Text(
                '${assignment.submissionCount}/${assignment.studentCount} submitted',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeIcon() {
    IconData icon;
    Color color;

    switch (assignment.assignmentType) {
      case AssignmentType.homework:
        icon = Icons.home_work;
        color = Colors.blue;
        break;
      case AssignmentType.quiz:
        icon = Icons.quiz;
        color = Colors.purple;
        break;
      case AssignmentType.test:
        icon = Icons.assignment;
        color = Colors.red;
        break;
      case AssignmentType.project:
        icon = Icons.folder;
        color = Colors.green;
        break;
      case AssignmentType.classwork:
        icon = Icons.class_;
        color = Colors.orange;
        break;
      case AssignmentType.practice:
        icon = Icons.fitness_center;
        color = Colors.teal;
        break;
      case AssignmentType.assessment:
        icon = Icons.assessment;
        color = Colors.indigo;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color),
    );
  }

  Widget _buildStatusChip(BuildContext context) {
    Color color;
    String label;

    switch (assignment.status) {
      case AssignmentStatus.draft:
        color = Colors.grey;
        label = 'Draft';
        break;
      case AssignmentStatus.published:
        color = Colors.green;
        label = 'Published';
        break;
      case AssignmentStatus.closed:
        color = Colors.red;
        label = 'Closed';
        break;
      case AssignmentStatus.archived:
        color = Colors.brown;
        label = 'Archived';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, color: color),
      ),
    );
  }
}
