/// Rubric Criterion Card Widget
///
/// Card for displaying and editing a rubric criterion.
library;

import 'package:flutter/material.dart';

import '../../../models/rubric.dart';

/// Card for displaying a rubric criterion.
class RubricCriterionCard extends StatelessWidget {
  const RubricCriterionCard({
    super.key,
    required this.criterion,
    this.isSelected = false,
    this.onTap,
    this.onEdit,
    this.onDelete,
    this.reorderHandle,
  });

  final RubricCriterion criterion;
  final bool isSelected;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final Widget? reorderHandle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected
              ? theme.colorScheme.primary
              : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (reorderHandle != null) ...[
                    reorderHandle!,
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          criterion.name,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (criterion.description != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            criterion.description!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${criterion.maxPoints.toStringAsFixed(criterion.maxPoints.truncateToDouble() == criterion.maxPoints ? 0 : 1)} pts',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  if (onEdit != null || onDelete != null)
                    PopupMenuButton<String>(
                      itemBuilder: (context) => [
                        if (onEdit != null)
                          const PopupMenuItem(
                            value: 'edit',
                            child: Row(
                              children: [
                                Icon(Icons.edit, size: 18),
                                SizedBox(width: 8),
                                Text('Edit'),
                              ],
                            ),
                          ),
                        if (onDelete != null)
                          const PopupMenuItem(
                            value: 'delete',
                            child: Row(
                              children: [
                                Icon(Icons.delete, size: 18, color: Colors.red),
                                SizedBox(width: 8),
                                Text('Delete', style: TextStyle(color: Colors.red)),
                              ],
                            ),
                          ),
                      ],
                      onSelected: (value) {
                        if (value == 'edit') {
                          onEdit?.call();
                        } else if (value == 'delete') {
                          onDelete?.call();
                        }
                      },
                    ),
                ],
              ),
              const SizedBox(height: 12),
              // Performance levels preview
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: criterion.levels.map((level) {
                  return Chip(
                    label: Text(
                      '${level.label}: ${level.points.toStringAsFixed(level.points.truncateToDouble() == level.points ? 0 : 1)}',
                      style: const TextStyle(fontSize: 11),
                    ),
                    visualDensity: VisualDensity.compact,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: EdgeInsets.zero,
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Editable criterion card for rubric builder.
class EditableCriterionCard extends StatefulWidget {
  const EditableCriterionCard({
    super.key,
    required this.criterion,
    required this.onChanged,
    this.onDelete,
  });

  final RubricCriterion criterion;
  final ValueChanged<RubricCriterion> onChanged;
  final VoidCallback? onDelete;

  @override
  State<EditableCriterionCard> createState() => _EditableCriterionCardState();
}

class _EditableCriterionCardState extends State<EditableCriterionCard> {
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.criterion.name);
    _descriptionController = TextEditingController(text: widget.criterion.description ?? '');
  }

  @override
  void didUpdateWidget(covariant EditableCriterionCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.criterion.id != widget.criterion.id) {
      _nameController.text = widget.criterion.name;
      _descriptionController.text = widget.criterion.description ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
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
                Expanded(
                  child: Text(
                    'Criterion',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (widget.onDelete != null)
                  IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    onPressed: widget.onDelete,
                    tooltip: 'Delete Criterion',
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                widget.onChanged(widget.criterion.copyWith(name: value));
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              onChanged: (value) {
                widget.onChanged(widget.criterion.copyWith(
                  description: value.isEmpty ? null : value,
                ));
              },
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  'Performance Levels',
                  style: theme.textTheme.titleSmall,
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: _addLevel,
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Level'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...widget.criterion.levels.asMap().entries.map((entry) {
              final index = entry.key;
              final level = entry.value;
              return _LevelEditor(
                level: level,
                onChanged: (updated) {
                  final levels = List<PerformanceLevel>.from(widget.criterion.levels);
                  levels[index] = updated;
                  widget.onChanged(widget.criterion.copyWith(levels: levels));
                },
                onDelete: widget.criterion.levels.length > 1
                    ? () {
                        final levels = List<PerformanceLevel>.from(widget.criterion.levels);
                        levels.removeAt(index);
                        widget.onChanged(widget.criterion.copyWith(levels: levels));
                      }
                    : null,
              );
            }),
          ],
        ),
      ),
    );
  }

  void _addLevel() {
    final levels = List<PerformanceLevel>.from(widget.criterion.levels);
    final minPoints = levels.isEmpty ? 0.0 : levels.map((l) => l.points).reduce((a, b) => a < b ? a : b);
    levels.add(PerformanceLevel(
      id: 'level_${DateTime.now().millisecondsSinceEpoch}',
      label: 'New Level',
      points: minPoints > 0 ? minPoints - 1 : 0,
      description: '',
      order: levels.length,
    ));
    widget.onChanged(widget.criterion.copyWith(levels: levels));
  }
}

/// Editor for a single performance level.
class _LevelEditor extends StatelessWidget {
  const _LevelEditor({
    required this.level,
    required this.onChanged,
    this.onDelete,
  });

  final PerformanceLevel level;
  final ValueChanged<PerformanceLevel> onChanged;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: TextEditingController(text: level.label),
                    decoration: const InputDecoration(
                      labelText: 'Label',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (value) {
                      onChanged(level.copyWith(label: value));
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: TextEditingController(
                      text: level.points.toStringAsFixed(
                        level.points.truncateToDouble() == level.points ? 0 : 1,
                      ),
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Points',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      final points = double.tryParse(value);
                      if (points != null) {
                        onChanged(level.copyWith(points: points));
                      }
                    },
                  ),
                ),
                if (onDelete != null) ...[
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: onDelete,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: TextEditingController(text: level.description),
              decoration: const InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 2,
              onChanged: (value) {
                onChanged(level.copyWith(description: value));
              },
            ),
          ],
        ),
      ),
    );
  }
}
