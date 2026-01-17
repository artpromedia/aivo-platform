/// Incident Logger Screen
///
/// Log and view behavior incidents.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../providers.dart';

class IncidentLoggerScreen extends ConsumerStatefulWidget {
  const IncidentLoggerScreen({
    required this.studentId,
    required this.studentName,
    super.key,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<IncidentLoggerScreen> createState() =>
      _IncidentLoggerScreenState();
}

class _IncidentLoggerScreenState extends ConsumerState<IncidentLoggerScreen> {
  BehaviorType? _filterType;
  BehaviorSeverity? _filterSeverity;

  @override
  Widget build(BuildContext context) {
    final incidentsAsync = ref.watch(
      behaviorIncidentsProvider((
        studentId: widget.studentId,
        startDate: null,
        endDate: null,
      )),
    );

    return Scaffold(
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: incidentsAsync.when(
              data: (incidents) {
                final filtered = _filterIncidents(incidents);
                if (filtered.isEmpty) {
                  return const Center(
                    child: Text('No incidents recorded yet.'),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    return _IncidentCard(incident: filtered[index]);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Text('Error: $error'),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showIncidentDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Log Incident'),
      ),
    );
  }

  Widget _buildFilters() {
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
      child: Row(
        children: [
          Expanded(
            child: DropdownButtonFormField<BehaviorType?>(
              value: _filterType,
              decoration: const InputDecoration(
                labelText: 'Type',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('All Types')),
                ...BehaviorType.values.map(
                  (type) => DropdownMenuItem(
                    value: type,
                    child: Text(_formatBehaviorType(type)),
                  ),
                ),
              ],
              onChanged: (value) => setState(() => _filterType = value),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: DropdownButtonFormField<BehaviorSeverity?>(
              value: _filterSeverity,
              decoration: const InputDecoration(
                labelText: 'Severity',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: [
                const DropdownMenuItem(
                    value: null, child: Text('All Severities')),
                ...BehaviorSeverity.values.map(
                  (severity) => DropdownMenuItem(
                    value: severity,
                    child: Text(_formatSeverity(severity)),
                  ),
                ),
              ],
              onChanged: (value) => setState(() => _filterSeverity = value),
            ),
          ),
        ],
      ),
    );
  }

  List<BehaviorIncident> _filterIncidents(List<BehaviorIncident> incidents) {
    return incidents.where((incident) {
      if (_filterType != null && incident.type != _filterType) return false;
      if (_filterSeverity != null && incident.severity != _filterSeverity) {
        return false;
      }
      return true;
    }).toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  void _showIncidentDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _IncidentFormDialog(
        studentId: widget.studentId,
        studentName: widget.studentName,
      ),
    );
  }

  String _formatBehaviorType(BehaviorType type) {
    switch (type) {
      case BehaviorType.physical:
        return 'Physical';
      case BehaviorType.verbal:
        return 'Verbal';
      case BehaviorType.disruptive:
        return 'Disruptive';
      case BehaviorType.noncompliance:
        return 'Non-Compliance';
      case BehaviorType.offtask:
        return 'Off-Task';
      case BehaviorType.social:
        return 'Social';
      case BehaviorType.selfHarm:
        return 'Self-Harm';
      case BehaviorType.other:
        return 'Other';
    }
  }

  String _formatSeverity(BehaviorSeverity severity) {
    switch (severity) {
      case BehaviorSeverity.low:
        return 'Low';
      case BehaviorSeverity.medium:
        return 'Medium';
      case BehaviorSeverity.high:
        return 'High';
      case BehaviorSeverity.crisis:
        return 'Crisis';
    }
  }
}

class _IncidentCard extends StatelessWidget {
  const _IncidentCard({required this.incident});

  final BehaviorIncident incident;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showIncidentDetails(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildTypeChip(colorScheme),
                  const SizedBox(width: 8),
                  _buildSeverityChip(colorScheme),
                  const Spacer(),
                  Text(
                    DateFormat('MMM d, y').format(incident.date),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                incident.description,
                style: Theme.of(context).textTheme.bodyLarge,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (incident.location != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.location_on,
                        size: 16, color: colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      incident.location!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ],
              if (incident.duration != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.timer,
                        size: 16, color: colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      '${incident.duration} minutes',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
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

  Widget _buildTypeChip(ColorScheme colorScheme) {
    return Chip(
      label: Text(_formatType(incident.type)),
      backgroundColor: colorScheme.primaryContainer,
      labelStyle: TextStyle(
        color: colorScheme.onPrimaryContainer,
        fontSize: 12,
      ),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Widget _buildSeverityChip(ColorScheme colorScheme) {
    final color = _getSeverityColor(colorScheme);
    return Chip(
      label: Text(_formatSeverity(incident.severity)),
      backgroundColor: color.withOpacity(0.2),
      labelStyle: TextStyle(color: color, fontSize: 12),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Color _getSeverityColor(ColorScheme colorScheme) {
    switch (incident.severity) {
      case BehaviorSeverity.low:
        return Colors.green;
      case BehaviorSeverity.medium:
        return Colors.orange;
      case BehaviorSeverity.high:
        return Colors.red;
      case BehaviorSeverity.crisis:
        return Colors.purple;
    }
  }

  String _formatType(BehaviorType type) {
    return type.name[0].toUpperCase() + type.name.substring(1);
  }

  String _formatSeverity(BehaviorSeverity severity) {
    return severity.name[0].toUpperCase() + severity.name.substring(1);
  }

  void _showIncidentDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return _IncidentDetailsSheet(
            incident: incident,
            scrollController: scrollController,
          );
        },
      ),
    );
  }
}

class _IncidentDetailsSheet extends StatelessWidget {
  const _IncidentDetailsSheet({
    required this.incident,
    required this.scrollController,
  });

  final BehaviorIncident incident;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
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
          Text('Incident Details', style: textTheme.headlineSmall),
          const SizedBox(height: 24),
          _buildDetailRow('Date', DateFormat('MMMM d, y').format(incident.date)),
          _buildDetailRow('Time', incident.time),
          _buildDetailRow('Type', _formatType(incident.type)),
          _buildDetailRow('Severity', _formatSeverity(incident.severity)),
          if (incident.location != null)
            _buildDetailRow('Location', incident.location!),
          if (incident.duration != null)
            _buildDetailRow('Duration', '${incident.duration} minutes'),
          const Divider(height: 32),
          Text('Description', style: textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(incident.description),
          if (incident.antecedent != null) ...[
            const SizedBox(height: 16),
            Text('Antecedent', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(incident.antecedent!),
          ],
          if (incident.consequence != null) ...[
            const SizedBox(height: 16),
            Text('Consequence', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(incident.consequence!),
          ],
          if (incident.interventionsUsed.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Interventions Used', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            ...incident.interventionsUsed.map(
              (intervention) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    const Icon(Icons.check, size: 16),
                    const SizedBox(width: 8),
                    Text(intervention),
                  ],
                ),
              ),
            ),
          ],
          if (incident.witnesses.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Witnesses', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            ...incident.witnesses.map(
              (witness) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('• $witness'),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              if (incident.followUpRequired)
                const Chip(label: Text('Follow-up Required')),
              if (incident.parentNotified) ...[
                const SizedBox(width: 8),
                const Chip(label: Text('Parent Notified')),
              ],
              if (incident.adminNotified) ...[
                const SizedBox(width: 8),
                const Chip(label: Text('Admin Notified')),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  String _formatType(BehaviorType type) {
    return type.name[0].toUpperCase() + type.name.substring(1);
  }

  String _formatSeverity(BehaviorSeverity severity) {
    return severity.name[0].toUpperCase() + severity.name.substring(1);
  }
}

class _IncidentFormDialog extends ConsumerStatefulWidget {
  const _IncidentFormDialog({
    required this.studentId,
    required this.studentName,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<_IncidentFormDialog> createState() =>
      _IncidentFormDialogState();
}

class _IncidentFormDialogState extends ConsumerState<_IncidentFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late DateTime _selectedDate;
  late TimeOfDay _selectedTime;
  BehaviorType _type = BehaviorType.other;
  BehaviorSeverity _severity = BehaviorSeverity.low;
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _durationController = TextEditingController();
  final _antecedentController = TextEditingController();
  final _consequenceController = TextEditingController();
  bool _followUpRequired = false;
  bool _parentNotified = false;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    _selectedTime = TimeOfDay.now();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationController.dispose();
    _durationController.dispose();
    _antecedentController.dispose();
    _consequenceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Log Behavior Incident'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
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
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Time'),
                subtitle: Text(_selectedTime.format(context)),
                trailing: const Icon(Icons.access_time),
                onTap: _selectTime,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<BehaviorType>(
                value: _type,
                decoration: const InputDecoration(
                  labelText: 'Type',
                  border: OutlineInputBorder(),
                ),
                items: BehaviorType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(_formatType(type)),
                  );
                }).toList(),
                onChanged: (value) => setState(() => _type = value!),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<BehaviorSeverity>(
                value: _severity,
                decoration: const InputDecoration(
                  labelText: 'Severity',
                  border: OutlineInputBorder(),
                ),
                items: BehaviorSeverity.values.map((severity) {
                  return DropdownMenuItem(
                    value: severity,
                    child: Text(_formatSeverity(severity)),
                  );
                }).toList(),
                onChanged: (value) => setState(() => _severity = value!),
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
                    return 'Please enter a description';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Location',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _durationController,
                decoration: const InputDecoration(
                  labelText: 'Duration (minutes)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _antecedentController,
                decoration: const InputDecoration(
                  labelText: 'Antecedent (What happened before?)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _consequenceController,
                decoration: const InputDecoration(
                  labelText: 'Consequence (What happened after?)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _followUpRequired,
                onChanged: (value) =>
                    setState(() => _followUpRequired = value!),
                title: const Text('Follow-up Required'),
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _parentNotified,
                onChanged: (value) => setState(() => _parentNotified = value!),
                title: const Text('Parent Notified'),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saveIncident,
          child: const Text('Save'),
        ),
      ],
    );
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _saveIncident() async {
    if (!_formKey.currentState!.validate()) return;

    final incident = BehaviorIncident(
      studentId: widget.studentId,
      teacherId: 'teacher123', // TODO: Get from auth
      date: _selectedDate,
      time: _selectedTime.format(context),
      type: _type,
      severity: _severity,
      description: _descriptionController.text,
      location: _locationController.text.isNotEmpty
          ? _locationController.text
          : null,
      duration: _durationController.text.isNotEmpty
          ? int.tryParse(_durationController.text)
          : null,
      antecedent: _antecedentController.text.isNotEmpty
          ? _antecedentController.text
          : null,
      consequence: _consequenceController.text.isNotEmpty
          ? _consequenceController.text
          : null,
      followUpRequired: _followUpRequired,
      parentNotified: _parentNotified,
    );

    await ref
        .read(incidentCreationProvider.notifier)
        .createIncident(incident);

    if (mounted) {
      Navigator.of(context).pop();
      ref.invalidate(behaviorIncidentsProvider);
    }
  }

  String _formatType(BehaviorType type) {
    switch (type) {
      case BehaviorType.physical:
        return 'Physical';
      case BehaviorType.verbal:
        return 'Verbal';
      case BehaviorType.disruptive:
        return 'Disruptive';
      case BehaviorType.noncompliance:
        return 'Non-Compliance';
      case BehaviorType.offtask:
        return 'Off-Task';
      case BehaviorType.social:
        return 'Social';
      case BehaviorType.selfHarm:
        return 'Self-Harm';
      case BehaviorType.other:
        return 'Other';
    }
  }

  String _formatSeverity(BehaviorSeverity severity) {
    switch (severity) {
      case BehaviorSeverity.low:
        return 'Low';
      case BehaviorSeverity.medium:
        return 'Medium';
      case BehaviorSeverity.high:
        return 'High';
      case BehaviorSeverity.crisis:
        return 'Crisis';
    }
  }
}
