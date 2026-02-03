/// Rubric Builder Widget for Assessments
///
/// A widget for creating and editing rubrics for essay/extended response scoring.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

/// Model for a rubric criterion level
class RubricLevel {
  const RubricLevel({
    required this.points,
    required this.description,
    this.label,
  });

  final int points;
  final String description;
  final String? label;

  RubricLevel copyWith({
    int? points,
    String? description,
    String? label,
  }) {
    return RubricLevel(
      points: points ?? this.points,
      description: description ?? this.description,
      label: label ?? this.label,
    );
  }
}

/// Model for a rubric criterion
class RubricCriterion {
  const RubricCriterion({
    required this.id,
    required this.name,
    required this.description,
    required this.levels,
    this.weight = 1.0,
  });

  final String id;
  final String name;
  final String description;
  final List<RubricLevel> levels;
  final double weight;

  int get maxPoints => levels.isEmpty ? 0 : levels.map((l) => l.points).reduce((a, b) => a > b ? a : b);

  RubricCriterion copyWith({
    String? id,
    String? name,
    String? description,
    List<RubricLevel>? levels,
    double? weight,
  }) {
    return RubricCriterion(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      levels: levels ?? this.levels,
      weight: weight ?? this.weight,
    );
  }
}

/// Widget for building rubrics
class RubricBuilder extends StatelessWidget {
  const RubricBuilder({
    required this.criteria,
    required this.onCriteriaChanged,
    this.enabled = true,
    super.key,
  });

  final List<RubricCriterion> criteria;
  final ValueChanged<List<RubricCriterion>> onCriteriaChanged;
  final bool enabled;

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
                Icon(Icons.grading, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Rubric',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (criteria.isNotEmpty)
                  Text(
                    'Total: ${_calculateTotalPoints()} pts',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            // Criteria list
            if (criteria.isEmpty)
              _EmptyRubricPlaceholder(
                onAdd: enabled ? () => _addCriterion(context) : null,
              )
            else ...[
              ReorderableListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                buildDefaultDragHandles: false,
                itemCount: criteria.length,
                onReorder: _reorderCriteria,
                itemBuilder: (context, index) {
                  return _CriterionCard(
                    key: ValueKey(criteria[index].id),
                    index: index,
                    criterion: criteria[index],
                    enabled: enabled,
                    onEdit: () => _editCriterion(context, index),
                    onDelete: () => _deleteCriterion(index),
                  );
                },
              ),
              const SizedBox(height: 12),
              Center(
                child: OutlinedButton.icon(
                  onPressed: enabled ? () => _addCriterion(context) : null,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Criterion'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  int _calculateTotalPoints() {
    return criteria.fold<int>(0, (sum, c) => sum + c.maxPoints);
  }

  void _reorderCriteria(int oldIndex, int newIndex) {
    final newCriteria = List<RubricCriterion>.from(criteria);
    if (newIndex > oldIndex) newIndex--;
    final item = newCriteria.removeAt(oldIndex);
    newCriteria.insert(newIndex, item);
    onCriteriaChanged(newCriteria);
  }

  Future<void> _addCriterion(BuildContext context) async {
    final result = await showDialog<RubricCriterion>(
      context: context,
      builder: (context) => _CriterionEditorDialog(
        criterion: RubricCriterion(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: '',
          description: '',
          levels: const [
            RubricLevel(points: 0, description: 'Does not meet expectations', label: 'Beginning'),
            RubricLevel(points: 1, description: 'Partially meets expectations', label: 'Developing'),
            RubricLevel(points: 2, description: 'Meets expectations', label: 'Proficient'),
            RubricLevel(points: 3, description: 'Exceeds expectations', label: 'Advanced'),
          ],
        ),
        isNew: true,
      ),
    );

    if (result != null) {
      onCriteriaChanged([...criteria, result]);
    }
  }

  Future<void> _editCriterion(BuildContext context, int index) async {
    final result = await showDialog<RubricCriterion>(
      context: context,
      builder: (context) => _CriterionEditorDialog(
        criterion: criteria[index],
        isNew: false,
      ),
    );

    if (result != null) {
      final newCriteria = List<RubricCriterion>.from(criteria);
      newCriteria[index] = result;
      onCriteriaChanged(newCriteria);
    }
  }

  void _deleteCriterion(int index) {
    final newCriteria = List<RubricCriterion>.from(criteria)..removeAt(index);
    onCriteriaChanged(newCriteria);
  }
}

class _EmptyRubricPlaceholder extends StatelessWidget {
  const _EmptyRubricPlaceholder({required this.onAdd});

  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onAdd,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          border: Border.all(
            color: theme.colorScheme.outlineVariant,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              Icons.grading,
              size: 48,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 8),
            Text(
              'No rubric criteria yet',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Tap to add scoring criteria',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CriterionCard extends StatelessWidget {
  const _CriterionCard({
    required super.key,
    required this.index,
    required this.criterion,
    required this.enabled,
    required this.onEdit,
    required this.onDelete,
  });

  final int index;
  final RubricCriterion criterion;
  final bool enabled;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Drag handle
                if (enabled)
                  ReorderableDragStartListener(
                    index: index,
                    child: const Icon(Icons.drag_handle, size: 20),
                  ),
                const SizedBox(width: 8),
                
                // Criterion name
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        criterion.name.isEmpty ? 'Untitled Criterion' : criterion.name,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (criterion.description.isNotEmpty)
                        Text(
                          criterion.description,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),

                // Max points badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${criterion.maxPoints} pts',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Actions
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 20),
                  onPressed: enabled ? onEdit : null,
                  tooltip: 'Edit',
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20),
                  onPressed: enabled ? onDelete : null,
                  tooltip: 'Delete',
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Levels preview
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: criterion.levels.map((level) {
                return Chip(
                  label: Text(
                    level.label ?? '${level.points} pts',
                    style: theme.textTheme.labelSmall,
                  ),
                  avatar: CircleAvatar(
                    radius: 10,
                    backgroundColor: theme.colorScheme.primary,
                    child: Text(
                      '${level.points}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _CriterionEditorDialog extends StatefulWidget {
  const _CriterionEditorDialog({
    required this.criterion,
    required this.isNew,
  });

  final RubricCriterion criterion;
  final bool isNew;

  @override
  State<_CriterionEditorDialog> createState() => _CriterionEditorDialogState();
}

class _CriterionEditorDialogState extends State<_CriterionEditorDialog> {
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;
  late List<RubricLevel> _levels;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.criterion.name);
    _descriptionController = TextEditingController(text: widget.criterion.description);
    _levels = List.from(widget.criterion.levels);
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

    return AlertDialog(
      title: Text(widget.isNew ? 'Add Criterion' : 'Edit Criterion'),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Name
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Criterion Name *',
                  hintText: 'e.g., Content Quality',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),

              // Description
              TextField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'What is being evaluated?',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),

              // Levels header
              Row(
                children: [
                  Text(
                    'Performance Levels',
                    style: theme.textTheme.titleSmall,
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 20),
                    onPressed: _addLevel,
                    tooltip: 'Add level',
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Levels list
              ..._levels.asMap().entries.map((entry) {
                final index = entry.key;
                final level = entry.value;
                return _LevelEditor(
                  key: ValueKey(index),
                  level: level,
                  index: index,
                  onChanged: (newLevel) => _updateLevel(index, newLevel),
                  onDelete: _levels.length > 2 ? () => _deleteLevel(index) : null,
                );
              }),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _nameController.text.isNotEmpty ? _save : null,
          child: Text(widget.isNew ? 'Add' : 'Save'),
        ),
      ],
    );
  }

  void _addLevel() {
    setState(() {
      final maxPoints = _levels.isEmpty ? 0 : _levels.map((l) => l.points).reduce((a, b) => a > b ? a : b);
      _levels.add(RubricLevel(
        points: maxPoints + 1,
        description: '',
      ));
    });
  }

  void _updateLevel(int index, RubricLevel level) {
    setState(() {
      _levels[index] = level;
    });
  }

  void _deleteLevel(int index) {
    setState(() {
      _levels.removeAt(index);
    });
  }

  void _save() {
    Navigator.pop(
      context,
      widget.criterion.copyWith(
        name: _nameController.text,
        description: _descriptionController.text,
        levels: _levels,
      ),
    );
  }
}

class _LevelEditor extends StatefulWidget {
  const _LevelEditor({
    required super.key,
    required this.level,
    required this.index,
    required this.onChanged,
    this.onDelete,
  });

  final RubricLevel level;
  final int index;
  final ValueChanged<RubricLevel> onChanged;
  final VoidCallback? onDelete;

  @override
  State<_LevelEditor> createState() => _LevelEditorState();
}

class _LevelEditorState extends State<_LevelEditor> {
  late TextEditingController _labelController;
  late TextEditingController _descriptionController;
  late TextEditingController _pointsController;

  @override
  void initState() {
    super.initState();
    _labelController = TextEditingController(text: widget.level.label ?? '');
    _descriptionController = TextEditingController(text: widget.level.description);
    _pointsController = TextEditingController(text: widget.level.points.toString());
  }

  @override
  void dispose() {
    _labelController.dispose();
    _descriptionController.dispose();
    _pointsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                // Points input
                SizedBox(
                  width: 60,
                  child: TextField(
                    controller: _pointsController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    decoration: const InputDecoration(
                      labelText: 'Pts',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    ),
                    onChanged: (value) {
                      final points = int.tryParse(value) ?? 0;
                      widget.onChanged(widget.level.copyWith(points: points));
                    },
                  ),
                ),
                const SizedBox(width: 8),

                // Label input
                Expanded(
                  child: TextField(
                    controller: _labelController,
                    decoration: const InputDecoration(
                      labelText: 'Label',
                      hintText: 'e.g., Proficient',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    ),
                    onChanged: (value) {
                      widget.onChanged(widget.level.copyWith(label: value.isEmpty ? null : value));
                    },
                  ),
                ),

                // Delete button
                if (widget.onDelete != null)
                  IconButton(
                    icon: Icon(Icons.close, size: 18, color: theme.colorScheme.error),
                    onPressed: widget.onDelete,
                    tooltip: 'Remove level',
                  ),
              ],
            ),
            const SizedBox(height: 8),

            // Description
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Describe this performance level',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              ),
              maxLines: 2,
              onChanged: (value) {
                widget.onChanged(widget.level.copyWith(description: value));
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact rubric preview widget
class RubricPreview extends StatelessWidget {
  const RubricPreview({
    required this.criteria,
    this.showDetails = false,
    super.key,
  });

  final List<RubricCriterion> criteria;
  final bool showDetails;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalPoints = criteria.fold<int>(0, (sum, c) => sum + c.maxPoints);

    if (criteria.isEmpty) {
      return Text(
        'No rubric',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontStyle: FontStyle.italic,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.grading, size: 16, color: theme.colorScheme.primary),
            const SizedBox(width: 4),
            Text(
              'Rubric: ${criteria.length} criteria, $totalPoints pts total',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
        if (showDetails) ...[
          const SizedBox(height: 8),
          ...criteria.map((c) => Padding(
            padding: const EdgeInsets.only(left: 20, bottom: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    c.name,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                Text(
                  '${c.maxPoints} pts',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          )),
        ],
      ],
    );
  }
}
