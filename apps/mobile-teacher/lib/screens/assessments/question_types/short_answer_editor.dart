/// Short Answer Editor
///
/// Editor widget for short answer questions.
/// Allows multiple accepted answers with case sensitivity options.
library;

import 'package:flutter/material.dart';

/// Editor for short answer questions
class ShortAnswerEditor extends StatefulWidget {
  const ShortAnswerEditor({
    required this.acceptedAnswers,
    required this.onAnswersChanged,
    super.key,
  });

  final List<String> acceptedAnswers;
  final ValueChanged<List<String>> onAnswersChanged;

  @override
  State<ShortAnswerEditor> createState() => _ShortAnswerEditorState();
}

class _ShortAnswerEditorState extends State<ShortAnswerEditor> {
  late List<String> _answers;
  final List<TextEditingController> _controllers = [];

  @override
  void initState() {
    super.initState();
    _answers = widget.acceptedAnswers.isEmpty
        ? ['']
        : List.from(widget.acceptedAnswers);
    _initControllers();
  }

  void _initControllers() {
    _controllers.clear();
    for (final answer in _answers) {
      _controllers.add(TextEditingController(text: answer));
    }
  }

  @override
  void didUpdateWidget(ShortAnswerEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.acceptedAnswers != widget.acceptedAnswers) {
      _answers = widget.acceptedAnswers.isEmpty
          ? ['']
          : List.from(widget.acceptedAnswers);
      _initControllers();
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _notifyChanged() {
    widget.onAnswersChanged(List.from(_answers));
  }

  void _addAnswer() {
    setState(() {
      _answers.add('');
      _controllers.add(TextEditingController());
    });
    _notifyChanged();
  }

  void _removeAnswer(int index) {
    if (_answers.length <= 1) return;
    setState(() {
      _answers.removeAt(index);
      _controllers[index].dispose();
      _controllers.removeAt(index);
    });
    _notifyChanged();
  }

  void _updateAnswer(int index, String value) {
    _answers[index] = value;
    _notifyChanged();
  }

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
                Icon(
                  Icons.short_text,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Accepted Answers',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Add all variations of correct answers. Matching is case-insensitive.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),

            // Answers list
            ...List.generate(_answers.length, (index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.check,
                          color: Colors.green,
                          size: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _controllers[index],
                        decoration: InputDecoration(
                          hintText:
                              index == 0 ? 'Primary answer' : 'Alternative $index',
                          border: const OutlineInputBorder(),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                        ),
                        onChanged: (value) => _updateAnswer(index, value),
                      ),
                    ),
                    if (_answers.length > 1)
                      IconButton(
                        icon: Icon(Icons.delete_outline, color: Colors.red[400]),
                        onPressed: () => _removeAnswer(index),
                        tooltip: 'Remove',
                      )
                    else
                      const SizedBox(width: 48),
                  ],
                ),
              );
            }),

            // Add answer button
            Center(
              child: TextButton.icon(
                onPressed: _addAnswer,
                icon: const Icon(Icons.add),
                label: const Text('Add Alternative Answer'),
              ),
            ),
            const SizedBox(height: 16),

            // Tips
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lightbulb_outline,
                      color: Colors.amber[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tips for short answer questions:',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.amber[900],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '• Include common misspellings as alternatives\n'
                          '• Consider singular/plural forms\n'
                          '• Add abbreviated versions if applicable',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.amber[800],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
