/// Rubric Builder Screen
///
/// Screen for creating and editing rubrics.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/rubric.dart';
import '../../providers/grading_provider.dart';
import 'widgets/widgets.dart';

/// Screen for building/editing rubrics.
class RubricBuilderScreen extends ConsumerStatefulWidget {
  const RubricBuilderScreen({
    super.key,
    this.rubricId,
  });

  final String? rubricId;

  @override
  ConsumerState<RubricBuilderScreen> createState() => _RubricBuilderScreenState();
}

class _RubricBuilderScreenState extends ConsumerState<RubricBuilderScreen> {
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.rubricId != null) {
        ref.read(rubricBuilderProvider.notifier).loadRubric(widget.rubricId!);
      } else {
        ref.read(rubricBuilderProvider.notifier).initializeNew();
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(rubricBuilderProvider);
    final theme = Theme.of(context);

    // Sync controllers with state
    if (_nameController.text != state.rubric.name) {
      _nameController.text = state.rubric.name;
    }
    if (_descriptionController.text != (state.rubric.description ?? '')) {
      _descriptionController.text = state.rubric.description ?? '';
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.rubricId != null ? 'Edit Rubric' : 'New Rubric'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _handleClose(context, state),
        ),
        actions: [
          if (state.isDirty)
            TextButton(
              onPressed: state.isSaving ? null : () => _handleSave(context),
              child: state.isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save'),
            ),
          IconButton(
            icon: const Icon(Icons.auto_awesome),
            onPressed: () => _showAIGenerateDialog(context),
            tooltip: 'Generate with AI',
          ),
          PopupMenuButton<String>(
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'templates',
                child: Row(
                  children: [
                    Icon(Icons.library_books),
                    SizedBox(width: 8),
                    Text('Use Template'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'preview',
                child: Row(
                  children: [
                    Icon(Icons.preview),
                    SizedBox(width: 8),
                    Text('Preview'),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'templates') {
                _showTemplatesDialog(context);
              } else if (value == 'preview') {
                _showPreview(context, state.rubric);
              }
            },
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildContent(state, theme),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          ref.read(rubricBuilderProvider.notifier).addCriterion();
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Criterion'),
      ),
    );
  }

  Widget _buildContent(RubricBuilderState state, ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Basic info
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Basic Information',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Rubric Name',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) {
                    ref.read(rubricBuilderProvider.notifier).updateName(value);
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description (optional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                  onChanged: (value) {
                    ref.read(rubricBuilderProvider.notifier).updateDescription(
                          value.isEmpty ? null : value,
                        );
                  },
                ),
                const SizedBox(height: 16),
                // Rubric type selector
                Text(
                  'Rubric Type',
                  style: theme.textTheme.labelMedium,
                ),
                const SizedBox(height: 8),
                SegmentedButton<RubricType>(
                  segments: RubricType.values.map((type) {
                    return ButtonSegment(
                      value: type,
                      label: Text(type.label),
                    );
                  }).toList(),
                  selected: {state.rubric.type},
                  onSelectionChanged: (selection) {
                    ref.read(rubricBuilderProvider.notifier).updateType(selection.first);
                  },
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Criteria header
        Row(
          children: [
            Text(
              'Criteria',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            Text(
              '${state.rubric.criteria.length} criteria • ${state.rubric.totalMaxScore.toStringAsFixed(0)} points',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Criteria list
        if (state.rubric.criteria.isEmpty)
          _EmptyCriteriaState(
            onAdd: () {
              ref.read(rubricBuilderProvider.notifier).addCriterion();
            },
          )
        else
          ReorderableListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            buildDefaultDragHandles: false,
            itemCount: state.rubric.criteria.length,
            onReorder: (oldIndex, newIndex) {
              ref.read(rubricBuilderProvider.notifier).reorderCriteria(
                    oldIndex,
                    newIndex,
                  );
            },
            itemBuilder: (context, index) {
              final criterion = state.rubric.criteria[index];
              final isSelected = criterion.id == state.selectedCriterionId;

              return Padding(
                key: ValueKey(criterion.id),
                padding: const EdgeInsets.only(bottom: 8),
                child: isSelected
                    ? EditableCriterionCard(
                        criterion: criterion,
                        onChanged: (updated) {
                          ref.read(rubricBuilderProvider.notifier).updateCriterion(updated);
                        },
                        onDelete: state.rubric.criteria.length > 1
                            ? () {
                                ref.read(rubricBuilderProvider.notifier).removeCriterion(criterion.id);
                              }
                            : null,
                      )
                    : RubricCriterionCard(
                        criterion: criterion,
                        isSelected: false,
                        onTap: () {
                          ref.read(rubricBuilderProvider.notifier).selectCriterion(criterion.id);
                        },
                        onEdit: () {
                          ref.read(rubricBuilderProvider.notifier).selectCriterion(criterion.id);
                        },
                        onDelete: state.rubric.criteria.length > 1
                            ? () {
                                _confirmDeleteCriterion(context, criterion);
                              }
                            : null,
                        reorderHandle: ReorderableDragStartListener(
                          index: index,
                          child: const Icon(Icons.drag_handle),
                        ),
                      ),
              );
            },
          ),
        const SizedBox(height: 100),
      ],
    );
  }

  Future<void> _handleClose(BuildContext context, RubricBuilderState state) async {
    if (state.isDirty) {
      final result = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Discard changes?'),
          content: const Text('You have unsaved changes. Are you sure you want to leave?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Discard'),
            ),
          ],
        ),
      );
      if (result == true && context.mounted) {
        context.pop();
      }
    } else {
      context.pop();
    }
  }

  Future<void> _handleSave(BuildContext context) async {
    try {
      await ref.read(rubricBuilderProvider.notifier).save();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rubric saved'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _confirmDeleteCriterion(BuildContext context, RubricCriterion criterion) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Criterion'),
        content: Text('Are you sure you want to delete "${criterion.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(rubricBuilderProvider.notifier).removeCriterion(criterion.id);
              Navigator.of(context).pop();
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showAIGenerateDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate with AI'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Describe your assignment and AI will generate appropriate rubric criteria.'),
            const SizedBox(height: 16),
            TextField(
              controller: titleController,
              decoration: const InputDecoration(
                labelText: 'Assignment Title',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Assignment Description',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(rubricBuilderProvider.notifier).generateWithAI(
                    assignmentTitle: titleController.text,
                    assignmentDescription: descController.text,
                  );
            },
            child: const Text('Generate'),
          ),
        ],
      ),
    );
  }

  void _showTemplatesDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.3,
        expand: false,
        builder: (context, scrollController) {
          final templatesAsync = ref.watch(rubricTemplatesProvider);

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Rubric Templates',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: templatesAsync.when(
                    data: (templates) => ListView.builder(
                      controller: scrollController,
                      itemCount: templates.length,
                      itemBuilder: (context, index) {
                        final template = templates[index];
                        return Card(
                          child: ListTile(
                            title: Text(template.name),
                            subtitle: Text(template.description ?? ''),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.of(context).pop();
                              ref.read(rubricBuilderProvider.notifier).loadFromTemplate(template);
                            },
                          ),
                        );
                      },
                    ),
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showPreview(BuildContext context, Rubric rubric) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => _RubricPreview(
          rubric: rubric,
          scrollController: scrollController,
        ),
      ),
    );
  }
}

/// Empty criteria state.
class _EmptyCriteriaState extends StatelessWidget {
  const _EmptyCriteriaState({required this.onAdd});

  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.checklist,
            size: 48,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'No Criteria Yet',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Add criteria to define how submissions will be evaluated.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onAdd,
            icon: const Icon(Icons.add),
            label: const Text('Add First Criterion'),
          ),
        ],
      ),
    );
  }
}

/// Rubric preview widget.
class _RubricPreview extends StatelessWidget {
  const _RubricPreview({
    required this.rubric,
    required this.scrollController,
  });

  final Rubric rubric;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Preview: ${rubric.name}',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          if (rubric.description != null) ...[
            const SizedBox(height: 8),
            Text(
              rubric.description!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            '${rubric.type.label} Rubric • ${rubric.totalMaxScore.toStringAsFixed(0)} points',
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 24),
          ...rubric.criteria.map((criterion) {
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            criterion.name,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
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
                            '${criterion.maxPoints.toStringAsFixed(0)} pts',
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (criterion.description != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        criterion.description!,
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 12),
                    const Divider(),
                    ...criterion.levels.map((level) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(
                                  level.points.toStringAsFixed(0),
                                  style: theme.textTheme.labelLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    level.label,
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    level.description,
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: theme.colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
