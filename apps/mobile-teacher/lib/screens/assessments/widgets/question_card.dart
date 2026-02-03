/// Question Card Widget
///
/// A draggable, reorderable card for displaying questions in the builder.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/assessment.dart';

/// Card widget for a single question that can be reordered
class QuestionCard extends StatelessWidget {
  const QuestionCard({
    required this.question,
    required this.index,
    required this.onTap,
    this.onDelete,
    this.onDuplicate,
    this.isDragging = false,
    this.isSelected = false,
    super.key,
  });

  final Question question;
  final int index;
  final VoidCallback onTap;
  final VoidCallback? onDelete;
  final VoidCallback? onDuplicate;
  final bool isDragging;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: isDragging
            ? [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Card(
        elevation: isDragging ? 8 : 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: isSelected
              ? BorderSide(color: theme.colorScheme.primary, width: 2)
              : BorderSide.none,
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle
                Semantics(
                  label: 'Drag to reorder question ${index + 1}',
                  child: Icon(
                    Icons.drag_indicator,
                    color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                  ),
                ),
                const SizedBox(width: 8),

                // Question number badge
                _QuestionNumberBadge(
                  number: index + 1,
                  type: question.type,
                ),
                const SizedBox(width: 12),

                // Question content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Question text
                      Text(
                        question.stem.isNotEmpty
                            ? question.stem
                            : '(No question text)',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                          fontStyle: question.stem.isEmpty
                              ? FontStyle.italic
                              : null,
                          color: question.stem.isEmpty
                              ? theme.colorScheme.onSurfaceVariant
                              : null,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),

                      // Type and points
                      Row(
                        children: [
                          _QuestionTypeChip(type: question.type),
                          const SizedBox(width: 8),
                          _PointsChip(points: question.points.toDouble()),
                          ...[
                            const SizedBox(width: 8),
                            _DifficultyChip(difficulty: question.difficulty),
                          ],
                        ],
                      ),

                      // Preview of answer options for MC
                      if (question.type == QuestionType.multipleChoice &&
                          (question.options?.isNotEmpty ?? false)) ...[
                        const SizedBox(height: 8),
                        _OptionsPreview(options: question.options ?? []),
                      ],
                    ],
                  ),
                ),

                // Actions
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (onDuplicate != null)
                      IconButton(
                        icon: Icon(
                          Icons.copy_outlined,
                          size: 20,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        onPressed: onDuplicate,
                        tooltip: 'Duplicate question',
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                    if (onDelete != null)
                      IconButton(
                        icon: Icon(
                          Icons.delete_outline,
                          size: 20,
                          color: Colors.red[400],
                        ),
                        onPressed: onDelete,
                        tooltip: 'Delete question',
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuestionNumberBadge extends StatelessWidget {
  const _QuestionNumberBadge({
    required this.number,
    required this.type,
  });

  final int number;
  final QuestionType type;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Text(
          '$number',
          style: TextStyle(
            color: theme.colorScheme.onPrimaryContainer,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class _QuestionTypeChip extends StatelessWidget {
  const _QuestionTypeChip({required this.type});

  final QuestionType type;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getTypeIcon(type),
            size: 14,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 4),
          Text(
            type.label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTypeIcon(QuestionType type) {
    return switch (type) {
      QuestionType.multipleChoice => Icons.radio_button_checked,
      QuestionType.multipleSelect => Icons.check_box,
      QuestionType.trueFalse => Icons.thumbs_up_down,
      QuestionType.shortAnswer => Icons.short_text,
      QuestionType.essay => Icons.article,
      QuestionType.fillBlank => Icons.space_bar,
      QuestionType.matching => Icons.compare_arrows,
      QuestionType.ordering => Icons.format_list_numbered,
      QuestionType.numeric => Icons.numbers,
    };
  }
}

class _PointsChip extends StatelessWidget {
  const _PointsChip({required this.points});

  final double points;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AivoBrand.mint.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '${points.toStringAsFixed(points % 1 == 0 ? 0 : 1)} pts',
        style: theme.textTheme.labelSmall?.copyWith(
          color: AivoBrand.mint[700],
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DifficultyChip extends StatelessWidget {
  const _DifficultyChip({required this.difficulty});

  final Difficulty difficulty;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (color, label) = switch (difficulty) {
      Difficulty.easy => (Colors.green, 'Easy'),
      Difficulty.medium => (Colors.orange, 'Medium'),
      Difficulty.hard => (Colors.red, 'Hard'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _OptionsPreview extends StatelessWidget {
  const _OptionsPreview({required this.options});

  final List<QuestionOption> options;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayOptions = options.take(3).toList();
    final remaining = options.length - 3;

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        ...displayOptions.map((opt) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: opt.isCorrect
                    ? AivoBrand.success.withOpacity(0.1)
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(4),
                border: opt.isCorrect
                    ? Border.all(color: AivoBrand.success.withOpacity(0.3))
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (opt.isCorrect)
                    Icon(
                      Icons.check,
                      size: 12,
                      color: AivoBrand.success,
                    ),
                  if (opt.isCorrect) const SizedBox(width: 2),
                  Text(
                    opt.text.length > 15
                        ? '${opt.text.substring(0, 15)}...'
                        : opt.text,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: opt.isCorrect
                          ? AivoBrand.success
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            )),
        if (remaining > 0)
          Text(
            '+$remaining more',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
      ],
    );
  }
}
