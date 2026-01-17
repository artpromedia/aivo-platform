/// Intervention Tools Screen
///
/// Manage behavior interventions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../main.dart';
import 'models.dart';
import 'providers.dart';

class InterventionToolsScreen extends ConsumerStatefulWidget {
  const InterventionToolsScreen({
    required this.studentId,
    required this.studentName,
    super.key,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<InterventionToolsScreen> createState() =>
      _InterventionToolsScreenState();
}

class _InterventionToolsScreenState
    extends ConsumerState<InterventionToolsScreen> {
  InterventionStatus? _filterStatus;

  @override
  Widget build(BuildContext context) {
    final interventionsAsync = ref.watch(
      behaviorInterventionsProvider((
        studentId: widget.studentId,
        status: _filterStatus,
      )),
    );

    return Scaffold(
      body: Column(
        children: [
          _buildStatusFilter(),
          Expanded(
            child: interventionsAsync.when(
              data: (interventions) {
                if (interventions.isEmpty) {
                  return const Center(
                    child: Text('No interventions yet.'),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: interventions.length,
                  itemBuilder: (context, index) {
                    return _InterventionCard(
                      intervention: interventions[index],
                      studentId: widget.studentId,
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(child: Text('Error: $error')),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('New Intervention'),
      ),
    );
  }

  Widget _buildStatusFilter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      ),
      child: DropdownButtonFormField<InterventionStatus?>(
        initialValue: _filterStatus,
        decoration: const InputDecoration(
          labelText: 'Status',
          border: OutlineInputBorder(),
          isDense: true,
        ),
        items: [
          const DropdownMenuItem(value: null, child: Text('All Statuses')),
          ...InterventionStatus.values.map(
            (status) => DropdownMenuItem(
              value: status,
              child: Text(_formatStatus(status)),
            ),
          ),
        ],
        onChanged: (value) => setState(() => _filterStatus = value),
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _InterventionFormDialog(
        studentId: widget.studentId,
      ),
    );
  }

  String _formatStatus(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.planned:
        return 'Planned';
      case InterventionStatus.active:
        return 'Active';
      case InterventionStatus.onHold:
        return 'On Hold';
      case InterventionStatus.completed:
        return 'Completed';
      case InterventionStatus.discontinued:
        return 'Discontinued';
    }
  }
}

class _InterventionCard extends StatelessWidget {
  const _InterventionCard({
    required this.intervention,
    required this.studentId,
  });

  final BehaviorIntervention intervention;
  final String studentId;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showInterventionDetails(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      intervention.strategy,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  _buildStatusChip(colorScheme),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Target: ${intervention.targetBehavior}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                intervention.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (intervention.effectivenessRating != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.star, size: 16, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text(
                      'Effectiveness: ${intervention.effectivenessRating}/5',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(ColorScheme colorScheme) {
    final color = _getStatusColor();
    return Chip(
      label: Text(_formatStatus(intervention.status)),
      backgroundColor: color.withValues(alpha: 0.2),
      labelStyle: TextStyle(color: color, fontSize: 12),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Color _getStatusColor() {
    switch (intervention.status) {
      case InterventionStatus.planned:
        return Colors.blue;
      case InterventionStatus.active:
        return Colors.green;
      case InterventionStatus.onHold:
        return Colors.orange;
      case InterventionStatus.completed:
        return Colors.grey;
      case InterventionStatus.discontinued:
        return Colors.red;
    }
  }

  String _formatStatus(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.planned:
        return 'Planned';
      case InterventionStatus.active:
        return 'Active';
      case InterventionStatus.onHold:
        return 'On Hold';
      case InterventionStatus.completed:
        return 'Completed';
      case InterventionStatus.discontinued:
        return 'Discontinued';
    }
  }

  void _showInterventionDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return _InterventionDetailsSheet(
            intervention: intervention,
            studentId: studentId,
            scrollController: scrollController,
          );
        },
      ),
    );
  }
}

class _InterventionDetailsSheet extends ConsumerWidget {
  const _InterventionDetailsSheet({
    required this.intervention,
    required this.studentId,
    required this.scrollController,
  });

  final BehaviorIntervention intervention;
  final String studentId;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(24),
      child: ListView(
        controller: scrollController,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text('Intervention Details', style: textTheme.headlineSmall),
          const SizedBox(height: 24),
          Text('Strategy', style: textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(intervention.strategy, style: textTheme.bodyLarge),
          const Divider(height: 32),
          Text('Target Behavior', style: textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(intervention.targetBehavior),
          const Divider(height: 32),
          Text('Description', style: textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(intervention.description),
          const Divider(height: 32),
          Text('Implementation', style: textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(intervention.implementation),
          if (intervention.frequency != null) ...[
            const Divider(height: 32),
            Text('Frequency', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(intervention.frequency!),
          ],
          if (intervention.successCriteria != null) ...[
            const Divider(height: 32),
            Text('Success Criteria', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(intervention.successCriteria!),
          ],
          if (intervention.effectivenessRating != null) ...[
            const Divider(height: 32),
            Text('Effectiveness Rating', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (index) {
                return Icon(
                  index < intervention.effectivenessRating!
                      ? Icons.star
                      : Icons.star_border,
                  color: Colors.amber,
                );
              }),
            ),
          ],
          if (intervention.notes != null) ...[
            const Divider(height: 32),
            Text('Notes', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(intervention.notes!),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => _showLogImplementation(context, ref),
            icon: const Icon(Icons.check_circle),
            label: const Text('Log Implementation'),
          ),
        ],
      ),
    );
  }

  void _showLogImplementation(BuildContext context, WidgetRef ref) {
    Navigator.pop(context);
    showDialog(
      context: context,
      builder: (context) => _LogImplementationDialog(
        intervention: intervention,
        studentId: studentId,
      ),
    );
  }
}

class _LogImplementationDialog extends ConsumerStatefulWidget {
  const _LogImplementationDialog({
    required this.intervention,
    required this.studentId,
  });

  final BehaviorIntervention intervention;
  final String studentId;

  @override
  ConsumerState<_LogImplementationDialog> createState() =>
      _LogImplementationDialogState();
}

class _LogImplementationDialogState
    extends ConsumerState<_LogImplementationDialog> {
  late DateTime _selectedDate;
  bool _implemented = true;
  int _effectiveness = 3;
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Log Implementation'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Date'),
              subtitle: Text(DateFormat('MMM d, y').format(_selectedDate)),
              trailing: const Icon(Icons.calendar_today),
              onTap: _selectDate,
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _implemented,
              onChanged: (value) => setState(() => _implemented = value!),
              title: const Text('Intervention Implemented'),
            ),
            const SizedBox(height: 16),
            Text(
              'Effectiveness (1-5)',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Slider(
              value: _effectiveness.toDouble(),
              min: 1,
              max: 5,
              divisions: 4,
              label: _effectiveness.toString(),
              onChanged: (value) => setState(() => _effectiveness = value.toInt()),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Not Effective', style: Theme.of(context).textTheme.bodySmall),
                Text('Very Effective', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saveLog,
          child: const Text('Save'),
        ),
      ],
    );
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _saveLog() async {
    final api = ref.read(behaviorApiProvider);
    await api.recordImplementation(
      interventionId: widget.intervention.id!,
      studentId: widget.studentId,
      date: _selectedDate,
      implemented: _implemented,
      effectiveness: _effectiveness,
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
    );

    if (mounted) {
      Navigator.pop(context);
    }
  }
}

class _InterventionFormDialog extends ConsumerStatefulWidget {
  const _InterventionFormDialog({
    required this.studentId,
  });

  final String studentId;

  @override
  ConsumerState<_InterventionFormDialog> createState() =>
      _InterventionFormDialogState();
}

class _InterventionFormDialogState
    extends ConsumerState<_InterventionFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _targetBehaviorController = TextEditingController();
  final _strategyController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _implementationController = TextEditingController();
  final _frequencyController = TextEditingController();
  final _successCriteriaController = TextEditingController();
  InterventionStatus _status = InterventionStatus.planned;

  @override
  void dispose() {
    _targetBehaviorController.dispose();
    _strategyController.dispose();
    _descriptionController.dispose();
    _implementationController.dispose();
    _frequencyController.dispose();
    _successCriteriaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Create Intervention'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _targetBehaviorController,
                decoration: const InputDecoration(
                  labelText: 'Target Behavior *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter target behavior';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _strategyController,
                decoration: const InputDecoration(
                  labelText: 'Strategy *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter strategy';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter description';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _implementationController,
                decoration: const InputDecoration(
                  labelText: 'Implementation Steps *',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter implementation steps';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _frequencyController,
                decoration: const InputDecoration(
                  labelText: 'Frequency',
                  border: OutlineInputBorder(),
                  hintText: 'e.g., Daily, 3x per week',
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _successCriteriaController,
                decoration: const InputDecoration(
                  labelText: 'Success Criteria',
                  border: OutlineInputBorder(),
                  hintText: 'e.g., Reduction of 50% in incidents',
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<InterventionStatus>(
                initialValue: _status,
                decoration: const InputDecoration(
                  labelText: 'Status',
                  border: OutlineInputBorder(),
                ),
                items: InterventionStatus.values.map((status) {
                  return DropdownMenuItem(
                    value: status,
                    child: Text(_formatStatus(status)),
                  );
                }).toList(),
                onChanged: (value) => setState(() => _status = value!),
              ),
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
          onPressed: _saveIntervention,
          child: const Text('Create'),
        ),
      ],
    );
  }

  Future<void> _saveIntervention() async {
    if (!_formKey.currentState!.validate()) return;

    final authState = ref.read(teacherAuthProvider);
    if (authState.teacherId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Teacher ID not found. Please log in again.')),
      );
      return;
    }

    final intervention = BehaviorIntervention(
      studentId: widget.studentId,
      teacherId: authState.teacherId!,
      targetBehavior: _targetBehaviorController.text,
      strategy: _strategyController.text,
      description: _descriptionController.text,
      implementation: _implementationController.text,
      status: _status,
      startDate: _status == InterventionStatus.active ? DateTime.now() : null,
      frequency: _frequencyController.text.isNotEmpty
          ? _frequencyController.text
          : null,
      successCriteria: _successCriteriaController.text.isNotEmpty
          ? _successCriteriaController.text
          : null,
    );

    await ref
        .read(interventionCreationProvider.notifier)
        .createIntervention(intervention);

    if (mounted) {
      Navigator.pop(context);
      ref.invalidate(behaviorInterventionsProvider);
    }
  }

  String _formatStatus(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.planned:
        return 'Planned';
      case InterventionStatus.active:
        return 'Active';
      case InterventionStatus.onHold:
        return 'On Hold';
      case InterventionStatus.completed:
        return 'Completed';
      case InterventionStatus.discontinued:
        return 'Discontinued';
    }
  }
}
