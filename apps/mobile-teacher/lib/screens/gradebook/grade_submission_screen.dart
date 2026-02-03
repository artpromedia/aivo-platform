/// Grade Submission Screen
///
/// Screen for grading a single submission.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/models.dart';
import '../../providers/providers.dart';

/// Screen for viewing and grading a submission.
class GradeSubmissionScreen extends ConsumerStatefulWidget {
  const GradeSubmissionScreen({
    super.key,
    required this.assignmentId,
    required this.submissionId,
  });

  final String assignmentId;
  final String submissionId;

  @override
  ConsumerState<GradeSubmissionScreen> createState() => _GradeSubmissionScreenState();
}

class _GradeSubmissionScreenState extends ConsumerState<GradeSubmissionScreen> {
  final _pointsController = TextEditingController();
  final _feedbackController = TextEditingController();
  bool _isExcused = false;
  bool _applyLatePenalty = true;
  bool _isSaving = false;
  bool _syncToClassroom = true;
  GradeSyncStatus? _lastSyncStatus;

  Submission? _submission;
  Assignment? _assignment;

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadSyncSettings();
  }

  Future<void> _loadSyncSettings() async {
    // Load passback settings to get default sync behavior
    final settingsState = ref.read(passbackSettingsProvider);
    if (mounted) {
      setState(() {
        _syncToClassroom = settingsState.settings.syncOnGradeSubmit;
      });
    }
  }

  Future<void> _loadData() async {
    final assignmentRepo = ref.read(assignmentRepositoryProvider);
    final assignment = await assignmentRepo.getAssignment(widget.assignmentId);
    final submission = await assignmentRepo.getSubmission(widget.submissionId);

    if (mounted && assignment != null && submission != null) {
      setState(() {
        _assignment = assignment;
        _submission = submission;
        _pointsController.text = submission.pointsEarned?.toString() ?? '';
        _feedbackController.text = submission.feedback ?? '';
        _isExcused = submission.isExcused;
        _applyLatePenalty = submission.isLate;
      });
    }
  }

  @override
  void dispose() {
    _pointsController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_assignment == null || _submission == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Grade Submission')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final assignment = _assignment!;
    final submission = _submission!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grade Submission'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveGrade,
            child: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student info card
            Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text(submission.studentName ?? 'Student'),
                subtitle: Text(_getStatusText(submission)),
                trailing: submission.isLate
                    ? Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AivoBrand.warning,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Late',
                          style: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 16),

            // Assignment info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      assignment.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Points possible: ${assignment.pointsPossible.toStringAsFixed(0)}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (assignment.categoryName != null)
                      Text(
                        'Category: ${assignment.categoryName}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Attachments section
            if (submission.attachments.isNotEmpty) ...[
              Text(
                'Submission Files',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Card(
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: submission.attachments.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final attachment = submission.attachments[index];
                    return ListTile(
                      leading: const Icon(Icons.attach_file),
                      title: Text(attachment.name),
                      trailing: const Icon(Icons.open_in_new),
                      onTap: () => _openAttachment(attachment),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Grade input section
            Text(
              'Grade',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _pointsController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    enabled: !_isExcused,
                    decoration: InputDecoration(
                      labelText: 'Points',
                      suffixText: '/ ${assignment.pointsPossible.toStringAsFixed(0)}',
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (_) => _updatePreview(),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        _calculatePercent(),
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: _getPercentColor(),
                            ),
                      ),
                      Text(
                        _calculateLetterGrade(),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Quick grade buttons
            Wrap(
              spacing: 8,
              children: [
                _buildQuickGradeButton(assignment.pointsPossible, 'Full'),
                _buildQuickGradeButton(assignment.pointsPossible * 0.9, '90%'),
                _buildQuickGradeButton(assignment.pointsPossible * 0.8, '80%'),
                _buildQuickGradeButton(assignment.pointsPossible * 0.7, '70%'),
                _buildQuickGradeButton(assignment.pointsPossible * 0.5, '50%'),
                _buildQuickGradeButton(0, '0'),
              ],
            ),
            const SizedBox(height: 24),

            // Excused toggle
            SwitchListTile(
              title: const Text('Excuse from assignment'),
              subtitle: const Text('Grade will not count toward final grade'),
              value: _isExcused,
              onChanged: (v) => setState(() {
                _isExcused = v;
                if (v) _pointsController.clear();
              }),
            ),

            // Late penalty toggle (if applicable)
            if (submission.isLate && assignment.latePenaltyPercent != null)
              SwitchListTile(
                title: const Text('Apply late penalty'),
                subtitle: Text('${assignment.latePenaltyPercent}% deduction'),
                value: _applyLatePenalty,
                onChanged: _isExcused ? null : (v) => setState(() => _applyLatePenalty = v),
              ),

            // Google Classroom sync toggle
            _buildClassroomSyncSection(),

            const SizedBox(height: 24),

            // Feedback
            Text(
              'Feedback',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _feedbackController,
              maxLines: 5,
              decoration: const InputDecoration(
                hintText: 'Enter feedback for the student...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.pop(),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FilledButton(
                    onPressed: _isSaving ? null : _saveGrade,
                    child: const Text('Save Grade'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Save and next button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _isSaving ? null : _saveAndNext,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Save & Grade Next'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickGradeButton(double points, String label) {
    return ActionChip(
      label: Text(label),
      onPressed: _isExcused
          ? null
          : () {
              _pointsController.text = points.toStringAsFixed(points % 1 == 0 ? 0 : 1);
              _updatePreview();
            },
    );
  }

  Widget _buildClassroomSyncSection() {
    final isConnected = ref.watch(isLmsConnectedProvider);

    if (!isConnected) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          SwitchListTile(
            secondary: Icon(
              Icons.school,
              color: _syncToClassroom ? AivoBrand.mint[600] : theme.colorScheme.outline,
            ),
            title: const Text('Sync to Google Classroom'),
            subtitle: Text(
              _syncToClassroom
                  ? 'Grade will be synced to Google Classroom'
                  : 'Grade will only be saved in AIVO',
            ),
            value: _syncToClassroom,
            onChanged: (v) => setState(() => _syncToClassroom = v),
          ),

          // Show last sync status if available
          if (_lastSyncStatus != null)
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
              child: Row(
                children: [
                  _buildSyncStatusBadge(_lastSyncStatus!),
                  const SizedBox(width: 8),
                  Text(
                    _getSyncStatusText(_lastSyncStatus!),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _getSyncStatusColor(_lastSyncStatus!),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSyncStatusBadge(GradeSyncStatus status) {
    final (color, icon) = switch (status) {
      GradeSyncStatus.pending => (AivoBrand.warning, Icons.schedule),
      GradeSyncStatus.synced => (AivoBrand.success, Icons.check_circle),
      GradeSyncStatus.failed => (AivoBrand.error, Icons.error),
      GradeSyncStatus.retrying => (Colors.blue, Icons.refresh),
    };

    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 14, color: color),
    );
  }

  String _getSyncStatusText(GradeSyncStatus status) {
    return switch (status) {
      GradeSyncStatus.pending => 'Waiting to sync',
      GradeSyncStatus.synced => 'Synced to Google Classroom',
      GradeSyncStatus.failed => 'Sync failed - will retry',
      GradeSyncStatus.retrying => 'Retrying sync...',
    };
  }

  Color _getSyncStatusColor(GradeSyncStatus status) {
    return switch (status) {
      GradeSyncStatus.pending => AivoBrand.warning,
      GradeSyncStatus.synced => AivoBrand.success,
      GradeSyncStatus.failed => AivoBrand.error,
      GradeSyncStatus.retrying => Colors.blue,
    };
  }

  String _getStatusText(Submission submission) {
    if (submission.submittedAt != null) {
      return 'Submitted ${_formatDate(submission.submittedAt!)}';
    }
    return submission.status.name;
  }

  String _formatDate(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'just now';
  }

  String _calculatePercent() {
    if (_isExcused) return 'EX';
    final points = double.tryParse(_pointsController.text);
    if (points == null || _assignment == null) return '-';
    final percent = (points / _assignment!.pointsPossible) * 100;
    return '${percent.toStringAsFixed(1)}%';
  }

  String _calculateLetterGrade() {
    if (_isExcused) return 'Excused';
    final points = double.tryParse(_pointsController.text);
    if (points == null || _assignment == null) return '-';
    final percent = (points / _assignment!.pointsPossible) * 100;
    return GradeScale.standard.getLetterGrade(percent);
  }

  Color? _getPercentColor() {
    if (_isExcused) return Colors.blue;
    final points = double.tryParse(_pointsController.text);
    if (points == null || _assignment == null) return null;
    final percent = (points / _assignment!.pointsPossible) * 100;
    if (percent >= 90) return AivoBrand.success;
    if (percent >= 80) return Colors.lightGreen;
    if (percent >= 70) return AivoBrand.warning;
    if (percent >= 60) return Colors.deepOrange;
    return AivoBrand.error;
  }

  void _updatePreview() {
    setState(() {});
  }

  Future<void> _openAttachment(SubmissionAttachment attachment) async {
    final uri = Uri.tryParse(attachment.url);
    if (uri == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid attachment URL')),
        );
      }
      return;
    }

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Cannot open ${attachment.name}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to open attachment: $e')),
        );
      }
    }
  }

  Future<void> _saveGrade() async {
    setState(() => _isSaving = true);

    try {
      final points = _isExcused ? null : double.tryParse(_pointsController.text);
      final dto = GradeSubmissionDto(
        pointsEarned: points,
        feedback: _feedbackController.text.isEmpty ? null : _feedbackController.text,
        isExcused: _isExcused,
        applyLatePenalty: _applyLatePenalty,
      );

      await ref
          .read(submissionsProvider(widget.assignmentId).notifier)
          .gradeSubmission(widget.submissionId, dto);

      // Sync to Google Classroom if enabled
      if (_syncToClassroom && !_isExcused && points != null) {
        await _syncGradeToClassroom(points);
      }

      if (mounted) {
        final message = _syncToClassroom && !_isExcused
            ? 'Grade saved and syncing to Google Classroom'
            : 'Grade saved';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving grade: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _syncGradeToClassroom(double points) async {
    final submission = _submission;
    final assignment = _assignment;

    if (submission == null || assignment == null) return;

    setState(() => _lastSyncStatus = GradeSyncStatus.pending);

    try {
      // Queue for passback (this will sync immediately if online, or queue if offline)
      await ref.read(passbackQueueProvider.notifier).queueGrade(
            gradeId: '${submission.id}_${DateTime.now().millisecondsSinceEpoch}',
            studentId: submission.studentId,
            studentName: submission.studentName ?? 'Student',
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            score: points,
            maxPoints: assignment.pointsPossible,
          );

      if (mounted) {
        setState(() => _lastSyncStatus = GradeSyncStatus.synced);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _lastSyncStatus = GradeSyncStatus.failed);
      }
    }
  }

  Future<void> _saveAndNext() async {
    setState(() => _isSaving = true);

    try {
      final points = _isExcused ? null : double.tryParse(_pointsController.text);
      final dto = GradeSubmissionDto(
        pointsEarned: points,
        feedback: _feedbackController.text.isEmpty ? null : _feedbackController.text,
        isExcused: _isExcused,
        applyLatePenalty: _applyLatePenalty,
      );

      await ref
          .read(submissionsProvider(widget.assignmentId).notifier)
          .gradeSubmission(widget.submissionId, dto);

      // Sync to Google Classroom if enabled
      if (_syncToClassroom && !_isExcused && points != null) {
        await _syncGradeToClassroom(points);
      }

      if (!mounted) return;

      // Find the next ungraded submission
      final submissionsState = ref.read(submissionsProvider(widget.assignmentId));
      final ungradedSubmissions = submissionsState.submissions
          .where((s) =>
              s.id != widget.submissionId &&
              (s.status == SubmissionStatus.submitted ||
               s.status == SubmissionStatus.late))
          .toList();

      if (ungradedSubmissions.isEmpty) {
        // No more submissions to grade
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('All submissions have been graded!'),
            backgroundColor: AivoBrand.success,
          ),
        );
        context.pop();
      } else {
        // Navigate to next ungraded submission
        final nextSubmission = ungradedSubmissions.first;
        final message = _syncToClassroom && !_isExcused
            ? 'Grade saved & syncing. Moving to next...'
            : 'Grade saved. Moving to next submission...';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );

        // Replace current route with next submission
        context.pushReplacement(
          '/assignments/${widget.assignmentId}/submissions/${nextSubmission.id}/grade',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving grade: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }
}
