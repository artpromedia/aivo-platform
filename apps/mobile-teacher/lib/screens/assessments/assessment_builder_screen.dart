/// Assessment Builder Screen
///
/// Create or edit assessments with questions, settings, and configuration.
/// Supports multiple assessment types and question types.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/assessment.dart';
import '../../providers/assessment_provider.dart';
import '../../repositories/assessment_repository.dart';
import 'question_editor_screen.dart';
import 'assessment_preview_screen.dart';
import 'assessment_settings_screen.dart';

/// Screen for creating/editing an assessment
class AssessmentBuilderScreen extends ConsumerStatefulWidget {
  const AssessmentBuilderScreen({
    required this.classId,
    this.assessmentId,
    this.type = AssessmentType.quiz,
    this.name,
    super.key,
  });

  final String classId;
  final String? assessmentId;
  final AssessmentType type;
  final String? name;

  bool get isEditing => assessmentId != null;

  @override
  ConsumerState<AssessmentBuilderScreen> createState() =>
      _AssessmentBuilderScreenState();
}

class _AssessmentBuilderScreenState
    extends ConsumerState<AssessmentBuilderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _instructionsController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _initializeAssessment();
  }

  Future<void> _initializeAssessment() async {
    final notifier = ref.read(currentAssessmentProvider.notifier);

    if (widget.isEditing) {
      await notifier.loadAssessment(widget.assessmentId!);
    } else {
      notifier.createNew(
        classId: widget.classId,
        type: widget.type,
        name: widget.name,
      );
    }

    final state = ref.read(currentAssessmentProvider);
    if (state.assessment != null) {
      _nameController.text = state.assessment!.name;
      _descriptionController.text = state.assessment!.description ?? '';
      _instructionsController.text = state.assessment!.instructions ?? '';
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(currentAssessmentProvider);
    final theme = Theme.of(context);

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (state.assessment == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Failed to load assessment'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    final assessment = state.assessment!;
    final hasUnsavedChanges = ref.watch(hasUnsavedChangesProvider);

    return WillPopScope(
      onWillPop: () => _onWillPop(hasUnsavedChanges),
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing ? 'Edit Assessment' : 'New Assessment'),
          actions: [
            if (hasUnsavedChanges)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Center(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Unsaved',
                      style: TextStyle(
                        color: Colors.orange,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            IconButton(
              icon: const Icon(Icons.preview),
              onPressed: () => _previewAssessment(context),
              tooltip: 'Preview',
            ),
            IconButton(
              icon: const Icon(Icons.settings),
              onPressed: () => _openSettings(context),
              tooltip: 'Settings',
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'save':
                    _saveAssessment();
                    break;
                  case 'publish':
                    _publishAssessment();
                    break;
                  case 'save_draft':
                    _saveAsDraft();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'save',
                  child: ListTile(
                    leading: Icon(Icons.save),
                    title: Text('Save'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem(
                  value: 'save_draft',
                  child: ListTile(
                    leading: Icon(Icons.drafts),
                    title: Text('Save as Draft'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                if (assessment.status == AssessmentStatus.draft)
                  const PopupMenuItem(
                    value: 'publish',
                    child: ListTile(
                      leading: Icon(Icons.publish, color: Colors.green),
                      title: Text('Save & Publish',
                          style: TextStyle(color: Colors.green)),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
              ],
            ),
          ],
        ),
        body: _isSaving
            ? const Center(child: CircularProgressIndicator())
            : Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Basic info card
                      _buildBasicInfoCard(context, assessment),
                      const SizedBox(height: 16),

                      // Questions section
                      _buildQuestionsSection(context, assessment),
                      const SizedBox(height: 16),

                      // Summary card
                      _buildSummaryCard(context, assessment),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
              ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _addQuestion(context),
          icon: const Icon(Icons.add),
          label: const Text('Add Question'),
        ),
      ),
    );
  }

  Widget _buildBasicInfoCard(BuildContext context, Assessment assessment) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getTypeIcon(assessment.type),
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Assessment Details',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Name
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name *',
                hintText: 'Enter assessment name',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a name';
                }
                return null;
              },
              onChanged: (value) {
                ref.read(currentAssessmentProvider.notifier).updateBasicInfo(
                      name: value,
                    );
              },
            ),
            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Enter a brief description',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              onChanged: (value) {
                ref.read(currentAssessmentProvider.notifier).updateBasicInfo(
                      description: value.isEmpty ? null : value,
                    );
              },
            ),
            const SizedBox(height: 16),

            // Instructions
            TextFormField(
              controller: _instructionsController,
              decoration: const InputDecoration(
                labelText: 'Instructions',
                hintText: 'Instructions for students...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              onChanged: (value) {
                ref.read(currentAssessmentProvider.notifier).updateBasicInfo(
                      instructions: value.isEmpty ? null : value,
                    );
              },
            ),
            const SizedBox(height: 16),

            // Type selector
            Row(
              children: [
                Text(
                  'Type: ',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(width: 8),
                DropdownButton<AssessmentType>(
                  value: assessment.type,
                  items: AssessmentType.values.map((type) {
                    return DropdownMenuItem(
                      value: type,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_getTypeIcon(type), size: 20),
                          const SizedBox(width: 8),
                          Text(type.label),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (type) {
                    if (type != null) {
                      ref
                          .read(currentAssessmentProvider.notifier)
                          .updateBasicInfo(type: type);
                    }
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionsSection(BuildContext context, Assessment assessment) {
    final theme = Theme.of(context);
    final questions = ref.watch(currentAssessmentQuestionsProvider);

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(Icons.quiz_outlined, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Questions (${questions.length})',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => _importFromBank(context),
                  icon: const Icon(Icons.library_add, size: 18),
                  label: const Text('Import'),
                ),
              ],
            ),
          ),

          if (questions.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.quiz_outlined, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(
                      'No questions yet',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tap "Add Question" to get started',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: questions.length,
              onReorder: (oldIndex, newIndex) {
                ref.read(currentAssessmentProvider.notifier).reorderQuestions(
                      oldIndex,
                      newIndex > oldIndex ? newIndex - 1 : newIndex,
                    );
              },
              itemBuilder: (context, index) {
                final question = questions[index];
                return _QuestionListItem(
                  key: ValueKey(question.id),
                  question: question,
                  index: index,
                  onTap: () => _editQuestion(context, question),
                  onDelete: () => _deleteQuestion(context, question),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(BuildContext context, Assessment assessment) {
    final theme = Theme.of(context);
    final totalPoints = ref.watch(totalPointsProvider);
    final questions = ref.watch(currentAssessmentQuestionsProvider);
    final settings = ref.watch(currentAssessmentSettingsProvider);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.summarize, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Summary',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _SummaryRow(
              icon: Icons.quiz,
              label: 'Questions',
              value: '${questions.length}',
            ),
            const SizedBox(height: 8),
            _SummaryRow(
              icon: Icons.grade,
              label: 'Total Points',
              value: totalPoints.toStringAsFixed(0),
            ),
            const SizedBox(height: 8),
            _SummaryRow(
              icon: Icons.timer,
              label: 'Time Limit',
              value: settings?.timeLimit != null
                  ? '${settings!.timeLimit} min'
                  : 'No limit',
            ),
            const SizedBox(height: 8),
            _SummaryRow(
              icon: Icons.visibility,
              label: 'Status',
              value: assessment.status.name.toUpperCase(),
              valueColor: assessment.status == AssessmentStatus.published
                  ? Colors.green
                  : Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _onWillPop(bool hasUnsavedChanges) async {
    if (!hasUnsavedChanges) return true;

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unsaved Changes'),
        content: const Text('You have unsaved changes. What would you like to do?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'discard'),
            child: const Text('Discard'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'cancel'),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'save'),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result == 'discard') {
      return true;
    } else if (result == 'save') {
      await _saveAssessment();
      return true;
    }
    return false;
  }

  void _addQuestion(BuildContext context) {
    _showQuestionTypeDialog(context);
  }

  void _showQuestionTypeDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Select Question Type',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: QuestionType.values.map((type) {
                  return ActionChip(
                    avatar: Icon(_getQuestionTypeIcon(type), size: 18),
                    label: Text(type.label),
                    onPressed: () {
                      Navigator.pop(context);
                      _navigateToQuestionEditor(context, type: type);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  void _editQuestion(BuildContext context, Question question) {
    _navigateToQuestionEditor(context, question: question);
  }

  Future<void> _navigateToQuestionEditor(
    BuildContext context, {
    Question? question,
    QuestionType? type,
  }) async {
    final result = await Navigator.push<Question>(
      context,
      MaterialPageRoute(
        builder: (context) => QuestionEditorScreen(
          question: question,
          questionType: type ?? question?.type ?? QuestionType.multipleChoice,
          questionIndex: question != null
              ? ref.read(currentAssessmentQuestionsProvider).indexOf(question)
              : ref.read(currentAssessmentQuestionsProvider).length,
        ),
      ),
    );

    if (result != null && mounted) {
      final notifier = ref.read(currentAssessmentProvider.notifier);
      if (question != null) {
        notifier.updateQuestion(result);
      } else {
        notifier.addQuestion(result);
      }
    }
  }

  Future<void> _deleteQuestion(BuildContext context, Question question) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Question?'),
        content: const Text('Are you sure you want to delete this question?'),
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

    if (confirm == true) {
      ref.read(currentAssessmentProvider.notifier).removeQuestion(question.id);
    }
  }

  void _importFromBank(BuildContext context) {
    // TODO: Implement question bank import
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Question bank import coming soon'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _previewAssessment(BuildContext context) {
    final assessment = ref.read(currentAssessmentProvider).assessment;
    if (assessment == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AssessmentPreviewScreen(
          assessment: assessment,
        ),
      ),
    );
  }

  void _openSettings(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const AssessmentSettingsScreen(),
      ),
    );
  }

  Future<void> _saveAssessment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      await ref.read(currentAssessmentProvider.notifier).save();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Assessment saved'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _saveAsDraft() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      await ref.read(currentAssessmentProvider.notifier).save();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Draft saved'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _publishAssessment() async {
    if (!_formKey.currentState!.validate()) return;

    final questions = ref.read(currentAssessmentQuestionsProvider);
    if (questions.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add at least one question before publishing'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish Assessment?'),
        content: const Text(
          'Publishing will make this assessment available to students. '
          'You will not be able to edit questions after publishing.',
        ),
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

    if (confirm != true) return;

    setState(() => _isSaving = true);

    try {
      await ref.read(currentAssessmentProvider.notifier).saveAndPublish();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Assessment published'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to publish: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  IconData _getTypeIcon(AssessmentType type) {
    switch (type) {
      case AssessmentType.quiz:
        return Icons.quiz;
      case AssessmentType.test:
        return Icons.assignment;
      case AssessmentType.exam:
        return Icons.school;
      case AssessmentType.practice:
        return Icons.fitness_center;
      case AssessmentType.survey:
        return Icons.poll;
      case AssessmentType.diagnostic:
        return Icons.analytics;
    }
  }

  IconData _getQuestionTypeIcon(QuestionType type) {
    switch (type) {
      case QuestionType.multipleChoice:
        return Icons.radio_button_checked;
      case QuestionType.multipleSelect:
        return Icons.check_box;
      case QuestionType.trueFalse:
        return Icons.thumbs_up_down;
      case QuestionType.shortAnswer:
        return Icons.short_text;
      case QuestionType.essay:
        return Icons.article;
      case QuestionType.fillBlank:
        return Icons.space_bar;
      case QuestionType.matching:
        return Icons.compare_arrows;
      case QuestionType.ordering:
        return Icons.format_list_numbered;
      case QuestionType.numeric:
        return Icons.numbers;
    }
  }
}

// ==========================================================================
// WIDGETS
// ==========================================================================

class _QuestionListItem extends StatelessWidget {
  const _QuestionListItem({
    required super.key,
    required this.question,
    required this.index,
    required this.onTap,
    required this.onDelete,
  });

  final Question question;
  final int index;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            '${index + 1}',
            style: TextStyle(
              color: theme.colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          question.text,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Row(
          children: [
            Icon(_getQuestionTypeIcon(question.type),
                size: 14, color: Colors.grey[600]),
            const SizedBox(width: 4),
            Text(
              question.type.label,
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(width: 12),
            Icon(Icons.grade, size: 14, color: Colors.grey[600]),
            const SizedBox(width: 4),
            Text(
              '${question.points} pts',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: onDelete,
              color: Colors.red[400],
            ),
            const Icon(Icons.drag_handle, color: Colors.grey),
          ],
        ),
        onTap: onTap,
      ),
    );
  }

  IconData _getQuestionTypeIcon(QuestionType type) {
    switch (type) {
      case QuestionType.multipleChoice:
        return Icons.radio_button_checked;
      case QuestionType.multipleSelect:
        return Icons.check_box;
      case QuestionType.trueFalse:
        return Icons.thumbs_up_down;
      case QuestionType.shortAnswer:
        return Icons.short_text;
      case QuestionType.essay:
        return Icons.article;
      case QuestionType.fillBlank:
        return Icons.space_bar;
      case QuestionType.matching:
        return Icons.compare_arrows;
      case QuestionType.ordering:
        return Icons.format_list_numbered;
      case QuestionType.numeric:
        return Icons.numbers;
    }
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: valueColor,
          ),
        ),
      ],
    );
  }
}
