/// Answer Option Builder Widget
///
/// A widget for adding, removing, and reordering answer options.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:uuid/uuid.dart';

import '../../../models/assessment.dart';

/// Builder widget for managing answer options
class AnswerOptionBuilder extends StatefulWidget {
  const AnswerOptionBuilder({
    required this.options,
    required this.onOptionsChanged,
    this.allowMultiple = false,
    this.minOptions = 2,
    this.maxOptions = 10,
    this.showCorrectIndicator = true,
    this.reorderable = true,
    this.enabled = true,
    super.key,
  });

  final List<QuestionOption> options;
  final ValueChanged<List<QuestionOption>> onOptionsChanged;
  final bool allowMultiple;
  final int minOptions;
  final int maxOptions;
  final bool showCorrectIndicator;
  final bool reorderable;
  final bool enabled;

  @override
  State<AnswerOptionBuilder> createState() => _AnswerOptionBuilderState();
}

class _AnswerOptionBuilderState extends State<AnswerOptionBuilder> {
  final _uuid = const Uuid();

  void _addOption() {
    if (widget.options.length >= widget.maxOptions) return;

    final newOptions = List<QuestionOption>.from(widget.options)
      ..add(QuestionOption(
        id: _uuid.v4(),
        text: '',
        isCorrect: false,
      ));
    widget.onOptionsChanged(newOptions);
  }

  void _removeOption(int index) {
    if (widget.options.length <= widget.minOptions) return;

    final newOptions = List<QuestionOption>.from(widget.options)
      ..removeAt(index);
    widget.onOptionsChanged(newOptions);
  }

  void _updateOptionText(int index, String text) {
    final newOptions = List<QuestionOption>.from(widget.options);
    newOptions[index] = QuestionOption(
      id: newOptions[index].id,
      text: text,
      isCorrect: newOptions[index].isCorrect,
    );
    widget.onOptionsChanged(newOptions);
  }

  void _toggleCorrect(int index) {
    final newOptions = List<QuestionOption>.from(widget.options);

    if (widget.allowMultiple) {
      // Toggle this option
      newOptions[index] = QuestionOption(
        id: newOptions[index].id,
        text: newOptions[index].text,
        isCorrect: !newOptions[index].isCorrect,
      );
    } else {
      // Single correct: unselect all, select this one
      for (int i = 0; i < newOptions.length; i++) {
        newOptions[i] = QuestionOption(
          id: newOptions[i].id,
          text: newOptions[i].text,
          isCorrect: i == index,
        );
      }
    }

    widget.onOptionsChanged(newOptions);
  }

  void _reorderOptions(int oldIndex, int newIndex) {
    final newOptions = List<QuestionOption>.from(widget.options);
    if (newIndex > oldIndex) newIndex--;
    final item = newOptions.removeAt(oldIndex);
    newOptions.insert(newIndex, item);
    widget.onOptionsChanged(newOptions);
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
            // Header
            Row(
              children: [
                Icon(
                  widget.allowMultiple ? Icons.check_box : Icons.radio_button_checked,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Answer Options',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  '${widget.options.length}/${widget.maxOptions}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),

            if (widget.showCorrectIndicator) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AivoBrand.mint.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 16, color: AivoBrand.mint[700]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.allowMultiple
                            ? 'Tap to mark correct answers (multiple allowed)'
                            : 'Tap to mark the correct answer',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AivoBrand.mint[700],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Options list
            if (widget.reorderable)
              ReorderableListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                buildDefaultDragHandles: false,
                itemCount: widget.options.length,
                onReorder: _reorderOptions,
                itemBuilder: (context, index) {
                  return _OptionTile(
                    key: ValueKey(widget.options[index].id),
                    option: widget.options[index],
                    index: index,
                    label: _getOptionLabel(index),
                    allowMultiple: widget.allowMultiple,
                    canRemove: widget.options.length > widget.minOptions,
                    enabled: widget.enabled,
                    reorderable: true,
                    onTextChanged: (text) => _updateOptionText(index, text),
                    onToggleCorrect: () => _toggleCorrect(index),
                    onRemove: () => _removeOption(index),
                  );
                },
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: widget.options.length,
                itemBuilder: (context, index) {
                  return _OptionTile(
                    key: ValueKey(widget.options[index].id),
                    option: widget.options[index],
                    index: index,
                    label: _getOptionLabel(index),
                    allowMultiple: widget.allowMultiple,
                    canRemove: widget.options.length > widget.minOptions,
                    enabled: widget.enabled,
                    reorderable: false,
                    onTextChanged: (text) => _updateOptionText(index, text),
                    onToggleCorrect: () => _toggleCorrect(index),
                    onRemove: () => _removeOption(index),
                  );
                },
              ),

            // Add button
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: widget.enabled &&
                        widget.options.length < widget.maxOptions
                    ? _addOption
                    : null,
                icon: const Icon(Icons.add),
                label: const Text('Add Option'),
              ),
            ),

            // Validation message
            if (!widget.options.any((o) => o.isCorrect)) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AivoBrand.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AivoBrand.warning.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, size: 20, color: AivoBrand.warning),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Please mark at least one correct answer',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AivoBrand.warning,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getOptionLabel(int index) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return index < labels.length ? labels[index] : '${index + 1}';
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required super.key,
    required this.option,
    required this.index,
    required this.label,
    required this.allowMultiple,
    required this.canRemove,
    required this.enabled,
    required this.reorderable,
    required this.onTextChanged,
    required this.onToggleCorrect,
    required this.onRemove,
  });

  final QuestionOption option;
  final int index;
  final String label;
  final bool allowMultiple;
  final bool canRemove;
  final bool enabled;
  final bool reorderable;
  final ValueChanged<String> onTextChanged;
  final VoidCallback onToggleCorrect;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: option.isCorrect
            ? AivoBrand.success.withOpacity(0.05)
            : null,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: option.isCorrect
              ? AivoBrand.success.withOpacity(0.5)
              : theme.colorScheme.outlineVariant,
        ),
      ),
      child: Row(
        children: [
          // Drag handle
          if (reorderable)
            ReorderableDragStartListener(
              index: index,
              enabled: enabled,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Icon(
                  Icons.drag_indicator,
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                ),
              ),
            ),

          // Correct toggle
          Semantics(
            label: option.isCorrect
                ? 'Option $label is marked correct. Tap to unmark'
                : 'Option $label. Tap to mark as correct',
            child: InkWell(
              onTap: enabled ? onToggleCorrect : null,
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: EdgeInsets.all(reorderable ? 8 : 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      allowMultiple
                          ? (option.isCorrect
                              ? Icons.check_box
                              : Icons.check_box_outline_blank)
                          : (option.isCorrect
                              ? Icons.radio_button_checked
                              : Icons.radio_button_unchecked),
                      color: option.isCorrect
                          ? AivoBrand.success
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: option.isCorrect
                            ? AivoBrand.success
                            : theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        label,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: option.isCorrect
                              ? Colors.white
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Text field
          Expanded(
            child: TextField(
              enabled: enabled,
              controller: TextEditingController(text: option.text),
              decoration: InputDecoration(
                hintText: 'Enter option $label...',
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onChanged: onTextChanged,
            ),
          ),

          // Remove button
          if (canRemove)
            IconButton(
              icon: Icon(
                Icons.close,
                size: 20,
                color: Colors.red[400],
              ),
              onPressed: enabled ? onRemove : null,
              tooltip: 'Remove option',
            ),
        ],
      ),
    );
  }
}
