/// Gradebook Screen
///
/// Mobile-optimized gradebook view with inline editing.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/models.dart';
import '../../providers/providers.dart';

/// Main gradebook screen.
class GradebookScreen extends ConsumerStatefulWidget {
  const GradebookScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<GradebookScreen> createState() => _GradebookScreenState();
}

class _GradebookScreenState extends ConsumerState<GradebookScreen> {
  String _searchQuery = '';
  bool _showAtRiskOnly = false;
  int _selectedAssignmentIndex = 0;

  @override
  void initState() {
    super.initState();
    ref.read(gradebookProvider(widget.classId).notifier).loadGradebook();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(gradebookProvider(widget.classId));
    final gradebook = state.gradebook;

    return Scaffold(
      appBar: AppBar(
        title: Text(gradebook?.className ?? 'Gradebook'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterOptions,
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'export',
                child: ListTile(
                  leading: Icon(Icons.download),
                  title: Text('Export Gradebook'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'recalculate',
                child: ListTile(
                  leading: Icon(Icons.calculate),
                  title: Text('Recalculate Grades'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildErrorView(state.error!)
              : gradebook == null
                  ? const Center(child: Text('No gradebook data'))
                  : _buildGradebookContent(gradebook),
    );
  }

  Widget _buildErrorView(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text('Error loading gradebook', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.read(gradebookProvider(widget.classId).notifier).refreshGradebook(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildGradebookContent(Gradebook gradebook) {
    final filteredStudents = _filterStudents(gradebook.students);
    final assignments = gradebook.assignments;

    return Column(
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
        // Assignment selector (horizontal scroll)
        if (assignments.isNotEmpty)
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: assignments.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('Overall'),
                      selected: _selectedAssignmentIndex == 0,
                      onSelected: (_) => setState(() => _selectedAssignmentIndex = 0),
                    ),
                  );
                }
                final assignment = assignments[index - 1];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(assignment.title),
                    selected: _selectedAssignmentIndex == index,
                    onSelected: (_) => setState(() => _selectedAssignmentIndex = index),
                  ),
                );
              },
            ),
          ),
        const SizedBox(height: 8),
        // Filter chips
        if (_showAtRiskOnly)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              children: [
                Chip(
                  label: const Text('At Risk Only'),
                  onDeleted: () => setState(() => _showAtRiskOnly = false),
                ),
              ],
            ),
          ),
        // Student grades list
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.read(gradebookProvider(widget.classId).notifier).refreshGradebook(),
            child: ListView.builder(
              itemCount: filteredStudents.length,
              itemBuilder: (context, index) {
                final student = filteredStudents[index];
                if (_selectedAssignmentIndex == 0) {
                  return _buildOverallGradeCard(gradebook, student);
                } else {
                  final assignment = assignments[_selectedAssignmentIndex - 1];
                  return _buildAssignmentGradeCard(gradebook, student, assignment);
                }
              },
            ),
          ),
        ),
      ],
    );
  }

  List<GradebookStudent> _filterStudents(List<GradebookStudent> students) {
    return students.where((s) {
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!s.name.toLowerCase().contains(query)) return false;
      }
      if (_showAtRiskOnly) {
        final grade = s.overallGrade;
        if (grade == null || grade.percent == null) return true;
        if (grade.percent! >= 70) return false;
      }
      return true;
    }).toList();
  }

  Widget _buildOverallGradeCard(Gradebook gradebook, GradebookStudent student) {
    final grade = student.overallGrade;
    final percent = grade?.percent;
    final letterGrade = percent != null
        ? gradebook.gradeScale.getLetterGrade(percent)
        : null;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: student.avatarUrl != null
              ? NetworkImage(student.avatarUrl!)
              : null,
          child: student.avatarUrl == null
              ? Text(student.name.isNotEmpty ? student.name[0].toUpperCase() : '?')
              : null,
        ),
        title: Row(
          children: [
            Expanded(child: Text(student.name)),
            if (student.hasIep)
              const Padding(
                padding: EdgeInsets.only(left: 4),
                child: Icon(Icons.assignment, size: 16, color: Colors.blue),
              ),
          ],
        ),
        subtitle: Row(
          children: [
            Text('${grade?.assignmentsGraded ?? 0}/${grade?.assignmentsTotal ?? 0} graded'),
            if ((grade?.assignmentsMissing ?? 0) > 0) ...[
              const SizedBox(width: 8),
              Text(
                '${grade?.assignmentsMissing} missing',
                style: const TextStyle(color: Colors.red),
              ),
            ],
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              letterGrade ?? '-',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _getGradeColor(percent),
                  ),
            ),
            Text(
              percent != null ? '${percent.toStringAsFixed(1)}%' : '-',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        onTap: () => context.push('/students/${student.id}/grades'),
      ),
    );
  }

  Widget _buildAssignmentGradeCard(
    Gradebook gradebook,
    GradebookStudent student,
    GradebookAssignment assignment,
  ) {
    final gradeEntry = gradebook.getGrade(student.id, assignment.id);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: student.avatarUrl != null
              ? NetworkImage(student.avatarUrl!)
              : null,
          child: student.avatarUrl == null
              ? Text(student.name.isNotEmpty ? student.name[0].toUpperCase() : '?')
              : null,
        ),
        title: Text(student.name),
        subtitle: Text(_getGradeStatus(gradeEntry)),
        trailing: InkWell(
          onTap: () => _showQuickGradeDialog(student, assignment, gradeEntry),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).dividerColor),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _formatGrade(gradeEntry, assignment),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _getGradeEntryColor(gradeEntry),
                  ),
            ),
          ),
        ),
        onTap: () => context.push(
          '/gradebook/${widget.classId}/grade/${student.id}/${assignment.id}',
        ),
      ),
    );
  }

  String _getGradeStatus(GradeEntry? grade) {
    if (grade == null) return 'Not submitted';
    if (grade.isExcused) return 'Excused';
    if (grade.isMissing) return 'Missing';
    if (grade.isLate) return 'Late';
    if (grade.hasGrade) return 'Graded';
    return 'Submitted';
  }

  String _formatGrade(GradeEntry? grade, GradebookAssignment assignment) {
    if (grade == null) return '-';
    if (grade.isExcused) return 'EX';
    if (grade.isMissing) return 'M';
    if (grade.pointsEarned == null) return '-';
    return '${grade.pointsEarned!.toStringAsFixed(grade.pointsEarned! % 1 == 0 ? 0 : 1)}/${assignment.pointsPossible.toStringAsFixed(0)}';
  }

  Color? _getGradeColor(double? percent) {
    if (percent == null) return null;
    if (percent >= 90) return Colors.green;
    if (percent >= 80) return Colors.lightGreen;
    if (percent >= 70) return Colors.orange;
    if (percent >= 60) return Colors.deepOrange;
    return Colors.red;
  }

  Color? _getGradeEntryColor(GradeEntry? grade) {
    if (grade == null) return Colors.grey;
    if (grade.isExcused) return Colors.blue;
    if (grade.isMissing) return Colors.red;
    if (grade.isLate) return Colors.orange;
    return null;
  }

  void _showFilterOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Filter Options', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Show at-risk students only'),
              subtitle: const Text('Students below 70%'),
              value: _showAtRiskOnly,
              onChanged: (v) {
                setState(() => _showAtRiskOnly = v);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showQuickGradeDialog(
    GradebookStudent student,
    GradebookAssignment assignment,
    GradeEntry? currentGrade,
  ) {
    final controller = TextEditingController(
      text: currentGrade?.pointsEarned?.toString() ?? '',
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Grade ${student.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(assignment.title, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Points',
                suffixText: '/ ${assignment.pointsPossible.toStringAsFixed(0)}',
                border: const OutlineInputBorder(),
              ),
              autofocus: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(gradebookProvider(widget.classId).notifier).excuseGrade(
                    student.id,
                    assignment.id,
                  );
            },
            child: const Text('Excuse'),
          ),
          FilledButton(
            onPressed: () async {
              final points = double.tryParse(controller.text);
              if (points != null) {
                Navigator.pop(context);
                await ref.read(gradebookProvider(widget.classId).notifier).updateGrade(
                      student.id,
                      assignment.id,
                      UpdateGradeDto(pointsEarned: points),
                    );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleMenuAction(String action) async {
    switch (action) {
      case 'export':
        final url = await ref.read(gradebookProvider(widget.classId).notifier).exportGradebook();
        if (url != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Gradebook exported: $url')),
          );
        }
        break;
      case 'recalculate':
        await ref.read(gradebookProvider(widget.classId).notifier).recalculateGrades();
        break;
    }
  }
}
