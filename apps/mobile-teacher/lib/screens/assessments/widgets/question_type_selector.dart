/// Question Type Selector Widget
///
/// A bottom sheet for selecting question types with visual icons.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../models/assessment.dart';

/// Bottom sheet for selecting a question type
class QuestionTypeSelector extends StatelessWidget {
  const QuestionTypeSelector({
    required this.onTypeSelected,
    this.currentType,
    this.allowedTypes,
    super.key,
  });

  final ValueChanged<QuestionType> onTypeSelected;
  final QuestionType? currentType;
  final Set<QuestionType>? allowedTypes;

  /// Show the selector as a bottom sheet
  static Future<QuestionType?> show(
    BuildContext context, {
    QuestionType? currentType,
    Set<QuestionType>? allowedTypes,
  }) {
    return showModalBottomSheet<QuestionType>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => QuestionTypeSelector(
        currentType: currentType,
        allowedTypes: allowedTypes,
        onTypeSelected: (type) => Navigator.pop(context, type),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final types = allowedTypes?.toList() ?? QuestionType.values;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    Icons.quiz_outlined,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Select Question Type',
                    style: theme.textTheme.titleLarge,
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Types grid
            Expanded(
              child: GridView.builder(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.4,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: types.length,
                itemBuilder: (context, index) {
                  final type = types[index];
                  return _QuestionTypeCard(
                    type: type,
                    isSelected: type == currentType,
                    onTap: () => onTypeSelected(type),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _QuestionTypeCard extends StatelessWidget {
  const _QuestionTypeCard({
    required this.type,
    required this.onTap,
    this.isSelected = false,
  });

  final QuestionType type;
  final VoidCallback onTap;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, description) = _getTypeInfo(type);

    return Card(
      elevation: isSelected ? 4 : 1,
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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isSelected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: isSelected
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(height: 8),

              // Label
              Text(
                type.label,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isSelected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 2),

              // Description
              Text(
                description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  (IconData, String) _getTypeInfo(QuestionType type) {
    return switch (type) {
      QuestionType.multipleChoice => (
          Icons.radio_button_checked,
          'Select one answer'
        ),
      QuestionType.multipleSelect => (
          Icons.check_box,
          'Select multiple answers'
        ),
      QuestionType.trueFalse => (Icons.thumbs_up_down, 'True or false'),
      QuestionType.shortAnswer => (Icons.short_text, 'Short text response'),
      QuestionType.essay => (Icons.article, 'Long form response'),
      QuestionType.fillBlank => (Icons.space_bar, 'Fill in blanks'),
      QuestionType.matching => (Icons.compare_arrows, 'Match items'),
      QuestionType.ordering => (Icons.format_list_numbered, 'Order items'),
      QuestionType.numeric => (Icons.numbers, 'Number answer'),
    };
  }
}

/// Compact horizontal selector for question types
class QuestionTypeSelectorBar extends StatelessWidget {
  const QuestionTypeSelectorBar({
    required this.selectedType,
    required this.onTypeChanged,
    this.allowedTypes,
    this.enabled = true,
    super.key,
  });

  final QuestionType selectedType;
  final ValueChanged<QuestionType> onTypeChanged;
  final Set<QuestionType>? allowedTypes;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final types = allowedTypes?.toList() ?? QuestionType.values;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: types.map((type) {
          final isSelected = type == selectedType;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              avatar: Icon(
                _getTypeIcon(type),
                size: 18,
                color: isSelected ? Colors.white : null,
              ),
              label: Text(type.label),
              selected: isSelected,
              onSelected: enabled
                  ? (selected) {
                      if (selected) onTypeChanged(type);
                    }
                  : null,
            ),
          );
        }).toList(),
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
