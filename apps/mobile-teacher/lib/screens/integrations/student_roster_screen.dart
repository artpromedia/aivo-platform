/// Student Roster Management Screen for Google Classroom Integration
/// Displays and manages student mappings between Google Classroom and AIVO
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/lms_integration.dart';
import '../../providers/lms_provider.dart';
import 'widgets/widgets.dart';

/// Screen for viewing and managing student mappings for a Google Classroom course
class StudentRosterScreen extends ConsumerStatefulWidget {
  const StudentRosterScreen({
    super.key,
    required this.courseId,
    required this.courseName,
    this.classId,
  });

  final String courseId;
  final String courseName;
  final String? classId;

  @override
  ConsumerState<StudentRosterScreen> createState() => _StudentRosterScreenState();
}

class _StudentRosterScreenState extends ConsumerState<StudentRosterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(courseStudentsProvider(widget.courseId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Student Roster'),
            Text(
              widget.courseName,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          if (state.isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => ref
                  .read(courseStudentsProvider(widget.courseId).notifier)
                  .refresh(),
              tooltip: 'Refresh',
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('All'),
                  const SizedBox(width: 4),
                  _buildBadge(state.students.length, theme),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Linked'),
                  const SizedBox(width: 4),
                  _buildBadge(state.mappedCount, theme, isSuccess: true),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Unlinked'),
                  const SizedBox(width: 4),
                  _buildBadge(
                    state.unmappedCount,
                    theme,
                    isWarning: state.unmappedCount > 0,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Mapping summary card
          Padding(
            padding: const EdgeInsets.all(16),
            child: StudentMappingSummary(
              totalStudents: state.students.length,
              mappedStudents: state.mappedCount,
              onAutoMap: state.unmappedCount > 0 && widget.classId != null
                  ? () => _autoMapStudents()
                  : null,
              isAutoMapping: state.isAutoMapping,
            ),
          ),

          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search students...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value.toLowerCase());
              },
            ),
          ),

          const SizedBox(height: 8),

          // Error message
          if (state.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildErrorCard(state.error!, theme),
            ),

          // Student lists
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildStudentList(state.students, state),
                _buildStudentList(state.mappedStudents, state),
                _buildStudentList(state.unmappedStudents, state),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(int count, ThemeData theme,
      {bool isSuccess = false, bool isWarning = false}) {
    Color bgColor = AivoBrand.gray[200]!;
    Color textColor = AivoBrand.gray[700]!;

    if (isSuccess && count > 0) {
      bgColor = AivoBrand.mint[100]!;
      textColor = AivoBrand.mint[700]!;
    } else if (isWarning && count > 0) {
      bgColor = AivoBrand.sunshine[100]!;
      textColor = AivoBrand.sunshine[700]!;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildErrorCard(String error, ThemeData theme) {
    return Card(
      color: AivoBrand.error[50],
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: AivoBrand.error[700], size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                error,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AivoBrand.error[700],
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              onPressed: () => ref
                  .read(courseStudentsProvider(widget.courseId).notifier)
                  .clearError(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentList(
    List<GoogleClassroomStudent> students,
    CourseStudentsState state,
  ) {
    // Filter students by search query
    final filteredStudents = _searchQuery.isEmpty
        ? students
        : students.where((s) {
            return s.displayName.toLowerCase().contains(_searchQuery) ||
                s.profile.emailAddress.toLowerCase().contains(_searchQuery);
          }).toList();

    if (filteredStudents.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.people_outline,
              size: 64,
              color: AivoBrand.gray[400],
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No students match your search'
                  : 'No students',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AivoBrand.gray[600],
                  ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref
          .read(courseStudentsProvider(widget.courseId).notifier)
          .refresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: filteredStudents.length,
        itemBuilder: (context, index) {
          final student = filteredStudents[index];
          return StudentMappingTile(
            student: student,
            isLoading: state.isLoading,
            onMap: widget.classId != null
                ? () => _showMapStudentDialog(student)
                : null,
            onUnmap: student.isMapped
                ? () => _showUnmapConfirmation(student)
                : null,
          );
        },
      ),
    );
  }

  Future<void> _autoMapStudents() async {
    try {
      final mappings = await ref
          .read(courseStudentsProvider(widget.courseId).notifier)
          .autoMapStudents();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              mappings.isEmpty
                  ? 'No students could be auto-linked'
                  : 'Auto-linked ${mappings.length} students',
            ),
            backgroundColor: mappings.isEmpty ? AivoBrand.sunshine : AivoBrand.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to auto-link: $e'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }

  void _showMapStudentDialog(GoogleClassroomStudent student) {
    if (widget.classId == null) return;

    showDialog(
      context: context,
      builder: (context) => _MapStudentDialog(
        googleStudent: student,
        classId: widget.classId!,
        courseId: widget.courseId,
      ),
    );
  }

  void _showUnmapConfirmation(GoogleClassroomStudent student) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unlink Student?'),
        content: Text(
          'This will remove the link between "${student.displayName}" and '
          '"${student.studentMapping!.aivoStudentName}".',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              _unmapStudent(student);
            },
            style: FilledButton.styleFrom(backgroundColor: AivoBrand.error),
            child: const Text('Unlink'),
          ),
        ],
      ),
    );
  }

  Future<void> _unmapStudent(GoogleClassroomStudent student) async {
    try {
      await ref
          .read(courseStudentsProvider(widget.courseId).notifier)
          .unmapStudent(student.studentMapping!.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Student unlinked successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to unlink: $e'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }
}

/// Dialog for mapping a single student
class _MapStudentDialog extends ConsumerStatefulWidget {
  const _MapStudentDialog({
    required this.googleStudent,
    required this.classId,
    required this.courseId,
  });

  final GoogleClassroomStudent googleStudent;
  final String classId;
  final String courseId;

  @override
  ConsumerState<_MapStudentDialog> createState() => _MapStudentDialogState();
}

class _MapStudentDialogState extends ConsumerState<_MapStudentDialog> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String? _selectedStudentId;
  bool _isMapping = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(
      aivoStudentsForMappingProvider(
        (classId: widget.classId, search: _searchQuery),
      ),
    );
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Link Student'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Google Classroom student info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AivoBrand.gray[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.school, color: AivoBrand.gray[600], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.googleStudent.displayName,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          widget.googleStudent.profile.emailAddress,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Text(
              'Select AIVO Student:',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 8),

            // Search field
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search students...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value);
              },
            ),

            const SizedBox(height: 12),

            // Student list
            SizedBox(
              height: 250,
              child: studentsAsync.when(
                data: (students) {
                  if (students.isEmpty) {
                    return Center(
                      child: Text(
                        'No students found',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    itemCount: students.length,
                    itemBuilder: (context, index) {
                      final student = students[index];
                      final id = student['id'] as String;
                      final name = student['name'] as String? ?? '';
                      final email = student['email'] as String?;
                      final isSelected = _selectedStudentId == id;

                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isSelected
                              ? AivoBrand.primary[100]
                              : AivoBrand.gray[200],
                          child: Text(
                            _getInitials(name),
                            style: TextStyle(
                              color: isSelected
                                  ? AivoBrand.primary
                                  : AivoBrand.gray[600],
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        title: Text(name),
                        subtitle: email != null ? Text(email) : null,
                        selected: isSelected,
                        selectedTileColor: AivoBrand.primary[50],
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        onTap: () {
                          setState(() => _selectedStudentId = id);
                        },
                      );
                    },
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (e, _) => Center(
                  child: Text(
                    'Error loading students: $e',
                    style: const TextStyle(color: AivoBrand.error),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isMapping ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _selectedStudentId != null && !_isMapping
              ? () => _mapStudent()
              : null,
          child: _isMapping
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Link'),
        ),
      ],
    );
  }

  Future<void> _mapStudent() async {
    if (_selectedStudentId == null) return;

    setState(() => _isMapping = true);

    try {
      await ref.read(courseStudentsProvider(widget.courseId).notifier).mapStudent(
            googleUserId: widget.googleStudent.userId,
            aivoStudentId: _selectedStudentId!,
          );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Student linked successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isMapping = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to link student: $e'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty || parts[0].isEmpty) return '?';
    if (parts.length == 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }
    return '${parts[0].substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }
}
