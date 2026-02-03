/// Assessment List Screen
///
/// Displays all assessments for a class with filtering, search,
/// and quick actions (create, duplicate, publish, delete).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/assessment.dart';
import '../../providers/assessment_provider.dart';
import 'assessment_builder_screen.dart';
import 'assessment_results_screen.dart';

/// Screen showing list of assessments for a class
class AssessmentListScreen extends ConsumerStatefulWidget {
  const AssessmentListScreen({
    required this.classId,
    this.className,
    super.key,
  });

  final String classId;
  final String? className;

  @override
  ConsumerState<AssessmentListScreen> createState() =>
      _AssessmentListScreenState();
}

class _AssessmentListScreenState extends ConsumerState<AssessmentListScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assessmentListProvider(widget.classId));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.className ?? 'Assessments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context),
            tooltip: 'Filter',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search assessments...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          ref
                              .read(assessmentListProvider(widget.classId)
                                  .notifier)
                              .setSearchQuery('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
              onChanged: (value) {
                ref
                    .read(assessmentListProvider(widget.classId).notifier)
                    .setSearchQuery(value);
              },
            ),
          ),

          // Filter chips
          _buildFilterChips(context, state),

          // Assessment list
          Expanded(
            child: _buildAssessmentList(context, state),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createNewAssessment(context),
        icon: const Icon(Icons.add),
        label: const Text('Create'),
      ),
    );
  }

  Widget _buildFilterChips(BuildContext context, AssessmentListState state) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _FilterChip(
            label: 'All (${state.assessments.length})',
            selected: state.filter == AssessmentListFilter.all,
            onSelected: () => ref
                .read(assessmentListProvider(widget.classId).notifier)
                .setFilter(AssessmentListFilter.all),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Draft (${state.draftCount})',
            selected: state.filter == AssessmentListFilter.draft,
            onSelected: () => ref
                .read(assessmentListProvider(widget.classId).notifier)
                .setFilter(AssessmentListFilter.draft),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Published (${state.publishedCount})',
            selected: state.filter == AssessmentListFilter.published,
            onSelected: () => ref
                .read(assessmentListProvider(widget.classId).notifier)
                .setFilter(AssessmentListFilter.published),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Archived',
            selected: state.filter == AssessmentListFilter.archived,
            onSelected: () => ref
                .read(assessmentListProvider(widget.classId).notifier)
                .setFilter(AssessmentListFilter.archived),
          ),
        ],
      ),
    );
  }

  Widget _buildAssessmentList(BuildContext context, AssessmentListState state) {
    if (state.isLoading && state.assessments.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.assessments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Failed to load assessments',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref
                  .read(assessmentListProvider(widget.classId).notifier)
                  .refresh(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final assessments = state.filteredAssessments;

    if (assessments.isEmpty) {
      return _buildEmptyState(context, state);
    }

    return RefreshIndicator(
      onRefresh: () => ref
          .read(assessmentListProvider(widget.classId).notifier)
          .refresh(),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        itemCount: assessments.length,
        itemBuilder: (context, index) {
          return _AssessmentCard(
            assessment: assessments[index],
            onTap: () => _openAssessment(context, assessments[index]),
            onEdit: () => _editAssessment(context, assessments[index]),
            onDuplicate: () => _duplicateAssessment(assessments[index]),
            onPublish: assessments[index].status == AssessmentStatus.draft
                ? () => _publishAssessment(assessments[index])
                : null,
            onDelete: () => _deleteAssessment(context, assessments[index]),
            onViewResults: assessments[index].isPublished
                ? () => _viewResults(context, assessments[index])
                : null,
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AssessmentListState state) {
    final isFiltered = state.filter != AssessmentListFilter.all ||
        state.searchQuery.isNotEmpty ||
        state.selectedType != null;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isFiltered ? Icons.filter_alt_off : Icons.quiz_outlined,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 24),
            Text(
              isFiltered
                  ? 'No assessments match your filters'
                  : 'No assessments yet',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              isFiltered
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first assessment to get started',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (!isFiltered)
              ElevatedButton.icon(
                onPressed: () => _createNewAssessment(context),
                icon: const Icon(Icons.add),
                label: const Text('Create Assessment'),
              )
            else
              TextButton(
                onPressed: () {
                  _searchController.clear();
                  final notifier = ref.read(
                    assessmentListProvider(widget.classId).notifier,
                  );
                  notifier.setFilter(AssessmentListFilter.all);
                  notifier.setSearchQuery('');
                  notifier.setTypeFilter(null);
                },
                child: const Text('Clear Filters'),
              ),
          ],
        ),
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    final state = ref.read(assessmentListProvider(widget.classId));

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Consumer(
          builder: (context, ref, _) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Filter by Type',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      TextButton(
                        onPressed: () {
                          ref
                              .read(assessmentListProvider(widget.classId)
                                  .notifier)
                              .setTypeFilter(null);
                          Navigator.pop(context);
                        },
                        child: const Text('Clear'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: AssessmentType.values.map((type) {
                      final isSelected = state.selectedType == type;
                      return FilterChip(
                        label: Text(type.label),
                        selected: isSelected,
                        onSelected: (selected) {
                          ref
                              .read(assessmentListProvider(widget.classId)
                                  .notifier)
                              .setTypeFilter(selected ? type : null);
                          Navigator.pop(context);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _createNewAssessment(BuildContext context) {
    _showCreateDialog(context);
  }

  void _showCreateDialog(BuildContext context) {
    AssessmentType selectedType = AssessmentType.quiz;
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Create Assessment'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Assessment Name',
                      hintText: 'Enter a name...',
                    ),
                    autofocus: true,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Type',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: AssessmentType.values.map((type) {
                      return ChoiceChip(
                        label: Text(type.label),
                        selected: selectedType == type,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => selectedType = type);
                          }
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    await _navigateToBuilder(
                      context,
                      classId: widget.classId,
                      type: selectedType,
                      name: nameController.text.isEmpty
                          ? null
                          : nameController.text,
                    );
                  },
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _navigateToBuilder(
    BuildContext context, {
    required String classId,
    AssessmentType type = AssessmentType.quiz,
    String? name,
    String? assessmentId,
  }) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => AssessmentBuilderScreen(
          classId: classId,
          assessmentId: assessmentId,
          type: type,
          name: name,
        ),
      ),
    );

    if (result == true && mounted) {
      ref.read(assessmentListProvider(widget.classId).notifier).refresh();
    }
  }

  void _openAssessment(BuildContext context, Assessment assessment) {
    if (assessment.status == AssessmentStatus.draft) {
      _editAssessment(context, assessment);
    } else {
      _viewResults(context, assessment);
    }
  }

  void _editAssessment(BuildContext context, Assessment assessment) {
    _navigateToBuilder(
      context,
      classId: widget.classId,
      assessmentId: assessment.id,
    );
  }

  Future<void> _duplicateAssessment(Assessment assessment) async {
    try {
      await ref
          .read(assessmentListProvider(widget.classId).notifier)
          .duplicateAssessment(assessment.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Assessment duplicated'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to duplicate: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _publishAssessment(Assessment assessment) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish Assessment?'),
        content: Text(
          'Publishing "${assessment.name}" will make it available to students. '
          'You will not be able to edit the questions after publishing.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Publish'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ref
          .read(assessmentListProvider(widget.classId).notifier)
          .publishAssessment(assessment.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Assessment published'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to publish: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _deleteAssessment(
    BuildContext context,
    Assessment assessment,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Assessment?'),
        content: Text(
          'Are you sure you want to delete "${assessment.name}"? '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ref
          .read(assessmentListProvider(widget.classId).notifier)
          .deleteAssessment(assessment.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Assessment deleted'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _viewResults(BuildContext context, Assessment assessment) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AssessmentResultsScreen(
          assessmentId: assessment.id,
          assessmentName: assessment.name,
        ),
      ),
    );
  }
}

// ==========================================================================
// WIDGETS
// ==========================================================================

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
      showCheckmark: false,
    );
  }
}

class _AssessmentCard extends StatelessWidget {
  const _AssessmentCard({
    required this.assessment,
    required this.onTap,
    required this.onEdit,
    required this.onDuplicate,
    this.onPublish,
    required this.onDelete,
    this.onViewResults,
  });

  final Assessment assessment;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDuplicate;
  final VoidCallback? onPublish;
  final VoidCallback onDelete;
  final VoidCallback? onViewResults;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type icon
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: _getTypeColor(assessment.type).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _getTypeIcon(assessment.type),
                      color: _getTypeColor(assessment.type),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Title and meta
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          assessment.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (assessment.description != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            assessment.description!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Menu
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) {
                      switch (value) {
                        case 'edit':
                          onEdit();
                          break;
                        case 'duplicate':
                          onDuplicate();
                          break;
                        case 'publish':
                          onPublish?.call();
                          break;
                        case 'results':
                          onViewResults?.call();
                          break;
                        case 'delete':
                          onDelete();
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: ListTile(
                          leading: Icon(Icons.edit),
                          title: Text('Edit'),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'duplicate',
                        child: ListTile(
                          leading: Icon(Icons.copy),
                          title: Text('Duplicate'),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                      if (onPublish != null)
                        const PopupMenuItem(
                          value: 'publish',
                          child: ListTile(
                            leading: Icon(Icons.publish),
                            title: Text('Publish'),
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      if (onViewResults != null)
                        const PopupMenuItem(
                          value: 'results',
                          child: ListTile(
                            leading: Icon(Icons.analytics),
                            title: Text('View Results'),
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'delete',
                        child: ListTile(
                          leading: Icon(Icons.delete, color: Colors.red),
                          title: Text('Delete',
                              style: TextStyle(color: Colors.red)),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),

              // Stats row
              Row(
                children: [
                  // Status badge
                  _StatusBadge(status: assessment.status),
                  const SizedBox(width: 12),

                  // Type badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      assessment.type.label,
                      style: theme.textTheme.labelSmall,
                    ),
                  ),

                  const Spacer(),

                  // Questions count
                  Icon(Icons.quiz_outlined,
                      size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${assessment.questionCount} questions',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),

                  const SizedBox(width: 12),

                  // Points
                  Icon(Icons.grade_outlined,
                      size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${assessment.totalPoints} pts',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getTypeIcon(AssessmentType type) {
    switch (type) {
      case AssessmentType.quiz:
        return Icons.quiz;
      case AssessmentType.test:
        return Icons.assignment;
      case AssessmentType.exam:
        return Icons.school;
      case AssessmentType.practice:
        return Icons.fitness_center;
      case AssessmentType.survey:
        return Icons.poll;
      case AssessmentType.diagnostic:
        return Icons.analytics;
    }
  }

  Color _getTypeColor(AssessmentType type) {
    switch (type) {
      case AssessmentType.quiz:
        return Colors.blue;
      case AssessmentType.test:
        return Colors.purple;
      case AssessmentType.exam:
        return Colors.red;
      case AssessmentType.practice:
        return Colors.green;
      case AssessmentType.survey:
        return Colors.orange;
      case AssessmentType.diagnostic:
        return Colors.teal;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final AssessmentStatus status;

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case AssessmentStatus.draft:
        color = Colors.grey;
        label = 'Draft';
        break;
      case AssessmentStatus.published:
        color = Colors.green;
        label = 'Published';
        break;
      case AssessmentStatus.archived:
        color = Colors.brown;
        label = 'Archived';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
