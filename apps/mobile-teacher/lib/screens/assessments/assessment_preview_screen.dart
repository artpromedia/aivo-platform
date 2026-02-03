/// Assessment Preview Screen
///
/// Preview how the assessment will appear to students.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/assessment.dart';

/// Screen for previewing an assessment as students will see it
class AssessmentPreviewScreen extends ConsumerStatefulWidget {
  const AssessmentPreviewScreen({
    required this.assessment,
    super.key,
  });

  final Assessment assessment;

  @override
  ConsumerState<AssessmentPreviewScreen> createState() =>
      _AssessmentPreviewScreenState();
}

class _AssessmentPreviewScreenState
    extends ConsumerState<AssessmentPreviewScreen> {
  int _currentQuestionIndex = 0;
  bool _showInstructions = true;

  @override
  Widget build(BuildContext context) {
    final assessment = widget.assessment;
    final questions = assessment.questions;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Preview'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              setState(() => _showInstructions = true);
            },
            tooltip: 'Show Instructions',
          ),
        ],
      ),
      body: _showInstructions
          ? _buildInstructionsPage(context, assessment)
          : _buildQuestionPage(context, questions[_currentQuestionIndex]),
      bottomNavigationBar: _showInstructions
          ? null
          : _buildNavigationBar(context, questions),
    );
  }

  Widget _buildInstructionsPage(BuildContext context, Assessment assessment) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Center(
            child: Column(
              children: [
                Icon(
                  _getTypeIcon(assessment.type),
                  size: 64,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  assessment.name,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Chip(label: Text(assessment.type.label)),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Description
          if (assessment.description != null) ...[
            Text(
              'Description',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(assessment.description!),
            const SizedBox(height: 24),
          ],

          // Instructions
          if (assessment.instructions != null) ...[
            Text(
              'Instructions',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(assessment.instructions!),
            ),
            const SizedBox(height: 24),
          ],

          // Assessment info
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _InfoRow(
                    icon: Icons.quiz,
                    label: 'Questions',
                    value: '${assessment.questionCount}',
                  ),
                  const Divider(),
                  _InfoRow(
                    icon: Icons.grade,
                    label: 'Total Points',
                    value: '${assessment.totalPoints}',
                  ),
                  if (assessment.settings.timeLimit != null) ...[
                    const Divider(),
                    _InfoRow(
                      icon: Icons.timer,
                      label: 'Time Limit',
                      value: '${assessment.settings.timeLimit} minutes',
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Start button
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: assessment.questions.isNotEmpty
                  ? () {
                      setState(() {
                        _showInstructions = false;
                        _currentQuestionIndex = 0;
                      });
                    }
                  : null,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start Assessment'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionPage(BuildContext context, Question question) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question number and type
          Row(
            children: [
              CircleAvatar(
                child: Text('${_currentQuestionIndex + 1}'),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Question ${_currentQuestionIndex + 1} of ${widget.assessment.questions.length}',
                    style: theme.textTheme.labelMedium,
                  ),
                  Row(
                    children: [
                      Icon(
                        _getQuestionTypeIcon(question.type),
                        size: 14,
                        color: Colors.grey[600],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        question.type.label,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${question.points} pts',
                  style: TextStyle(
                    color: theme.colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Question text
          Text(
            question.stem,
            style: theme.textTheme.titleLarge,
          ),

          // Hint
          if (question.hint != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.lightbulb_outline,
                      color: Colors.amber[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Hint: ${question.hint}',
                      style: TextStyle(color: Colors.amber[900]),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),

          // Answer area (preview only)
          _buildAnswerPreview(context, question),
        ],
      ),
    );
  }

  Widget _buildAnswerPreview(BuildContext context, Question question) {
    switch (question.type) {
      case QuestionType.multipleChoice:
        return _buildMultipleChoicePreview(context, question, false);
      case QuestionType.multipleSelect:
        return _buildMultipleChoicePreview(context, question, true);
      case QuestionType.trueFalse:
        return _buildTrueFalsePreview(context);
      case QuestionType.shortAnswer:
        return _buildShortAnswerPreview(context);
      case QuestionType.essay:
        return _buildEssayPreview(context);
      case QuestionType.fillBlank:
        return _buildFillBlankPreview(context, question);
      case QuestionType.matching:
        return _buildMatchingPreview(context, question);
      case QuestionType.ordering:
        return _buildOrderingPreview(context, question);
      case QuestionType.numeric:
        return _buildNumericPreview(context);
    }
  }

  Widget _buildMultipleChoicePreview(
    BuildContext context,
    Question question,
    bool isMultiSelect,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isMultiSelect ? 'Select all that apply:' : 'Select one:',
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 12),
        ...(question.options ?? []).map((option) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: isMultiSelect
                  ? const Checkbox(value: false, onChanged: null)
                  : const Radio(value: false, groupValue: true, onChanged: null),
              title: Text(option.text),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildTrueFalsePreview(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Card(
            child: ListTile(
              leading: const Radio(
                value: true,
                groupValue: null,
                onChanged: null,
              ),
              title: const Text('True'),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Card(
            child: ListTile(
              leading: const Radio(
                value: false,
                groupValue: null,
                onChanged: null,
              ),
              title: const Text('False'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildShortAnswerPreview(BuildContext context) {
    return TextField(
      enabled: false,
      decoration: const InputDecoration(
        hintText: 'Type your answer here...',
        border: OutlineInputBorder(),
      ),
    );
  }

  Widget _buildEssayPreview(BuildContext context) {
    return TextField(
      enabled: false,
      maxLines: 8,
      decoration: const InputDecoration(
        hintText: 'Type your essay response here...',
        border: OutlineInputBorder(),
        alignLabelWithHint: true,
      ),
    );
  }

  Widget _buildFillBlankPreview(BuildContext context, Question question) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Fill in the blanks:',
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 12),
        ...(question.blanks ?? []).asMap().entries.map((entry) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TextField(
              enabled: false,
              decoration: InputDecoration(
                labelText: 'Blank ${entry.key + 1}',
                hintText: 'Type answer here...',
                border: const OutlineInputBorder(),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildMatchingPreview(BuildContext context, Question question) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Match the items:',
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: (question.pairs ?? []).map((pair) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(pair.left),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: (question.pairs ?? []).map((pair) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    color: Colors.grey[100],
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(pair.right),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildOrderingPreview(BuildContext context, Question question) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Drag to reorder:',
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 12),
        ...(question.options ?? []).asMap().entries.map((entry) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                radius: 14,
                child: Text('${entry.key + 1}'),
              ),
              title: Text(entry.value.text),
              trailing: const Icon(Icons.drag_handle),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildNumericPreview(BuildContext context) {
    return TextField(
      enabled: false,
      keyboardType: TextInputType.number,
      decoration: const InputDecoration(
        hintText: 'Enter a number...',
        border: OutlineInputBorder(),
      ),
    );
  }

  Widget _buildNavigationBar(BuildContext context, List<Question> questions) {
    final isFirst = _currentQuestionIndex == 0;
    final isLast = _currentQuestionIndex == questions.length - 1;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            OutlinedButton.icon(
              onPressed: isFirst
                  ? () => setState(() => _showInstructions = true)
                  : () => setState(() => _currentQuestionIndex--),
              icon: const Icon(Icons.arrow_back),
              label: Text(isFirst ? 'Back' : 'Previous'),
            ),
            const Spacer(),
            // Question dots
            ...List.generate(questions.length, (index) {
              return Container(
                width: 10,
                height: 10,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index == _currentQuestionIndex
                      ? Theme.of(context).colorScheme.primary
                      : Colors.grey[300],
                ),
              );
            }),
            const Spacer(),
            FilledButton.icon(
              onPressed: isLast
                  ? () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('This is a preview - Submit is disabled'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  : () => setState(() => _currentQuestionIndex++),
              icon: Icon(isLast ? Icons.check : Icons.arrow_forward),
              label: Text(isLast ? 'Submit' : 'Next'),
            ),
          ],
        ),
      ),
    );
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

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(label),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
