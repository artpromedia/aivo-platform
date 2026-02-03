/// Assessment Builder Screen
///
/// Create or edit assessments with questions, settings, and configuration.
/// Supports multiple assessment types and question types.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/assessment.dart';
import '../../providers/assessment_provider.dart';
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _QuestionBankSheet(
        onImport: (questions) {
          for (final question in questions) {
            ref.read(currentAssessmentProvider.notifier).addQuestion(question);
          }
        },
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

/// Question bank import sheet
class _QuestionBankSheet extends StatefulWidget {
  const _QuestionBankSheet({
    required this.onImport,
  });

  final void Function(List<Question>) onImport;

  @override
  State<_QuestionBankSheet> createState() => _QuestionBankSheetState();
}

class _QuestionBankSheetState extends State<_QuestionBankSheet> {
  final _searchController = TextEditingController();
  final Set<String> _selectedQuestionIds = {};
  QuestionType? _filterType;
  String _sourceFilter = 'all'; // 'all', 'my', 'shared'

  // Sample questions from the question bank
  // In real implementation, this would come from a provider
  final List<_BankQuestion> _bankQuestions = [
    _BankQuestion(
      id: 'bank_1',
      text: 'What is the capital of France?',
      type: QuestionType.multipleChoice,
      points: 1,
      difficulty: Difficulty.easy,
      tags: ['geography', 'europe'],
      timesUsed: 12,
    ),
    _BankQuestion(
      id: 'bank_2',
      text: 'Solve for x: 2x + 5 = 13',
      type: QuestionType.shortAnswer,
      points: 2,
      difficulty: Difficulty.medium,
      tags: ['math', 'algebra'],
      timesUsed: 8,
    ),
    _BankQuestion(
      id: 'bank_3',
      text: 'The mitochondria is the powerhouse of the cell.',
      type: QuestionType.trueFalse,
      points: 1,
      difficulty: Difficulty.easy,
      tags: ['biology', 'cells'],
      timesUsed: 25,
    ),
    _BankQuestion(
      id: 'bank_4',
      text: 'Explain the process of photosynthesis and its importance to life on Earth.',
      type: QuestionType.essay,
      points: 10,
      difficulty: Difficulty.hard,
      tags: ['biology', 'ecology'],
      timesUsed: 5,
    ),
    _BankQuestion(
      id: 'bank_5',
      text: 'Match the following countries with their capitals:',
      type: QuestionType.matching,
      points: 4,
      difficulty: Difficulty.medium,
      tags: ['geography', 'world'],
      timesUsed: 15,
    ),
  ];

  List<_BankQuestion> get _filteredQuestions {
    return _bankQuestions.where((q) {
      if (_filterType != null && q.type != _filterType) return false;
      if (_searchController.text.isNotEmpty) {
        final query = _searchController.text.toLowerCase();
        if (!q.text.toLowerCase().contains(query) &&
            !q.tags.any((t) => t.toLowerCase().contains(query))) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filtered = _filteredQuestions;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Icon(Icons.library_books, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Question Bank',
                        style: theme.textTheme.titleLarge,
                      ),
                      const Spacer(),
                      if (_selectedQuestionIds.isNotEmpty)
                        Badge(
                          label: Text('${_selectedQuestionIds.length}'),
                          child: const SizedBox.shrink(),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Search
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search questions...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ],
              ),
            ),

            // Filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  FilterChip(
                    label: const Text('All Types'),
                    selected: _filterType == null,
                    onSelected: (_) => setState(() => _filterType = null),
                  ),
                  const SizedBox(width: 8),
                  ...QuestionType.values.take(5).map((type) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(type.label),
                      selected: _filterType == type,
                      onSelected: (_) => setState(() => _filterType = type),
                    ),
                  )),
                ],
              ),
            ),
            const Divider(height: 1),

            // Questions list
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text(
                            'No questions found',
                            style: theme.textTheme.titleSmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      controller: scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final question = filtered[index];
                        final isSelected = _selectedQuestionIds.contains(question.id);
                        return _BankQuestionTile(
                          question: question,
                          isSelected: isSelected,
                          onToggle: () {
                            setState(() {
                              if (isSelected) {
                                _selectedQuestionIds.remove(question.id);
                              } else {
                                _selectedQuestionIds.add(question.id);
                              }
                            });
                          },
                        );
                      },
                    ),
            ),

            // Import button
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${_selectedQuestionIds.length} questions selected',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: _selectedQuestionIds.isEmpty
                          ? null
                          : () {
                              final selected = _bankQuestions
                                  .where((q) => _selectedQuestionIds.contains(q.id))
                                  .map((q) => q.toQuestion())
                                  .toList();
                              widget.onImport(selected);
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Imported ${selected.length} questions'),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                      child: const Text('Import'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _BankQuestion {
  const _BankQuestion({
    required this.id,
    required this.text,
    required this.type,
    required this.points,
    required this.difficulty,
    required this.tags,
    required this.timesUsed,
  });

  final String id;
  final String text;
  final QuestionType type;
  final double points;
  final Difficulty difficulty;
  final List<String> tags;
  final int timesUsed;

  Question toQuestion() {
    return Question(
      id: 'imported_${DateTime.now().millisecondsSinceEpoch}_$id',
      text: text,
      type: type,
      points: points,
      difficulty: difficulty,
      options: type == QuestionType.multipleChoice
          ? [
              AnswerOption(id: '1', text: 'Option A', isCorrect: true),
              AnswerOption(id: '2', text: 'Option B', isCorrect: false),
              AnswerOption(id: '3', text: 'Option C', isCorrect: false),
              AnswerOption(id: '4', text: 'Option D', isCorrect: false),
            ]
          : [],
      correctAnswer: type == QuestionType.trueFalse ? 'true' : null,
    );
  }
}

class _BankQuestionTile extends StatelessWidget {
  const _BankQuestionTile({
    required this.question,
    required this.isSelected,
    required this.onToggle,
  });

  final _BankQuestion question;
  final bool isSelected;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: isSelected ? 2 : 0,
      color: isSelected ? theme.colorScheme.primaryContainer.withOpacity(0.3) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outlineVariant,
        ),
      ),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(
                value: isSelected,
                onChanged: (_) => onToggle(),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      question.text,
                      style: theme.textTheme.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        _MiniChip(
                          icon: _getTypeIcon(question.type),
                          label: question.type.label,
                        ),
                        _MiniChip(
                          icon: Icons.grade,
                          label: '${question.points.toStringAsFixed(0)} pts',
                        ),
                        _MiniChip(
                          icon: Icons.signal_cellular_alt,
                          label: question.difficulty.label,
                          color: _getDifficultyColor(question.difficulty),
                        ),
                        _MiniChip(
                          icon: Icons.repeat,
                          label: 'Used ${question.timesUsed}x',
                        ),
                      ],
                    ),
                    if (question.tags.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 4,
                        children: question.tags.map((tag) => Chip(
                          label: Text(tag),
                          labelStyle: const TextStyle(fontSize: 10),
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                        )).toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getTypeIcon(QuestionType type) {
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

  Color _getDifficultyColor(Difficulty difficulty) {
    switch (difficulty) {
      case Difficulty.easy:
        return Colors.green;
      case Difficulty.medium:
        return Colors.orange;
      case Difficulty.hard:
        return Colors.red;
    }
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({
    required this.icon,
    required this.label,
    this.color,
  });

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Colors.grey[600];

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: effectiveColor),
        const SizedBox(width: 2),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: effectiveColor),
        ),
      ],
    );
  }
}
