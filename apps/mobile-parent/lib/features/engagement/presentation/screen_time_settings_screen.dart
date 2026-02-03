/// Screen Time Settings Screen
///
/// Screen for configuring screen time limits and schedules.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/engagement_models.dart';
import '../providers/engagement_provider.dart';
import '../widgets/widgets.dart';

/// Screen for managing screen time settings.
class ScreenTimeSettingsScreen extends ConsumerWidget {
  const ScreenTimeSettingsScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(screenTimeSettingsNotifierProvider(childId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Screen Time Settings'),
      ),
      body: settingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (settings) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Current status card
            ScreenTimeStatusCard(childId: childId),
            const SizedBox(height: 16),

            // Enable/disable toggle
            Card(
              child: SwitchListTile(
                title: const Text('Enable Screen Time Limits'),
                subtitle: const Text('Control daily learning time limits'),
                value: settings.isEnabled,
                onChanged: (value) {
                  ref
                      .read(screenTimeSettingsNotifierProvider(childId).notifier)
                      .toggleEnabled(value);
                },
              ),
            ),
            const SizedBox(height: 16),

            if (settings.isEnabled) ...[
              // Daily limit
              _LimitCard(
                title: 'Daily Limit',
                subtitle: 'Maximum learning time per day',
                icon: Icons.today,
                value: settings.dailyLimitMinutes,
                unit: 'minutes',
                minValue: 30,
                maxValue: 300,
                step: 15,
                onChanged: (value) {
                  ref
                      .read(screenTimeSettingsNotifierProvider(childId).notifier)
                      .updateDailyLimit(value);
                },
              ),
              const SizedBox(height: 12),

              // Session limit
              _LimitCard(
                title: 'Session Limit',
                subtitle: 'Maximum time before a break',
                icon: Icons.timer,
                value: settings.sessionLimitMinutes,
                unit: 'minutes',
                minValue: 15,
                maxValue: 60,
                step: 5,
                onChanged: (value) {
                  ref
                      .read(screenTimeSettingsNotifierProvider(childId).notifier)
                      .updateSessionLimit(value);
                },
              ),
              const SizedBox(height: 16),

              // Break settings
              Card(
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Enforce Breaks'),
                      subtitle: Text(
                        'Require ${settings.breakDurationMinutes} min breaks between sessions',
                      ),
                      value: settings.enforceBreaks,
                      onChanged: (value) {
                        ref
                            .read(screenTimeSettingsNotifierProvider(childId).notifier)
                            .toggleBreakEnforcement(value);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Schedules
              Text(
                'Learning Schedules',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Set when learning is allowed',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
              const SizedBox(height: 12),
              ...settings.schedules.map((schedule) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _ScheduleCard(
                      schedule: schedule,
                      onEdit: () =>
                          _showScheduleEditor(context, ref, schedule),
                      onDelete: () {
                        ref
                            .read(screenTimeSettingsNotifierProvider(childId).notifier)
                            .deleteSchedule(schedule.id);
                      },
                      onToggle: (active) {
                        final updated = schedule.copyWith(isActive: active);
                        ref
                            .read(screenTimeSettingsNotifierProvider(childId).notifier)
                            .updateSchedule(updated);
                      },
                    ),
                  )),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _showScheduleEditor(context, ref, null),
                icon: const Icon(Icons.add),
                label: const Text('Add Schedule'),
              ),
              const SizedBox(height: 16),

              // Notification settings
              Text(
                'Notifications',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Limit Warning'),
                      subtitle: Text(
                        'Notify ${settings.warningMinutesBefore} min before limit',
                      ),
                      value: settings.notifyOnLimitReached,
                      onChanged: (value) {
                        final updated =
                            settings.copyWith(notifyOnLimitReached: value);
                        ref
                            .read(screenTimeSettingsNotifierProvider(childId).notifier)
                            .updateSettings(updated);
                      },
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Break Reminders'),
                      subtitle: const Text('Notify when it\'s time for a break'),
                      value: settings.notifyOnBreakTime,
                      onChanged: (value) {
                        final updated =
                            settings.copyWith(notifyOnBreakTime: value);
                        ref
                            .read(screenTimeSettingsNotifierProvider(childId).notifier)
                            .updateSettings(updated);
                      },
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  void _showScheduleEditor(
    BuildContext context,
    WidgetRef ref,
    ScreenTimeSchedule? existing,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _ScheduleEditorSheet(
        childId: childId,
        existing: existing,
      ),
    );
  }
}

/// Card for adjusting a limit value.
class _LimitCard extends StatelessWidget {
  const _LimitCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.unit,
    required this.minValue,
    required this.maxValue,
    required this.step,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final int value;
  final String unit;
  final int minValue;
  final int maxValue;
  final int step;
  final ValueChanged<int> onChanged;

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
                Icon(icon, color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$value $unit',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline),
                  onPressed: value > minValue
                      ? () => onChanged((value - step).clamp(minValue, maxValue))
                      : null,
                ),
                Expanded(
                  child: Slider(
                    value: value.toDouble(),
                    min: minValue.toDouble(),
                    max: maxValue.toDouble(),
                    divisions: (maxValue - minValue) ~/ step,
                    onChanged: (v) => onChanged(v.round()),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline),
                  onPressed: value < maxValue
                      ? () => onChanged((value + step).clamp(minValue, maxValue))
                      : null,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Card showing a schedule.
class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({
    required this.schedule,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
  });

  final ScreenTimeSchedule schedule;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final ValueChanged<bool> onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Switch(
              value: schedule.isActive,
              onChanged: onToggle,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    schedule.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: schedule.isActive ? null : theme.colorScheme.outline,
                    ),
                  ),
                  Text(
                    '${schedule.startTime} - ${schedule.endTime}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    children: schedule.daysOfWeek.map((day) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer
                              .withValues(alpha: schedule.isActive ? 1.0 : 0.5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          day.substring(0, 3),
                          style: theme.textTheme.labelSmall,
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: onEdit,
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _confirmDelete(context),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Schedule?'),
        content: Text('Remove "${schedule.name}"?'),
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
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet for editing schedules.
class _ScheduleEditorSheet extends ConsumerStatefulWidget {
  const _ScheduleEditorSheet({
    required this.childId,
    this.existing,
  });

  final String childId;
  final ScreenTimeSchedule? existing;

  @override
  ConsumerState<_ScheduleEditorSheet> createState() => _ScheduleEditorSheetState();
}

class _ScheduleEditorSheetState extends ConsumerState<_ScheduleEditorSheet> {
  final _nameController = TextEditingController();
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 20, minute: 0);
  final Set<String> _selectedDays = {};
  bool _isActive = true;
  bool _isSubmitting = false;

  final _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  @override
  void initState() {
    super.initState();
    if (widget.existing != null) {
      _nameController.text = widget.existing!.name;
      _startTime = _parseTime(widget.existing!.startTime);
      _endTime = _parseTime(widget.existing!.endTime);
      _selectedDays.addAll(widget.existing!.daysOfWeek);
      _isActive = widget.existing!.isActive;
    }
  }

  TimeOfDay _parseTime(String time) {
    final parts = time.split(':');
    return TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );
  }

  String _formatTime(TimeOfDay time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEditing = widget.existing != null;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
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
                isEditing ? 'Edit Schedule' : 'New Schedule',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),

              // Name
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Schedule Name',
                  border: OutlineInputBorder(),
                  hintText: 'e.g., Weekday Learning',
                ),
              ),
              const SizedBox(height: 16),

              // Time range
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
                    child: _TimePickerTile(
                      label: 'Start',
                      time: _startTime,
                      onTap: () => _pickTime(true),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _TimePickerTile(
                      label: 'End',
                      time: _endTime,
                      onTap: () => _pickTime(false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Days
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
                children: _days.map((day) {
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
                    onPressed: () => setState(() => _selectedDays.addAll(_days)),
                    child: const Text('All'),
                  ),
                  TextButton(
                    onPressed: () => setState(() {
                      _selectedDays.clear();
                      _selectedDays.addAll(_days.sublist(0, 5));
                    }),
                    child: const Text('Weekdays'),
                  ),
                  TextButton(
                    onPressed: () => setState(() {
                      _selectedDays.clear();
                      _selectedDays.addAll(_days.sublist(5));
                    }),
                    child: const Text('Weekend'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Active toggle
              Card(
                child: SwitchListTile(
                  title: const Text('Active'),
                  subtitle: const Text('Enable this schedule'),
                  value: _isActive,
                  onChanged: (value) => setState(() => _isActive = value),
                ),
              ),
              const SizedBox(height: 24),

              // Save button
              FilledButton.icon(
                onPressed: _isSubmitting ? null : _save,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save),
                label: Text(_isSubmitting ? 'Saving...' : 'Save Schedule'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _pickTime(bool isStart) async {
    final time = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );
    if (time != null) {
      setState(() {
        if (isStart) {
          _startTime = time;
        } else {
          _endTime = time;
        }
      });
    }
  }

  Future<void> _save() async {
    if (_nameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a name')),
      );
      return;
    }
    if (_selectedDays.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one day')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final schedule = ScreenTimeSchedule(
        id: widget.existing?.id ?? '',
        name: _nameController.text,
        startTime: _formatTime(_startTime),
        endTime: _formatTime(_endTime),
        daysOfWeek: _selectedDays.toList(),
        isActive: _isActive,
      );

      if (widget.existing != null) {
        await ref
            .read(screenTimeSettingsNotifierProvider(widget.childId).notifier)
            .updateSchedule(schedule);
      } else {
        await ref
            .read(screenTimeSettingsNotifierProvider(widget.childId).notifier)
            .addSchedule(schedule);
      }

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.existing != null
                ? 'Schedule updated'
                : 'Schedule created'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
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

/// Time picker tile.
class _TimePickerTile extends StatelessWidget {
  const _TimePickerTile({
    required this.label,
    required this.time,
    required this.onTap,
  });

  final String label;
  final TimeOfDay time;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.access_time, size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  time.format(context),
                  style: theme.textTheme.titleMedium,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
