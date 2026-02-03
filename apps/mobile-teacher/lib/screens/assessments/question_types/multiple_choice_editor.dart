/// Multiple Choice Editor
///
/// Editor widget for multiple choice and multiple select questions.
/// Supports adding/removing options and marking correct answers.
library;

import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../../../models/assessment.dart';

/// Editor for multiple choice questions
class MultipleChoiceEditor extends StatefulWidget {
  const MultipleChoiceEditor({
    required this.options,
    required this.allowMultiple,
    required this.onOptionsChanged,
    super.key,
  });

  final List<QuestionOption> options;
  final bool allowMultiple;
  final ValueChanged<List<QuestionOption>> onOptionsChanged;

  @override
  State<MultipleChoiceEditor> createState() => _MultipleChoiceEditorState();
}

class _MultipleChoiceEditorState extends State<MultipleChoiceEditor> {
  late List<QuestionOption> _options;
  final List<TextEditingController> _controllers = [];

  @override
  void initState() {
    super.initState();
    _options = List.from(widget.options);
    _initControllers();
  }

  void _initControllers() {
    _controllers.clear();
    for (final option in _options) {
      _controllers.add(TextEditingController(text: option.text));
    }
  }

  @override
  void didUpdateWidget(MultipleChoiceEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.options != widget.options) {
      _options = List.from(widget.options);
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
    widget.onOptionsChanged(List.from(_options));
  }

  void _addOption() {
    setState(() {
      _options.add(QuestionOption(
        id: const Uuid().v4(),
        text: '',
        isCorrect: false,
      ));
      _controllers.add(TextEditingController());
    });
    _notifyChanged();
  }

  void _removeOption(int index) {
    if (_options.length <= 2) return;
    setState(() {
      _options.removeAt(index);
      _controllers[index].dispose();
      _controllers.removeAt(index);
    });
    _notifyChanged();
  }

  void _toggleCorrect(int index) {
    setState(() {
      if (widget.allowMultiple) {
        // Multiple select - toggle individual
        _options[index] = _options[index].copyWith(
          isCorrect: !_options[index].isCorrect,
        );
      } else {
        // Single choice - only one can be correct
        for (var i = 0; i < _options.length; i++) {
          _options[i] = _options[i].copyWith(isCorrect: i == index);
        }
      }
    });
    _notifyChanged();
  }

  void _updateOptionText(int index, String text) {
    _options[index] = _options[index].copyWith(text: text);
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
                  widget.allowMultiple
                      ? Icons.check_box
                      : Icons.radio_button_checked,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  widget.allowMultiple ? 'Answer Options' : 'Answer Choices',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              widget.allowMultiple
                  ? 'Add options and check all correct answers'
                  : 'Add options and select the correct answer',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),

            // Options list
            ...List.generate(_options.length, (index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _OptionRow(
                  key: ValueKey(_options[index].id),
                  controller: _controllers[index],
                  isCorrect: _options[index].isCorrect,
                  allowMultiple: widget.allowMultiple,
                  optionLabel: _getOptionLabel(index),
                  canDelete: _options.length > 2,
                  onTextChanged: (text) => _updateOptionText(index, text),
                  onCorrectToggled: () => _toggleCorrect(index),
                  onDelete: () => _removeOption(index),
                ),
              );
            }),

            // Add option button
            Center(
              child: TextButton.icon(
                onPressed: _addOption,
                icon: const Icon(Icons.add),
                label: const Text('Add Option'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getOptionLabel(int index) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    if (index < labels.length) return labels[index];
    return '${index + 1}';
  }
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    super.key,
    required this.controller,
    required this.isCorrect,
    required this.allowMultiple,
    required this.optionLabel,
    required this.canDelete,
    required this.onTextChanged,
    required this.onCorrectToggled,
    required this.onDelete,
  });

  final TextEditingController controller;
  final bool isCorrect;
  final bool allowMultiple;
  final String optionLabel;
  final bool canDelete;
  final ValueChanged<String> onTextChanged;
  final VoidCallback onCorrectToggled;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Correct indicator
        GestureDetector(
          onTap: onCorrectToggled,
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: isCorrect
                  ? Colors.green.withOpacity(0.2)
                  : Colors.grey.withOpacity(0.1),
              borderRadius: BorderRadius.circular(allowMultiple ? 4 : 18),
              border: Border.all(
                color: isCorrect ? Colors.green : Colors.grey[400]!,
                width: 2,
              ),
            ),
            child: Center(
              child: isCorrect
                  ? const Icon(Icons.check, color: Colors.green, size: 20)
                  : Text(
                      optionLabel,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ),
        const SizedBox(width: 12),

        // Text field
        Expanded(
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(
              hintText: 'Option $optionLabel',
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
              filled: isCorrect,
              fillColor: isCorrect ? Colors.green.withOpacity(0.05) : null,
            ),
            onChanged: onTextChanged,
          ),
        ),

        // Delete button
        if (canDelete)
          IconButton(
            icon: Icon(Icons.delete_outline, color: Colors.red[400]),
            onPressed: onDelete,
            tooltip: 'Remove option',
          )
        else
          const SizedBox(width: 48),
      ],
    );
  }
}
