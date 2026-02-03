/// Time Limit Picker Widget
///
/// A picker for selecting assessment time limits with common presets.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

/// Widget for picking a time limit for assessments
class TimeLimitPicker extends StatefulWidget {
  const TimeLimitPicker({
    required this.value,
    required this.onChanged,
    this.allowNoLimit = true,
    this.presets,
    this.maxMinutes = 180,
    this.enabled = true,
    super.key,
  });

  final int? value;
  final ValueChanged<int?> onChanged;
  final bool allowNoLimit;
  final List<int>? presets;
  final int maxMinutes;
  final bool enabled;

  /// Show as a bottom sheet dialog
  static Future<int?> show(
    BuildContext context, {
    int? currentValue,
    bool allowNoLimit = true,
  }) {
    return showModalBottomSheet<int?>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _TimeLimitPickerSheet(
        currentValue: currentValue,
        allowNoLimit: allowNoLimit,
      ),
    );
  }

  @override
  State<TimeLimitPicker> createState() => _TimeLimitPickerState();
}

class _TimeLimitPickerState extends State<TimeLimitPicker> {
  static const defaultPresets = [10, 15, 20, 30, 45, 60, 90, 120];

  late List<int> _presets;

  @override
  void initState() {
    super.initState();
    _presets = widget.presets ?? defaultPresets;
  }

  String _formatDuration(int? minutes) {
    if (minutes == null) return 'No limit';
    if (minutes < 60) return '$minutes min';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (mins == 0) return '$hours hr';
    return '$hours hr $mins min';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Icon(Icons.timer_outlined, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Text(
              'Time Limit',
              style: theme.textTheme.titleSmall,
            ),
            const Spacer(),
            if (widget.value != null)
              TextButton.icon(
                onPressed: widget.enabled && widget.allowNoLimit
                    ? () => widget.onChanged(null)
                    : null,
                icon: const Icon(Icons.timer_off_outlined, size: 18),
                label: const Text('Remove'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.red[400],
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),

        // Current value display
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: widget.value != null
                ? AivoBrand.primary.withOpacity(0.1)
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: widget.value != null
                  ? AivoBrand.primary.withOpacity(0.3)
                  : Colors.transparent,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                widget.value != null
                    ? Icons.timer
                    : Icons.all_inclusive,
                size: 28,
                color: widget.value != null
                    ? AivoBrand.primary
                    : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 12),
              Text(
                _formatDuration(widget.value),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: widget.value != null
                      ? AivoBrand.primary
                      : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Preset chips
        Text(
          'Quick Select',
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (widget.allowNoLimit)
              _PresetChip(
                label: 'No limit',
                icon: Icons.all_inclusive,
                isSelected: widget.value == null,
                onTap: widget.enabled ? () => widget.onChanged(null) : null,
              ),
            ..._presets.map((minutes) => _PresetChip(
                  label: _formatDuration(minutes),
                  isSelected: widget.value == minutes,
                  onTap: widget.enabled ? () => widget.onChanged(minutes) : null,
                )),
          ],
        ),

        // Custom input
        const SizedBox(height: 16),
        Text(
          'Custom Duration',
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        _CustomDurationInput(
          value: widget.value,
          maxMinutes: widget.maxMinutes,
          enabled: widget.enabled,
          onChanged: widget.onChanged,
        ),
      ],
    );
  }
}

class _PresetChip extends StatelessWidget {
  const _PresetChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool isSelected;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: isSelected
          ? theme.colorScheme.primary
          : theme.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 16,
                  color: isSelected
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: TextStyle(
                  color: isSelected
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onSurface,
                  fontWeight: isSelected ? FontWeight.w600 : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomDurationInput extends StatefulWidget {
  const _CustomDurationInput({
    required this.value,
    required this.maxMinutes,
    required this.enabled,
    required this.onChanged,
  });

  final int? value;
  final int maxMinutes;
  final bool enabled;
  final ValueChanged<int?> onChanged;

  @override
  State<_CustomDurationInput> createState() => _CustomDurationInputState();
}

class _CustomDurationInputState extends State<_CustomDurationInput> {
  late TextEditingController _hoursController;
  late TextEditingController _minutesController;

  @override
  void initState() {
    super.initState();
    final hours = widget.value != null ? widget.value! ~/ 60 : 0;
    final minutes = widget.value != null ? widget.value! % 60 : 0;
    _hoursController = TextEditingController(text: hours > 0 ? '$hours' : '');
    _minutesController =
        TextEditingController(text: minutes > 0 ? '$minutes' : '');
  }

  @override
  void didUpdateWidget(_CustomDurationInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      final hours = widget.value != null ? widget.value! ~/ 60 : 0;
      final minutes = widget.value != null ? widget.value! % 60 : 0;
      _hoursController.text = hours > 0 ? '$hours' : '';
      _minutesController.text = minutes > 0 ? '$minutes' : '';
    }
  }

  @override
  void dispose() {
    _hoursController.dispose();
    _minutesController.dispose();
    super.dispose();
  }

  void _updateValue() {
    final hours = int.tryParse(_hoursController.text) ?? 0;
    final minutes = int.tryParse(_minutesController.text) ?? 0;
    final total = (hours * 60) + minutes;

    if (total == 0) {
      widget.onChanged(null);
    } else {
      widget.onChanged(total.clamp(1, widget.maxMinutes));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        // Hours
        Expanded(
          child: TextField(
            controller: _hoursController,
            enabled: widget.enabled,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            decoration: const InputDecoration(
              labelText: 'Hours',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _updateValue(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            ':',
            style: theme.textTheme.headlineMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        // Minutes
        Expanded(
          child: TextField(
            controller: _minutesController,
            enabled: widget.enabled,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            decoration: const InputDecoration(
              labelText: 'Minutes',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => _updateValue(),
          ),
        ),
      ],
    );
  }
}

class _TimeLimitPickerSheet extends StatefulWidget {
  const _TimeLimitPickerSheet({
    required this.currentValue,
    required this.allowNoLimit,
  });

  final int? currentValue;
  final bool allowNoLimit;

  @override
  State<_TimeLimitPickerSheet> createState() => _TimeLimitPickerSheetState();
}

class _TimeLimitPickerSheetState extends State<_TimeLimitPickerSheet> {
  late int? _value;

  @override
  void initState() {
    super.initState();
    _value = widget.currentValue;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
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
                  Icon(Icons.timer, color: theme.colorScheme.primary),
                  const SizedBox(width: 12),
                  Text(
                    'Set Time Limit',
                    style: theme.textTheme.titleLarge,
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () => Navigator.pop(context, _value),
                    child: const Text('Apply'),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Content
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                child: TimeLimitPicker(
                  value: _value,
                  onChanged: (value) => setState(() => _value = value),
                  allowNoLimit: widget.allowNoLimit,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
