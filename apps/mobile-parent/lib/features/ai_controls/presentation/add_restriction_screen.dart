/// Add Restriction Screen
///
/// Screen for creating a new AI restriction.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/ai_autonomy_settings.dart';
import '../providers/ai_controls_provider.dart';

/// Screen for adding a new AI restriction.
class AddRestrictionScreen extends ConsumerStatefulWidget {
  const AddRestrictionScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<AddRestrictionScreen> createState() => _AddRestrictionScreenState();
}

class _AddRestrictionScreenState extends ConsumerState<AddRestrictionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();

  RestrictionType _selectedType = RestrictionType.time;
  bool _isActive = true;

  // Time restriction fields
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  final Set<String> _selectedDays = {};

  // Content restriction fields
  final _contentController = TextEditingController();

  // Feature restriction fields
  final Set<String> _selectedFeatures = {};

  // Subject restriction fields
  final Set<String> _selectedSubjects = {};

  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Restriction'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Name
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Restriction Name',
                hintText: 'e.g., No AI changes during homework time',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a name';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Describe what this restriction does',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a description';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Type selector
            Text(
              'Restriction Type',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: RestrictionType.values.map((type) {
                final isSelected = _selectedType == type;
                return ChoiceChip(
                  label: Text(_getTypeLabel(type)),
                  avatar: Icon(
                    _getTypeIcon(type),
                    size: 18,
                    color: isSelected ? Colors.white : _getTypeColor(type),
                  ),
                  selected: isSelected,
                  selectedColor: _getTypeColor(type),
                  onSelected: (_) => setState(() => _selectedType = type),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Type-specific options
            _buildTypeOptions(),
            const SizedBox(height: 24),

            // Active toggle
            Card(
              child: SwitchListTile(
                title: const Text('Active'),
                subtitle: const Text('Enable this restriction immediately'),
                value: _isActive,
                onChanged: (value) => setState(() => _isActive = value),
              ),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isSubmitting ? null : _submit,
        icon: _isSubmitting
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.add),
        label: Text(_isSubmitting ? 'Adding...' : 'Add Restriction'),
      ),
    );
  }

  Widget _buildTypeOptions() {
    switch (_selectedType) {
      case RestrictionType.time:
        return _buildTimeOptions();
      case RestrictionType.content:
        return _buildContentOptions();
      case RestrictionType.feature:
        return _buildFeatureOptions();
      case RestrictionType.subject:
        return _buildSubjectOptions();
    }
  }

  Widget _buildTimeOptions() {
    final theme = Theme.of(context);
    final days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Time Range',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _TimePickerField(
                label: 'Start Time',
                value: _startTime,
                onChanged: (time) => setState(() => _startTime = time),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _TimePickerField(
                label: 'End Time',
                value: _endTime,
                onChanged: (time) => setState(() => _endTime = time),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Days of Week',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: days.map((day) {
            final isSelected = _selectedDays.contains(day);
            return FilterChip(
              label: Text(day.substring(0, 3)),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedDays.add(day);
                  } else {
                    _selectedDays.remove(day);
                  }
                });
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            TextButton(
              onPressed: () => setState(() => _selectedDays.addAll(days)),
              child: const Text('Select All'),
            ),
            TextButton(
              onPressed: () => setState(() => _selectedDays.clear()),
              child: const Text('Clear'),
            ),
            TextButton(
              onPressed: () => setState(() {
                _selectedDays.clear();
                _selectedDays.addAll(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
              }),
              child: const Text('Weekdays'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildContentOptions() {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Blocked Content',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _contentController,
          decoration: const InputDecoration(
            labelText: 'Content Keywords',
            hintText: 'Enter keywords to block, separated by commas',
            border: OutlineInputBorder(),
            helperText: 'AI will not use content containing these keywords',
          ),
          maxLines: 3,
        ),
      ],
    );
  }

  Widget _buildFeatureOptions() {
    final theme = Theme.of(context);
    final features = [
      ('difficulty_changes', 'Difficulty Changes', 'Prevent AI from changing difficulty'),
      ('pace_adjustments', 'Pace Adjustments', 'Prevent AI from adjusting pace'),
      ('topic_switches', 'Topic Switches', 'Prevent AI from switching topics'),
      ('reward_modifications', 'Reward Modifications', 'Prevent AI from modifying rewards'),
      ('break_suggestions', 'Break Suggestions', 'Prevent AI from suggesting breaks'),
      ('style_changes', 'Communication Style', 'Prevent AI from changing communication style'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Disabled Features',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ...features.map((f) {
          final (id, name, desc) = f;
          return CheckboxListTile(
            title: Text(name),
            subtitle: Text(desc),
            value: _selectedFeatures.contains(id),
            onChanged: (selected) {
              setState(() {
                if (selected == true) {
                  _selectedFeatures.add(id);
                } else {
                  _selectedFeatures.remove(id);
                }
              });
            },
            controlAffinity: ListTileControlAffinity.leading,
          );
        }),
      ],
    );
  }

  Widget _buildSubjectOptions() {
    final theme = Theme.of(context);
    final subjects = [
      ('math', 'Mathematics', Icons.calculate),
      ('reading', 'Reading', Icons.menu_book),
      ('science', 'Science', Icons.science),
      ('writing', 'Writing', Icons.edit_note),
      ('social_studies', 'Social Studies', Icons.public),
      ('art', 'Art', Icons.palette),
      ('music', 'Music', Icons.music_note),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Restricted Subjects',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'AI autonomy will be limited for these subjects',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: subjects.map((s) {
            final (id, name, icon) = s;
            final isSelected = _selectedSubjects.contains(id);
            return FilterChip(
              label: Text(name),
              avatar: Icon(icon, size: 18),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedSubjects.add(id);
                  } else {
                    _selectedSubjects.remove(id);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final parameters = _buildParameters();

      final restriction = AIRestriction(
        id: '', // Server will assign
        type: _selectedType,
        name: _nameController.text,
        description: _descriptionController.text,
        isActive: _isActive,
        parameters: parameters,
        startTime: _startTime != null
            ? DateTime(2024, 1, 1, _startTime!.hour, _startTime!.minute)
            : null,
        endTime: _endTime != null
            ? DateTime(2024, 1, 1, _endTime!.hour, _endTime!.minute)
            : null,
        daysOfWeek: _selectedDays.isNotEmpty ? _selectedDays.toList() : null,
        createdAt: DateTime.now(),
      );

      await ref
          .read(restrictionsNotifierProvider(widget.childId).notifier)
          .add(restriction);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Restriction added'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add restriction: $e'),
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

  Map<String, dynamic> _buildParameters() {
    switch (_selectedType) {
      case RestrictionType.time:
        return {};
      case RestrictionType.content:
        return {
          'keywords': _contentController.text
              .split(',')
              .map((k) => k.trim())
              .where((k) => k.isNotEmpty)
              .toList(),
        };
      case RestrictionType.feature:
        return {
          'features': _selectedFeatures.toList(),
        };
      case RestrictionType.subject:
        return {
          'subjects': _selectedSubjects.toList(),
        };
    }
  }

  String _getTypeLabel(RestrictionType type) {
    switch (type) {
      case RestrictionType.time:
        return 'Time';
      case RestrictionType.content:
        return 'Content';
      case RestrictionType.feature:
        return 'Feature';
      case RestrictionType.subject:
        return 'Subject';
    }
  }

  IconData _getTypeIcon(RestrictionType type) {
    switch (type) {
      case RestrictionType.time:
        return Icons.schedule;
      case RestrictionType.content:
        return Icons.article;
      case RestrictionType.feature:
        return Icons.extension;
      case RestrictionType.subject:
        return Icons.school;
    }
  }

  Color _getTypeColor(RestrictionType type) {
    switch (type) {
      case RestrictionType.time:
        return Colors.blue;
      case RestrictionType.content:
        return Colors.orange;
      case RestrictionType.feature:
        return Colors.purple;
      case RestrictionType.subject:
        return Colors.teal;
    }
  }
}

/// Time picker field widget.
class _TimePickerField extends StatelessWidget {
  const _TimePickerField({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final TimeOfDay? value;
  final ValueChanged<TimeOfDay> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () async {
        final time = await showTimePicker(
          context: context,
          initialTime: value ?? TimeOfDay.now(),
        );
        if (time != null) {
          onChanged(time);
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              Icons.access_time,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    value != null ? value!.format(context) : 'Select time',
                    style: theme.textTheme.bodyMedium,
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
