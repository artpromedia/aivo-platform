/// Fill-in-the-Blank Editor
///
/// Editor widget for fill-in-the-blank questions.
/// Allows creating sentences with blanks that students must fill.
library;

import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../../../models/assessment.dart';

/// Editor for fill-in-the-blank questions
class FillInBlankEditor extends StatefulWidget {
  const FillInBlankEditor({
    required this.questionText,
    required this.slots,
    required this.onTextChanged,
    required this.onSlotsChanged,
    super.key,
  });

  final String questionText;
  final List<FillBlankSlot> slots;
  final ValueChanged<String> onTextChanged;
  final ValueChanged<List<FillBlankSlot>> onSlotsChanged;

  @override
  State<FillInBlankEditor> createState() => _FillInBlankEditorState();
}

class _FillInBlankEditorState extends State<FillInBlankEditor> {
  late TextEditingController _textController;
  late List<FillBlankSlot> _slots;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.questionText);
    _slots = List.from(widget.slots);
  }

  @override
  void didUpdateWidget(FillInBlankEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.questionText != widget.questionText) {
      _textController.text = widget.questionText;
    }
    if (oldWidget.slots != widget.slots) {
      _slots = List.from(widget.slots);
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _addBlank() {
    final text = _textController.text;
    final selection = _textController.selection;
    final cursorPos = selection.baseOffset;

    // Insert blank marker at cursor position
    final newSlotId = const Uuid().v4();
    final blankMarker = '{{blank:$newSlotId}}';

    final newText = cursorPos >= 0 && cursorPos <= text.length
        ? text.substring(0, cursorPos) + blankMarker + text.substring(cursorPos)
        : text + blankMarker;

    setState(() {
      _textController.text = newText;
      _textController.selection = TextSelection.collapsed(
        offset: cursorPos + blankMarker.length,
      );
      _slots.add(FillBlankSlot(
        id: newSlotId,
        position: _slots.length,
        correctAnswers: const [],
      ));
    });

    widget.onTextChanged(newText);
    widget.onSlotsChanged(List.from(_slots));
  }

  void _updateSlotAnswer(int index, String answer) {
    final oldSlot = _slots[index];
    _slots[index] = FillBlankSlot(
      id: oldSlot.id,
      position: oldSlot.position,
      correctAnswers: answer.isEmpty ? [] : [answer, ...oldSlot.correctAnswers.skip(1)],
      caseSensitive: oldSlot.caseSensitive,
    );
    widget.onSlotsChanged(List.from(_slots));
  }

  void _updateSlotAlternatives(int index, List<String> alternatives) {
    final oldSlot = _slots[index];
    final primaryAnswer = oldSlot.correctAnswers.isNotEmpty ? oldSlot.correctAnswers.first : '';
    _slots[index] = FillBlankSlot(
      id: oldSlot.id,
      position: oldSlot.position,
      correctAnswers: primaryAnswer.isEmpty ? alternatives : [primaryAnswer, ...alternatives],
      caseSensitive: oldSlot.caseSensitive,
    );
    widget.onSlotsChanged(List.from(_slots));
  }

  void _removeSlot(int index) {
    final slotId = _slots[index].id;
    final marker = '{{blank:$slotId}}';

    setState(() {
      _textController.text = _textController.text.replaceAll(marker, '');
      _slots.removeAt(index);
    });

    widget.onTextChanged(_textController.text);
    widget.onSlotsChanged(List.from(_slots));
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
                  Icons.space_bar,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Fill in the Blank',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Write your sentence and add blanks where students should fill in answers.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),

            // Sentence with blanks
            TextFormField(
              controller: _textController,
              decoration: const InputDecoration(
                labelText: 'Sentence with Blanks',
                hintText: 'Type your sentence here...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 4,
              onChanged: widget.onTextChanged,
            ),
            const SizedBox(height: 8),

            // Add blank button
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: _addBlank,
                icon: const Icon(Icons.add_box_outlined),
                label: const Text('Insert Blank at Cursor'),
              ),
            ),
            const SizedBox(height: 16),

            // Preview
            if (_slots.isNotEmpty) ...[
              Text(
                'Preview',
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: _buildPreview(),
              ),
              const SizedBox(height: 24),

              // Blanks configuration
              Text(
                'Configure Blanks (${_slots.length})',
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 12),

              ...List.generate(_slots.length, (index) {
                return _BlankConfigCard(
                  index: index,
                  slot: _slots[index],
                  onAnswerChanged: (answer) => _updateSlotAnswer(index, answer),
                  onAlternativesChanged: (alts) =>
                      _updateSlotAlternatives(index, alts),
                  onDelete: () => _removeSlot(index),
                );
              }),
            ],

            // Instructions
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'How it works',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.blue[900],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '1. Type your sentence in the text field\n'
                          '2. Position your cursor where you want a blank\n'
                          '3. Click "Insert Blank at Cursor"\n'
                          '4. Configure the correct answer for each blank',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.blue[800],
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

  Widget _buildPreview() {
    final text = _textController.text;
    final parts = <InlineSpan>[];

    // Parse text and replace markers with visual blanks
    final regex = RegExp(r'\{\{blank:([a-zA-Z0-9-]+)\}\}');
    int lastEnd = 0;
    int blankNumber = 1;

    for (final match in regex.allMatches(text)) {
      // Add text before the blank
      if (match.start > lastEnd) {
        parts.add(TextSpan(text: text.substring(lastEnd, match.start)));
      }

      // Add visual blank
      parts.add(WidgetSpan(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Colors.blue[700]!, width: 2),
            ),
          ),
          child: Text(
            '  ${blankNumber++}  ',
            style: TextStyle(color: Colors.blue[700]),
          ),
        ),
      ));

      lastEnd = match.end;
    }

    // Add remaining text
    if (lastEnd < text.length) {
      parts.add(TextSpan(text: text.substring(lastEnd)));
    }

    return RichText(
      text: TextSpan(
        style: TextStyle(
          color: Colors.grey[800],
          fontSize: 14,
          height: 1.8,
        ),
        children: parts,
      ),
    );
  }
}

class _BlankConfigCard extends StatefulWidget {
  const _BlankConfigCard({
    required this.index,
    required this.slot,
    required this.onAnswerChanged,
    required this.onAlternativesChanged,
    required this.onDelete,
  });

  final int index;
  final FillBlankSlot slot;
  final ValueChanged<String> onAnswerChanged;
  final ValueChanged<List<String>> onAlternativesChanged;
  final VoidCallback onDelete;

  @override
  State<_BlankConfigCard> createState() => _BlankConfigCardState();
}

class _BlankConfigCardState extends State<_BlankConfigCard> {
  late TextEditingController _answerController;
  late TextEditingController _alternativesController;

  @override
  void initState() {
    super.initState();
    _answerController = TextEditingController(
      text: widget.slot.correctAnswers.isNotEmpty ? widget.slot.correctAnswers.first : '',
    );
    _alternativesController = TextEditingController(
      text: widget.slot.correctAnswers.skip(1).join(', '),
    );
  }

  @override
  void didUpdateWidget(_BlankConfigCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    final newPrimary = widget.slot.correctAnswers.isNotEmpty ? widget.slot.correctAnswers.first : '';
    final oldPrimary = oldWidget.slot.correctAnswers.isNotEmpty ? oldWidget.slot.correctAnswers.first : '';
    if (oldPrimary != newPrimary) {
      _answerController.text = newPrimary;
    }
    if (oldWidget.slot.correctAnswers != widget.slot.correctAnswers) {
      _alternativesController.text = widget.slot.correctAnswers.skip(1).join(', ');
    }
  }

  @override
  void dispose() {
    _answerController.dispose();
    _alternativesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: Colors.blue,
                  child: Text(
                    '${widget.index + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Blank ${widget.index + 1}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                IconButton(
                  icon: Icon(Icons.delete_outline, color: Colors.red[400]),
                  onPressed: widget.onDelete,
                  iconSize: 20,
                  tooltip: 'Remove blank',
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _answerController,
              decoration: const InputDecoration(
                labelText: 'Correct Answer *',
                hintText: 'Enter the correct answer',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                isDense: true,
              ),
              onChanged: widget.onAnswerChanged,
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _alternativesController,
              decoration: const InputDecoration(
                labelText: 'Alternative Answers (optional)',
                hintText: 'Comma-separated alternatives',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                isDense: true,
              ),
              onChanged: (value) {
                final alternatives = value
                    .split(',')
                    .map((s) => s.trim())
                    .where((s) => s.isNotEmpty)
                    .toList();
                widget.onAlternativesChanged(alternatives);
              },
            ),
          ],
        ),
      ),
    );
  }
}
