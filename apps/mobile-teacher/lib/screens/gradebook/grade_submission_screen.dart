/// Grade Submission Screen
///
/// Screen for grading a single submission.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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

  Submission? _submission;
  Assignment? _assignment;

  @override
  void initState() {
    super.initState();
    _loadData();
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
                          color: Colors.orange,
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
    if (percent >= 90) return Colors.green;
    if (percent >= 80) return Colors.lightGreen;
    if (percent >= 70) return Colors.orange;
    if (percent >= 60) return Colors.deepOrange;
    return Colors.red;
  }

  void _updatePreview() {
    setState(() {});
  }

  void _openAttachment(SubmissionAttachment attachment) {
    // TODO: Open attachment URL
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Opening ${attachment.name}...')),
    );
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

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Grade saved')),
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

  Future<void> _saveAndNext() async {
    await _saveGrade();
    // TODO: Navigate to next ungraded submission
  }
}
