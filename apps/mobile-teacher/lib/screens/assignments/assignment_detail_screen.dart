/// Assignment Detail Screen
///
/// Shows assignment details and submissions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../models/models.dart';
import '../../providers/providers.dart';

/// Assignment detail screen with submissions list.
class AssignmentDetailScreen extends ConsumerStatefulWidget {
  const AssignmentDetailScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<AssignmentDetailScreen> createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends ConsumerState<AssignmentDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    ref.read(submissionsProvider(widget.assignmentId).notifier).loadSubmissions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final assignmentAsync = ref.watch(assignmentProvider(widget.assignmentId));
    final submissionsState = ref.watch(submissionsProvider(widget.assignmentId));

    return assignmentAsync.when(
      data: (assignment) => assignment == null
          ? _buildNotFoundView()
          : _buildContent(assignment, submissionsState),
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildNotFoundView() {
    return Scaffold(
      appBar: AppBar(),
      body: const Center(
        child: Text('Assignment not found'),
      ),
    );
  }

  Widget _buildContent(Assignment assignment, SubmissionsState submissionsState) {
    return Scaffold(
      appBar: AppBar(
        title: Text(assignment.title),
        actions: [
          if (assignment.isDraft)
            TextButton(
              onPressed: () => _publishAssignment(assignment),
              child: const Text('Publish'),
            ),
          PopupMenuButton<String>(
            onSelected: (action) => _handleMenuAction(action, assignment),
            itemBuilder: (context) => [
              if (!assignment.isDraft)
                const PopupMenuItem(
                  value: 'close',
                  child: ListTile(
                    leading: Icon(Icons.lock),
                    title: Text('Close Assignment'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              const PopupMenuItem(
                value: 'duplicate',
                child: ListTile(
                  leading: Icon(Icons.copy),
                  title: Text('Duplicate'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'edit',
                child: ListTile(
                  leading: Icon(Icons.edit),
                  title: Text('Edit'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  leading: Icon(Icons.delete, color: Colors.red),
                  title: Text('Delete', style: TextStyle(color: Colors.red)),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              text: 'Details',
              icon: const Icon(Icons.info_outline),
            ),
            Tab(
              text: 'Submissions (${submissionsState.submissions.length})',
              icon: const Icon(Icons.people_outline),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDetailsTab(assignment),
          _buildSubmissionsTab(assignment, submissionsState),
        ],
      ),
    );
  }

  Widget _buildDetailsTab(Assignment assignment) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status and points
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Status', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 4),
                        _buildStatusChip(assignment.status),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Points', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 4),
                        Text(
                          '${assignment.pointsPossible.toStringAsFixed(0)}',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Type', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 4),
                        Text(
                          assignment.assignmentType.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Due date
          if (assignment.dueAt != null)
            ListTile(
              leading: const Icon(Icons.calendar_today),
              title: const Text('Due Date'),
              subtitle: Text(DateFormat.yMMMMEEEEd().add_jm().format(assignment.dueAt!)),
              trailing: assignment.isPastDue
                  ? const Chip(
                      label: Text('Past Due'),
                      backgroundColor: Colors.red,
                      labelStyle: TextStyle(color: Colors.white),
                    )
                  : null,
            ),

          // Available/Lock dates
          if (assignment.availableAt != null)
            ListTile(
              leading: const Icon(Icons.lock_open),
              title: const Text('Available From'),
              subtitle: Text(DateFormat.yMMMd().add_jm().format(assignment.availableAt!)),
            ),
          if (assignment.lockAt != null)
            ListTile(
              leading: const Icon(Icons.lock),
              title: const Text('Locks At'),
              subtitle: Text(DateFormat.yMMMd().add_jm().format(assignment.lockAt!)),
            ),

          const Divider(),

          // Category
          if (assignment.categoryName != null)
            ListTile(
              leading: const Icon(Icons.category),
              title: const Text('Category'),
              subtitle: Text(assignment.categoryName!),
            ),

          // Weight
          ListTile(
            leading: const Icon(Icons.scale),
            title: const Text('Weight'),
            subtitle: Text('${(assignment.weight * 100).toStringAsFixed(0)}%'),
          ),

          // Late submissions
          ListTile(
            leading: Icon(
              assignment.allowLateSubmissions ? Icons.check_circle : Icons.cancel,
              color: assignment.allowLateSubmissions ? Colors.green : Colors.red,
            ),
            title: const Text('Late Submissions'),
            subtitle: Text(
              assignment.allowLateSubmissions
                  ? assignment.latePenaltyPercent != null
                      ? 'Allowed with ${assignment.latePenaltyPercent}% penalty'
                      : 'Allowed'
                  : 'Not allowed',
            ),
          ),

          const Divider(),

          // Description
          if (assignment.description != null && assignment.description!.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Description', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(assignment.description!),
                ],
              ),
            ),
          ],

          // Instructions
          if (assignment.instructions != null && assignment.instructions!.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Instructions', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(assignment.instructions!),
                ],
              ),
            ),
          ],

          // Progress
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Progress', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatColumn(
                        context,
                        assignment.submissionCount.toString(),
                        'Submitted',
                        Colors.blue,
                      ),
                      _buildStatColumn(
                        context,
                        assignment.gradedCount.toString(),
                        'Graded',
                        Colors.green,
                      ),
                      _buildStatColumn(
                        context,
                        assignment.ungradedCount.toString(),
                        'Ungraded',
                        Colors.orange,
                      ),
                      _buildStatColumn(
                        context,
                        (assignment.studentCount - assignment.submissionCount).toString(),
                        'Missing',
                        Colors.red,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  LinearProgressIndicator(
                    value: assignment.completionRate,
                    backgroundColor: Theme.of(context).dividerColor,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${(assignment.completionRate * 100).toStringAsFixed(0)}% completion rate',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatColumn(BuildContext context, String value, String label, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: color),
        ),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }

  Widget _buildSubmissionsTab(Assignment assignment, SubmissionsState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final submissions = state.submissions;
    final ungraded = state.ungraded;
    final missing = state.missing;

    return Column(
      children: [
        // Quick actions
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: ungraded.isEmpty
                      ? null
                      : () => _gradeAll(assignment, ungraded),
                  icon: const Icon(Icons.grading),
                  label: Text('Grade All (${ungraded.length})'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: missing.isEmpty
                      ? null
                      : () => _markMissingAsZero(assignment.id),
                  icon: const Icon(Icons.close),
                  label: const Text('Mark Missing 0'),
                ),
              ),
            ],
          ),
        ),
        // Submissions list
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref
                .read(submissionsProvider(widget.assignmentId).notifier)
                .loadSubmissions(),
            child: submissions.isEmpty
                ? const Center(child: Text('No submissions yet'))
                : ListView.builder(
                    itemCount: submissions.length,
                    itemBuilder: (context, index) {
                      final submission = submissions[index];
                      return SubmissionListTile(
                        submission: submission,
                        assignment: assignment,
                        onTap: () => context.push(
                          '/assignments/${assignment.id}/submissions/${submission.id}',
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusChip(AssignmentStatus status) {
    Color color;
    String label;

    switch (status) {
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

    return Chip(
      label: Text(label),
      backgroundColor: color.withOpacity(0.2),
      labelStyle: TextStyle(color: color),
    );
  }

  Future<void> _publishAssignment(Assignment assignment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish Assignment'),
        content: const Text('Are you sure you want to publish this assignment? Students will be able to see it.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Publish'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(assignmentsProvider.notifier).publishAssignment(assignment.id);
    }
  }

  void _handleMenuAction(String action, Assignment assignment) {
    switch (action) {
      case 'close':
        // TODO: Implement close assignment
        break;
      case 'duplicate':
        _duplicateAssignment(assignment);
        break;
      case 'edit':
        context.push('/assignments/${assignment.id}/edit');
        break;
      case 'delete':
        _deleteAssignment(assignment);
        break;
    }
  }

  Future<void> _duplicateAssignment(Assignment assignment) async {
    final duplicated = await ref.read(assignmentsProvider.notifier).duplicateAssignment(assignment.id);
    if (duplicated != null && mounted) {
      context.push('/assignments/${duplicated.id}');
    }
  }

  Future<void> _deleteAssignment(Assignment assignment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Assignment'),
        content: const Text('Are you sure? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(assignmentsProvider.notifier).deleteAssignment(assignment.id);
      if (mounted) context.pop();
    }
  }

  void _gradeAll(Assignment assignment, List<Submission> submissions) {
    // Navigate to bulk grading screen
    context.push('/assignments/${assignment.id}/grade-all');
  }

  Future<void> _markMissingAsZero(String assignmentId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mark Missing as Zero'),
        content: const Text('This will give all missing submissions a grade of 0. Continue?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(submissionsProvider(assignmentId).notifier).markMissingAsZero();
    }
  }
}

/// List tile for a submission.
class SubmissionListTile extends StatelessWidget {
  const SubmissionListTile({
    super.key,
    required this.submission,
    required this.assignment,
    required this.onTap,
  });

  final Submission submission;
  final Assignment assignment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: _getStatusColor().withOpacity(0.1),
        child: Icon(_getStatusIcon(), color: _getStatusColor()),
      ),
      title: Text(submission.studentName ?? 'Student ${submission.studentId}'),
      subtitle: Row(
        children: [
          Text(_getStatusText()),
          if (submission.isLate) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('Late', style: TextStyle(fontSize: 12, color: Colors.orange)),
            ),
          ],
        ],
      ),
      trailing: _buildGradeDisplay(context),
    );
  }

  Widget _buildGradeDisplay(BuildContext context) {
    if (submission.isExcused) {
      return const Chip(label: Text('EX'));
    }
    if (submission.status == SubmissionStatus.missing) {
      return const Text('Missing', style: TextStyle(color: Colors.red));
    }
    if (submission.status == SubmissionStatus.notSubmitted) {
      return const Text('-', style: TextStyle(color: Colors.grey));
    }
    if (!submission.isGraded) {
      return const Text('Ungraded', style: TextStyle(color: Colors.orange));
    }

    final grade = submission.pointsEarned ?? 0;
    return Text(
      '${grade.toStringAsFixed(grade % 1 == 0 ? 0 : 1)}/${assignment.pointsPossible.toStringAsFixed(0)}',
      style: Theme.of(context).textTheme.titleMedium,
    );
  }

  String _getStatusText() {
    switch (submission.status) {
      case SubmissionStatus.notSubmitted:
        return 'Not submitted';
      case SubmissionStatus.submitted:
        return 'Submitted';
      case SubmissionStatus.late:
        return 'Submitted late';
      case SubmissionStatus.graded:
        return 'Graded';
      case SubmissionStatus.returned:
        return 'Returned';
      case SubmissionStatus.missing:
        return 'Missing';
      case SubmissionStatus.excused:
        return 'Excused';
    }
  }

  Color _getStatusColor() {
    switch (submission.status) {
      case SubmissionStatus.notSubmitted:
        return Colors.grey;
      case SubmissionStatus.submitted:
        return Colors.blue;
      case SubmissionStatus.late:
        return Colors.orange;
      case SubmissionStatus.graded:
        return Colors.green;
      case SubmissionStatus.returned:
        return Colors.teal;
      case SubmissionStatus.missing:
        return Colors.red;
      case SubmissionStatus.excused:
        return Colors.purple;
    }
  }

  IconData _getStatusIcon() {
    switch (submission.status) {
      case SubmissionStatus.notSubmitted:
        return Icons.remove_circle_outline;
      case SubmissionStatus.submitted:
        return Icons.upload_file;
      case SubmissionStatus.late:
        return Icons.schedule;
      case SubmissionStatus.graded:
        return Icons.check_circle;
      case SubmissionStatus.returned:
        return Icons.assignment_return;
      case SubmissionStatus.missing:
        return Icons.error_outline;
      case SubmissionStatus.excused:
        return Icons.do_not_disturb;
    }
  }
}
