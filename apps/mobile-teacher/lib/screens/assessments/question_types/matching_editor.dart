/// Matching Editor
///
/// Editor widget for matching questions.
/// Allows creating pairs that students must match.
library;

import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../../../models/assessment.dart';

/// Editor for matching questions
class MatchingEditor extends StatefulWidget {
  const MatchingEditor({
    required this.pairs,
    required this.onPairsChanged,
    super.key,
  });

  final List<MatchingPair> pairs;
  final ValueChanged<List<MatchingPair>> onPairsChanged;

  @override
  State<MatchingEditor> createState() => _MatchingEditorState();
}

class _MatchingEditorState extends State<MatchingEditor> {
  late List<MatchingPair> _pairs;
  final List<TextEditingController> _leftControllers = [];
  final List<TextEditingController> _rightControllers = [];

  @override
  void initState() {
    super.initState();
    _pairs = widget.pairs.isEmpty
        ? [
            MatchingPair(id: const Uuid().v4(), left: '', right: ''),
            MatchingPair(id: const Uuid().v4(), left: '', right: ''),
          ]
        : List.from(widget.pairs);
    _initControllers();
  }

  void _initControllers() {
    _leftControllers.clear();
    _rightControllers.clear();
    for (final pair in _pairs) {
      _leftControllers.add(TextEditingController(text: pair.left));
      _rightControllers.add(TextEditingController(text: pair.right));
    }
  }

  @override
  void didUpdateWidget(MatchingEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pairs != widget.pairs) {
      _pairs = widget.pairs.isEmpty
          ? [
              MatchingPair(id: const Uuid().v4(), left: '', right: ''),
              MatchingPair(id: const Uuid().v4(), left: '', right: ''),
            ]
          : List.from(widget.pairs);
      _initControllers();
    }
  }

  @override
  void dispose() {
    for (final controller in _leftControllers) {
      controller.dispose();
    }
    for (final controller in _rightControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _notifyChanged() {
    widget.onPairsChanged(List.from(_pairs));
  }

  void _addPair() {
    setState(() {
      _pairs.add(MatchingPair(id: const Uuid().v4(), left: '', right: ''));
      _leftControllers.add(TextEditingController());
      _rightControllers.add(TextEditingController());
    });
    _notifyChanged();
  }

  void _removePair(int index) {
    if (_pairs.length <= 2) return;
    setState(() {
      _pairs.removeAt(index);
      _leftControllers[index].dispose();
      _rightControllers[index].dispose();
      _leftControllers.removeAt(index);
      _rightControllers.removeAt(index);
    });
    _notifyChanged();
  }

  void _updateLeft(int index, String value) {
    _pairs[index] = _pairs[index].copyWith(left: value);
    _notifyChanged();
  }

  void _updateRight(int index, String value) {
    _pairs[index] = _pairs[index].copyWith(right: value);
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
                  Icons.compare_arrows,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Matching Pairs',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Create pairs that students will need to match. '
              'The right column will be shuffled for students.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),

            // Header row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Term / Question',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 32),
                  Expanded(
                    child: Text(
                      'Match / Answer',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Pairs list
            ...List.generate(_pairs.length, (index) {
              return _MatchingPairRow(
                key: ValueKey(_pairs[index].id),
                index: index,
                leftController: _leftControllers[index],
                rightController: _rightControllers[index],
                canDelete: _pairs.length > 2,
                onLeftChanged: (value) => _updateLeft(index, value),
                onRightChanged: (value) => _updateRight(index, value),
                onDelete: () => _removePair(index),
              );
            }),

            // Add pair button
            const SizedBox(height: 8),
            Center(
              child: TextButton.icon(
                onPressed: _addPair,
                icon: const Icon(Icons.add),
                label: const Text('Add Pair'),
              ),
            ),
            const SizedBox(height: 16),

            // Preview hint
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.purple.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.visibility, color: Colors.purple[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Student View',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.purple[900],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Students will see the left column in order and '
                          'the right column shuffled. They must draw lines '
                          'or select matches.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.purple[800],
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

class _MatchingPairRow extends StatelessWidget {
  const _MatchingPairRow({
    super.key,
    required this.index,
    required this.leftController,
    required this.rightController,
    required this.canDelete,
    required this.onLeftChanged,
    required this.onRightChanged,
    required this.onDelete,
  });

  final int index;
  final TextEditingController leftController;
  final TextEditingController rightController;
  final bool canDelete;
  final ValueChanged<String> onLeftChanged;
  final ValueChanged<String> onRightChanged;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left (Term)
          Expanded(
            child: TextFormField(
              controller: leftController,
              decoration: InputDecoration(
                hintText: 'Term ${index + 1}',
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                filled: true,
                fillColor: Colors.blue.withOpacity(0.05),
              ),
              onChanged: onLeftChanged,
            ),
          ),

          // Arrow
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Icon(
              Icons.arrow_forward,
              color: Colors.grey[400],
              size: 20,
            ),
          ),

          // Right (Match)
          Expanded(
            child: TextFormField(
              controller: rightController,
              decoration: InputDecoration(
                hintText: 'Match ${index + 1}',
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                filled: true,
                fillColor: Colors.green.withOpacity(0.05),
              ),
              onChanged: onRightChanged,
            ),
          ),

          // Delete
          if (canDelete)
            IconButton(
              icon: Icon(Icons.delete_outline, color: Colors.red[400]),
              onPressed: onDelete,
              tooltip: 'Remove pair',
            )
          else
            const SizedBox(width: 48),
        ],
      ),
    );
  }
}
