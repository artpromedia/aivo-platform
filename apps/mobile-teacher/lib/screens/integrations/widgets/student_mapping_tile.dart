/// Student mapping tile widget for Google Classroom integration
/// Displays student info and mapping status with actions
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/lms_integration.dart';

/// Widget for displaying a Google Classroom student with mapping controls
class StudentMappingTile extends StatelessWidget {
  const StudentMappingTile({
    super.key,
    required this.student,
    this.onMap,
    this.onUnmap,
    this.isLoading = false,
    this.compact = false,
  });

  /// The Google Classroom student
  final GoogleClassroomStudent student;

  /// Callback when user wants to map this student
  final VoidCallback? onMap;

  /// Callback when user wants to unmap this student
  final VoidCallback? onUnmap;

  /// Whether an operation is in progress
  final bool isLoading;

  /// Whether to show in compact mode
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (compact) {
      return _buildCompactTile(theme);
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Avatar
            _buildAvatar(theme),
            const SizedBox(width: 12),

            // Student info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.displayName,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    student.profile.emailAddress,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (student.isMapped) ...[
                    const SizedBox(height: 6),
                    _buildMappingBadge(theme),
                  ],
                ],
              ),
            ),

            // Action button
            _buildActionButton(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactTile(ThemeData theme) {
    return ListTile(
      leading: _buildAvatar(theme),
      title: Text(student.displayName),
      subtitle: Text(
        student.isMapped
            ? 'Linked to ${student.studentMapping!.aivoStudentName}'
            : student.profile.emailAddress,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: isLoading
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : student.isMapped
              ? IconButton(
                  icon: Icon(Icons.link_off, color: AivoBrand.error),
                  onPressed: onUnmap,
                  tooltip: 'Unlink student',
                )
              : IconButton(
                  icon: const Icon(Icons.link),
                  onPressed: onMap,
                  tooltip: 'Link to AIVO student',
                ),
    );
  }

  Widget _buildAvatar(ThemeData theme) {
    final hasPhoto = student.profile.photoUrl != null;

    return Stack(
      children: [
        CircleAvatar(
          radius: compact ? 20 : 24,
          backgroundColor: student.isMapped
              ? AivoBrand.mint[100]
              : AivoBrand.gray[200],
          backgroundImage:
              hasPhoto ? NetworkImage(student.profile.photoUrl!) : null,
          child: hasPhoto
              ? null
              : Text(
                  _getInitials(student.displayName),
                  style: TextStyle(
                    color: student.isMapped
                        ? AivoBrand.mint[700]
                        : AivoBrand.gray[600],
                    fontWeight: FontWeight.w600,
                    fontSize: compact ? 14 : 16,
                  ),
                ),
        ),
        if (student.isMapped)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: compact ? 14 : 16,
              height: compact ? 14 : 16,
              decoration: BoxDecoration(
                color: AivoBrand.success,
                shape: BoxShape.circle,
                border: Border.all(
                  color: theme.colorScheme.surface,
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.check,
                size: compact ? 8 : 10,
                color: Colors.white,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMappingBadge(ThemeData theme) {
    final mapping = student.studentMapping!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AivoBrand.mint[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.mint[200]!),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.link, size: 14, color: AivoBrand.mint[700]),
          const SizedBox(width: 4),
          Text(
            mapping.aivoStudentName,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AivoBrand.mint[700],
              fontWeight: FontWeight.w500,
            ),
          ),
          if (mapping.autoMapped) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: AivoBrand.mint[100],
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'Auto',
                style: TextStyle(
                  fontSize: 9,
                  color: AivoBrand.mint[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButton(ThemeData theme) {
    if (isLoading) {
      return const SizedBox(
        width: 36,
        height: 36,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }

    if (student.isMapped) {
      return OutlinedButton.icon(
        onPressed: onUnmap,
        icon: const Icon(Icons.link_off, size: 18),
        label: const Text('Unlink'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AivoBrand.error,
          side: BorderSide(color: AivoBrand.error[200]!),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
      );
    }

    return FilledButton.icon(
      onPressed: onMap,
      icon: const Icon(Icons.link, size: 18),
      label: const Text('Link'),
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }
    return '${parts[0].substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }
}

/// Summary card showing mapping progress for a course
class StudentMappingSummary extends StatelessWidget {
  const StudentMappingSummary({
    super.key,
    required this.totalStudents,
    required this.mappedStudents,
    this.onAutoMap,
    this.isAutoMapping = false,
  });

  final int totalStudents;
  final int mappedStudents;
  final VoidCallback? onAutoMap;
  final bool isAutoMapping;

  int get unmappedStudents => totalStudents - mappedStudents;

  double get progress =>
      totalStudents > 0 ? mappedStudents / totalStudents : 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.people, size: 20, color: AivoBrand.primary),
                const SizedBox(width: 8),
                Text(
                  'Student Mappings',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: unmappedStudents == 0
                        ? AivoBrand.mint[50]
                        : AivoBrand.sunshine[50],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    unmappedStudents == 0
                        ? 'All linked'
                        : '$unmappedStudents unlinked',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: unmappedStudents == 0
                          ? AivoBrand.mint[700]
                          : AivoBrand.sunshine[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Progress bar
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 8,
                      backgroundColor: AivoBrand.gray[200],
                      valueColor: AlwaysStoppedAnimation<Color>(
                        progress == 1 ? AivoBrand.success : AivoBrand.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '$mappedStudents / $totalStudents',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),

            if (unmappedStudents > 0 && onAutoMap != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: isAutoMapping ? null : onAutoMap,
                  icon: isAutoMapping
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome, size: 18),
                  label: Text(
                    isAutoMapping
                        ? 'Auto-linking...'
                        : 'Auto-link by email',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Dialog for selecting an AIVO student to map to
class StudentMappingDialog extends StatefulWidget {
  const StudentMappingDialog({
    super.key,
    required this.googleStudent,
    required this.aivoStudents,
    required this.onSelect,
    this.onSearch,
    this.isSearching = false,
  });

  final GoogleClassroomStudent googleStudent;
  final List<Map<String, dynamic>> aivoStudents;
  final void Function(String aivoStudentId) onSelect;
  final void Function(String query)? onSearch;
  final bool isSearching;

  @override
  State<StudentMappingDialog> createState() => _StudentMappingDialogState();
}

class _StudentMappingDialogState extends State<StudentMappingDialog> {
  final _searchController = TextEditingController();
  String? _selectedId;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
            if (widget.onSearch != null)
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search students...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: widget.isSearching
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : null,
                  border: const OutlineInputBorder(),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                onChanged: widget.onSearch,
              ),

            const SizedBox(height: 12),

            // Student list
            SizedBox(
              height: 250,
              child: widget.aivoStudents.isEmpty
                  ? Center(
                      child: Text(
                        'No students found',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  : ListView.builder(
                      itemCount: widget.aivoStudents.length,
                      itemBuilder: (context, index) {
                        final student = widget.aivoStudents[index];
                        final id = student['id'] as String;
                        final name = student['name'] as String? ?? '';
                        final email = student['email'] as String?;
                        final isSelected = _selectedId == id;

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
                            setState(() {
                              _selectedId = id;
                            });
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _selectedId != null
              ? () {
                  widget.onSelect(_selectedId!);
                  Navigator.of(context).pop();
                }
              : null,
          child: const Text('Link'),
        ),
      ],
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }
    return '${parts[0].substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }
}
