/// SEL Observation Screen
///
/// Tools for recording and tracking Social-Emotional Learning observations.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/monitoring.dart';
import '../../providers/monitoring_provider.dart';

/// Screen for recording and viewing SEL observations.
class SELObservationScreen extends ConsumerStatefulWidget {
  const SELObservationScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<SELObservationScreen> createState() => _SELObservationScreenState();
}

class _SELObservationScreenState extends ConsumerState<SELObservationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(selObservationsProvider(widget.classId).notifier).load();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('SEL Observations'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Quick Log'),
            Tab(text: 'History'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart),
            onPressed: () => _showClassSummary(),
            tooltip: 'Class Summary',
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _QuickLogTab(classId: widget.classId),
          _HistoryTab(classId: widget.classId),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddObservationSheet(),
        icon: const Icon(Icons.add),
        label: const Text('New Observation'),
      ),
    );
  }

  void _showAddObservationSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AddObservationSheet(classId: widget.classId),
    );
  }

  void _showClassSummary() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _ClassSELSummarySheet(classId: widget.classId),
    );
  }
}

/// Tab for quick observation logging.
class _QuickLogTab extends ConsumerWidget {
  const _QuickLogTab({required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final presetsAsync = ref.watch(observationPresetsProvider);
    final quickState = ref.watch(quickObservationStateProvider);
    final theme = Theme.of(context);

    return presetsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error loading presets: $e')),
      data: (presets) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Student selector
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Select Student',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _StudentSelector(
                    classId: classId,
                    selectedStudentId: quickState.selectedStudent,
                    onChanged: (studentId) {
                      ref.read(quickObservationStateProvider.notifier).state =
                          quickState.copyWith(selectedStudent: studentId);
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Quick presets by competency
          ...SELCompetency.values.map((competency) {
            final competencyPresets =
                presets.where((p) => p.competency == competency).toList();
            if (competencyPresets.isEmpty) return const SizedBox.shrink();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        _getCompetencyIcon(competency),
                        color: _getCompetencyColor(competency),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        competency.name.replaceAll('_', ' ').toUpperCase(),
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: _getCompetencyColor(competency),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: competencyPresets.map((preset) {
                    return _QuickPresetChip(
                      preset: preset,
                      isSelected: quickState.selectedPreset?.id == preset.id,
                      onTap: () {
                        ref.read(quickObservationStateProvider.notifier).state =
                            quickState.copyWith(selectedPreset: preset);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
              ],
            );
          }),

          const SizedBox(height: 16),

          // Optional note
          TextField(
            decoration: const InputDecoration(
              labelText: 'Add a note (optional)',
              border: OutlineInputBorder(),
              hintText: 'Context or additional details...',
            ),
            maxLines: 2,
            onChanged: (value) {
              ref.read(quickObservationStateProvider.notifier).state =
                  quickState.copyWith(note: value);
            },
          ),
          const SizedBox(height: 16),

          // Submit button
          FilledButton.icon(
            onPressed: quickState.selectedStudent != null &&
                    quickState.selectedPreset != null &&
                    !quickState.isSubmitting
                ? () => _submitQuickObservation(ref, quickState)
                : null,
            icon: quickState.isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check),
            label: Text(quickState.isSubmitting ? 'Logging...' : 'Log Observation'),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Future<void> _submitQuickObservation(
      WidgetRef ref, QuickObservationState state) async {
    ref.read(quickObservationStateProvider.notifier).state =
        state.copyWith(isSubmitting: true);

    try {
      await ref.read(selObservationsProvider(classId).notifier).logQuickObservation(
            state.selectedStudent!,
            state.selectedPreset!.id,
            note: state.note.isNotEmpty ? state.note : null,
          );

      ref.read(quickObservationStateProvider.notifier).state =
          const QuickObservationState();

      if (ref.context.mounted) {
        ScaffoldMessenger.of(ref.context).showSnackBar(
          const SnackBar(
            content: Text('Observation logged'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      ref.read(quickObservationStateProvider.notifier).state =
          state.copyWith(isSubmitting: false);

      if (ref.context.mounted) {
        ScaffoldMessenger.of(ref.context).showSnackBar(
          SnackBar(
            content: Text('Failed to log observation: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  IconData _getCompetencyIcon(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Icons.psychology;
      case SELCompetency.selfManagement:
        return Icons.self_improvement;
      case SELCompetency.socialAwareness:
        return Icons.people;
      case SELCompetency.relationshipSkills:
        return Icons.handshake;
      case SELCompetency.responsibleDecisionMaking:
        return Icons.lightbulb;
    }
  }

  Color _getCompetencyColor(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Colors.purple;
      case SELCompetency.selfManagement:
        return Colors.blue;
      case SELCompetency.socialAwareness:
        return Colors.green;
      case SELCompetency.relationshipSkills:
        return Colors.orange;
      case SELCompetency.responsibleDecisionMaking:
        return Colors.teal;
    }
  }
}

/// Quick preset chip widget.
class _QuickPresetChip extends StatelessWidget {
  const _QuickPresetChip({
    required this.preset,
    required this.isSelected,
    required this.onTap,
  });

  final ObservationPreset preset;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ActionChip(
      avatar: Text(
        preset.emoji,
        style: const TextStyle(fontSize: 16),
      ),
      label: Text(preset.label),
      backgroundColor: isSelected
          ? theme.colorScheme.primaryContainer
          : null,
      side: isSelected
          ? BorderSide(color: theme.colorScheme.primary, width: 2)
          : null,
      onPressed: onTap,
    );
  }
}

/// Student selector dropdown.
class _StudentSelector extends StatelessWidget {
  const _StudentSelector({
    required this.classId,
    required this.selectedStudentId,
    required this.onChanged,
  });

  final String classId;
  final String? selectedStudentId;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    // In a real implementation, this would fetch students from a provider
    // For now, using placeholder data
    final students = [
      ('student1', 'Alice Johnson'),
      ('student2', 'Bob Smith'),
      ('student3', 'Charlie Brown'),
      ('student4', 'Diana Ross'),
      ('student5', 'Edward Chen'),
    ];

    return DropdownButtonFormField<String>(
      value: selectedStudentId,
      decoration: const InputDecoration(
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      hint: const Text('Choose a student'),
      items: students.map((s) {
        final (id, name) = s;
        return DropdownMenuItem(
          value: id,
          child: Text(name),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }
}

/// Tab showing observation history.
class _HistoryTab extends ConsumerWidget {
  const _HistoryTab({required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(selObservationsProvider(classId));
    final theme = Theme.of(context);

    if (state.isLoading && state.observations.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.observations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.note_alt_outlined,
              size: 64,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No observations yet',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Start recording SEL observations\nusing the Quick Log tab',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Filters
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: _CompetencyFilter(
                  value: state.competencyFilter,
                  onChanged: (competency) {
                    ref
                        .read(selObservationsProvider(classId).notifier)
                        .setCompetencyFilter(competency);
                  },
                ),
              ),
            ],
          ),
        ),

        // Observation list
        Expanded(
          child: RefreshIndicator(
            onRefresh: () =>
                ref.read(selObservationsProvider(classId).notifier).load(),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: state.observations.length,
              itemBuilder: (context, index) {
                final observation = state.observations[index];
                return _ObservationCard(
                  observation: observation,
                  onTap: () => _showObservationDetails(context, observation),
                  onDelete: () => _deleteObservation(ref, observation.id),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  void _showObservationDetails(BuildContext context, SELObservation observation) {
    showDialog(
      context: context,
      builder: (context) => _ObservationDetailsDialog(observation: observation),
    );
  }

  Future<void> _deleteObservation(WidgetRef ref, String observationId) async {
    try {
      await ref
          .read(selObservationsProvider(classId).notifier)
          .deleteObservation(observationId);
    } catch (e) {
      if (ref.context.mounted) {
        ScaffoldMessenger.of(ref.context).showSnackBar(
          SnackBar(content: Text('Failed to delete: $e')),
        );
      }
    }
  }
}

/// Competency filter dropdown.
class _CompetencyFilter extends StatelessWidget {
  const _CompetencyFilter({
    required this.value,
    required this.onChanged,
  });

  final SELCompetency? value;
  final ValueChanged<SELCompetency?> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<SELCompetency?>(
      value: value,
      decoration: const InputDecoration(
        labelText: 'Filter by Competency',
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      items: [
        const DropdownMenuItem(
          value: null,
          child: Text('All Competencies'),
        ),
        ...SELCompetency.values.map((c) => DropdownMenuItem(
              value: c,
              child: Text(c.name.replaceAll('_', ' ')),
            )),
      ],
      onChanged: onChanged,
    );
  }
}

/// Card displaying an observation.
class _ObservationCard extends StatelessWidget {
  const _ObservationCard({
    required this.observation,
    required this.onTap,
    required this.onDelete,
  });

  final SELObservation observation;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getCompetencyColor(observation.competency);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 60,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          observation.studentName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            observation.competency.name.replaceAll('_', ' '),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: color,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      observation.description,
                      style: theme.textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatDate(observation.observedAt),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _confirmDelete(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Observation?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              onDelete();
            },
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Color _getCompetencyColor(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Colors.purple;
      case SELCompetency.selfManagement:
        return Colors.blue;
      case SELCompetency.socialAwareness:
        return Colors.green;
      case SELCompetency.relationshipSkills:
        return Colors.orange;
      case SELCompetency.responsibleDecisionMaking:
        return Colors.teal;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }
}

/// Dialog showing observation details.
class _ObservationDetailsDialog extends StatelessWidget {
  const _ObservationDetailsDialog({required this.observation});

  final SELObservation observation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getCompetencyColor(observation.competency);

    return AlertDialog(
      title: Row(
        children: [
          CircleAvatar(
            backgroundColor: color,
            child: Text(
              observation.studentName.substring(0, 1),
              style: const TextStyle(color: Colors.white),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(observation.studentName),
                Text(
                  observation.competency.name.replaceAll('_', ' '),
                  style: theme.textTheme.labelSmall?.copyWith(color: color),
                ),
              ],
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            observation.description,
            style: theme.textTheme.bodyMedium,
          ),
          if (observation.notes != null) ...[
            const SizedBox(height: 16),
            Text(
              'Notes',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              observation.notes!,
              style: theme.textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(
                Icons.schedule,
                size: 16,
                color: theme.colorScheme.outline,
              ),
              const SizedBox(width: 4),
              Text(
                _formatFullDate(observation.observedAt),
                style: theme.textTheme.labelSmall,
              ),
            ],
          ),
          if (observation.context != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  size: 16,
                  color: theme.colorScheme.outline,
                ),
                const SizedBox(width: 4),
                Text(
                  observation.context!,
                  style: theme.textTheme.labelSmall,
                ),
              ],
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }

  Color _getCompetencyColor(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Colors.purple;
      case SELCompetency.selfManagement:
        return Colors.blue;
      case SELCompetency.socialAwareness:
        return Colors.green;
      case SELCompetency.relationshipSkills:
        return Colors.orange;
      case SELCompetency.responsibleDecisionMaking:
        return Colors.teal;
    }
  }

  String _formatFullDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year} at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}

/// Bottom sheet for adding a detailed observation.
class _AddObservationSheet extends ConsumerStatefulWidget {
  const _AddObservationSheet({required this.classId});

  final String classId;

  @override
  ConsumerState<_AddObservationSheet> createState() => _AddObservationSheetState();
}

class _AddObservationSheetState extends ConsumerState<_AddObservationSheet> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _notesController = TextEditingController();
  final _contextController = TextEditingController();

  String? _selectedStudentId;
  SELCompetency? _selectedCompetency;
  ObservationType _selectedType = ObservationType.positive;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    _notesController.dispose();
    _contextController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return Form(
            key: _formKey,
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(16),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outline,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'New Observation',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),

                // Student selector
                _StudentSelector(
                  classId: widget.classId,
                  selectedStudentId: _selectedStudentId,
                  onChanged: (id) => setState(() => _selectedStudentId = id),
                ),
                const SizedBox(height: 16),

                // Competency selector
                DropdownButtonFormField<SELCompetency>(
                  value: _selectedCompetency,
                  decoration: const InputDecoration(
                    labelText: 'SEL Competency',
                    border: OutlineInputBorder(),
                  ),
                  items: SELCompetency.values
                      .map((c) => DropdownMenuItem(
                            value: c,
                            child: Text(c.name.replaceAll('_', ' ')),
                          ))
                      .toList(),
                  onChanged: (c) => setState(() => _selectedCompetency = c),
                  validator: (v) => v == null ? 'Please select a competency' : null,
                ),
                const SizedBox(height: 16),

                // Observation type
                Text(
                  'Observation Type',
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 8),
                SegmentedButton<ObservationType>(
                  segments: ObservationType.values
                      .map((t) => ButtonSegment(
                            value: t,
                            label: Text(t.name),
                            icon: Icon(_getTypeIcon(t)),
                          ))
                      .toList(),
                  selected: {_selectedType},
                  onSelectionChanged: (s) =>
                      setState(() => _selectedType = s.first),
                ),
                const SizedBox(height: 16),

                // Description
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'What did you observe?',
                    border: OutlineInputBorder(),
                    hintText: 'Describe the student behavior or action...',
                  ),
                  maxLines: 3,
                  validator: (v) =>
                      v == null || v.isEmpty ? 'Please enter a description' : null,
                ),
                const SizedBox(height: 16),

                // Context
                TextFormField(
                  controller: _contextController,
                  decoration: const InputDecoration(
                    labelText: 'Context (optional)',
                    border: OutlineInputBorder(),
                    hintText: 'e.g., During group work, At recess...',
                  ),
                ),
                const SizedBox(height: 16),

                // Notes
                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(
                    labelText: 'Additional Notes (optional)',
                    border: OutlineInputBorder(),
                    hintText: 'Any additional context or follow-up needed...',
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 24),

                // Submit
                FilledButton.icon(
                  onPressed: _isSubmitting ? null : _submit,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save),
                  label: Text(_isSubmitting ? 'Saving...' : 'Save Observation'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      ),
    );
  }

  IconData _getTypeIcon(ObservationType type) {
    switch (type) {
      case ObservationType.positive:
        return Icons.thumb_up;
      case ObservationType.concern:
        return Icons.warning;
      case ObservationType.neutral:
        return Icons.remove;
      case ObservationType.milestone:
        return Icons.star;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedStudentId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a student')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final observation = SELObservation(
        id: '',
        studentId: _selectedStudentId!,
        studentName: 'Student', // Would be looked up from student list
        competency: _selectedCompetency!,
        type: _selectedType,
        description: _descriptionController.text,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        context: _contextController.text.isNotEmpty ? _contextController.text : null,
        observedAt: DateTime.now(),
        teacherId: 'current_teacher', // Would come from auth
        teacherName: 'Current Teacher',
      );

      await ref
          .read(selObservationsProvider(widget.classId).notifier)
          .addObservation(observation);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Observation saved'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save observation: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}

/// Sheet showing class-wide SEL summary.
class _ClassSELSummarySheet extends ConsumerWidget {
  const _ClassSELSummarySheet({required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(classSELSummaryProvider(classId));
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return summaryAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error: $e')),
          data: (summaries) => ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outline,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Class SEL Summary',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${summaries.length} students',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 24),

              // Competency averages
              ...SELCompetency.values.map((competency) {
                final scores = summaries
                    .map((s) => s.scores[competency] ?? 0.0)
                    .toList();
                final average = scores.isNotEmpty
                    ? scores.reduce((a, b) => a + b) / scores.length
                    : 0.0;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _CompetencyScoreBar(
                    competency: competency,
                    score: average,
                  ),
                );
              }),

              const Divider(height: 32),

              // Students list
              Text(
                'Individual Students',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...summaries.map((summary) => _StudentSELSummaryTile(
                    summary: summary,
                  )),
            ],
          ),
        );
      },
    );
  }
}

/// Bar showing competency score.
class _CompetencyScoreBar extends StatelessWidget {
  const _CompetencyScoreBar({
    required this.competency,
    required this.score,
  });

  final SELCompetency competency;
  final double score;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getCompetencyColor(competency);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(_getCompetencyIcon(competency), size: 18, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                competency.name.replaceAll('_', ' '),
                style: theme.textTheme.labelMedium,
              ),
            ),
            Text(
              '${(score * 100).toStringAsFixed(0)}%',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: score,
          backgroundColor: color.withValues(alpha: 0.2),
          valueColor: AlwaysStoppedAnimation(color),
        ),
      ],
    );
  }

  IconData _getCompetencyIcon(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Icons.psychology;
      case SELCompetency.selfManagement:
        return Icons.self_improvement;
      case SELCompetency.socialAwareness:
        return Icons.people;
      case SELCompetency.relationshipSkills:
        return Icons.handshake;
      case SELCompetency.responsibleDecisionMaking:
        return Icons.lightbulb;
    }
  }

  Color _getCompetencyColor(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Colors.purple;
      case SELCompetency.selfManagement:
        return Colors.blue;
      case SELCompetency.socialAwareness:
        return Colors.green;
      case SELCompetency.relationshipSkills:
        return Colors.orange;
      case SELCompetency.responsibleDecisionMaking:
        return Colors.teal;
    }
  }
}

/// Tile showing student's SEL summary.
class _StudentSELSummaryTile extends StatelessWidget {
  const _StudentSELSummaryTile({required this.summary});

  final SELSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          child: Text(summary.studentName.substring(0, 1)),
        ),
        title: Text(summary.studentName),
        subtitle: Text(
          '${summary.totalObservations} observations',
          style: theme.textTheme.bodySmall,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: SELCompetency.values.take(3).map((c) {
            final score = summary.scores[c] ?? 0.0;
            return Padding(
              padding: const EdgeInsets.only(left: 4),
              child: CircleAvatar(
                radius: 12,
                backgroundColor: _getCompetencyColor(c).withValues(alpha: score),
                child: Icon(
                  _getCompetencyIcon(c),
                  size: 12,
                  color: Colors.white,
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  IconData _getCompetencyIcon(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Icons.psychology;
      case SELCompetency.selfManagement:
        return Icons.self_improvement;
      case SELCompetency.socialAwareness:
        return Icons.people;
      case SELCompetency.relationshipSkills:
        return Icons.handshake;
      case SELCompetency.responsibleDecisionMaking:
        return Icons.lightbulb;
    }
  }

  Color _getCompetencyColor(SELCompetency competency) {
    switch (competency) {
      case SELCompetency.selfAwareness:
        return Colors.purple;
      case SELCompetency.selfManagement:
        return Colors.blue;
      case SELCompetency.socialAwareness:
        return Colors.green;
      case SELCompetency.relationshipSkills:
        return Colors.orange;
      case SELCompetency.responsibleDecisionMaking:
        return Colors.teal;
    }
  }
}
