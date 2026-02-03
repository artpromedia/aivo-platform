/// Points Input Widget
///
/// A configurable point value input with presets and validation.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_common/theme/theme.dart';

/// Input widget for configuring question point values
class PointsInput extends StatefulWidget {
  const PointsInput({
    required this.value,
    required this.onChanged,
    this.min = 0.0,
    this.max = 100.0,
    this.step = 1.0,
    this.presets,
    this.label = 'Points',
    this.enabled = true,
    super.key,
  });

  final double value;
  final ValueChanged<double> onChanged;
  final double min;
  final double max;
  final double step;
  final List<double>? presets;
  final String label;
  final bool enabled;

  @override
  State<PointsInput> createState() => _PointsInputState();
}

class _PointsInputState extends State<PointsInput> {
  late TextEditingController _controller;
  late FocusNode _focusNode;

  static const defaultPresets = [1.0, 2.0, 5.0, 10.0, 20.0];

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: _formatValue(widget.value),
    );
    _focusNode = FocusNode()..addListener(_onFocusChange);
  }

  @override
  void didUpdateWidget(PointsInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && !_focusNode.hasFocus) {
      _controller.text = _formatValue(widget.value);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus) {
      _validateAndUpdate();
    }
  }

  String _formatValue(double value) {
    return value % 1 == 0 ? value.toStringAsFixed(0) : value.toStringAsFixed(1);
  }

  void _validateAndUpdate() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      _controller.text = _formatValue(widget.min);
      widget.onChanged(widget.min);
      return;
    }

    final parsed = double.tryParse(text);
    if (parsed == null) {
      _controller.text = _formatValue(widget.value);
      return;
    }

    final clamped = parsed.clamp(widget.min, widget.max);
    _controller.text = _formatValue(clamped);
    widget.onChanged(clamped);
  }

  void _increment() {
    final newValue = (widget.value + widget.step).clamp(widget.min, widget.max);
    _controller.text = _formatValue(newValue);
    widget.onChanged(newValue);
  }

  void _decrement() {
    final newValue = (widget.value - widget.step).clamp(widget.min, widget.max);
    _controller.text = _formatValue(newValue);
    widget.onChanged(newValue);
  }

  void _selectPreset(double value) {
    _controller.text = _formatValue(value);
    widget.onChanged(value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final presets = widget.presets ?? defaultPresets;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label
        if (widget.label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              widget.label,
              style: theme.textTheme.titleSmall,
            ),
          ),

        // Input row
        Row(
          children: [
            // Decrement button
            _StepButton(
              icon: Icons.remove,
              onPressed: widget.enabled && widget.value > widget.min
                  ? _decrement
                  : null,
              tooltip: 'Decrease points',
            ),

            // Text field
            Expanded(
              child: Semantics(
                label: '${widget.label} input field',
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  enabled: widget.enabled,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.center,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
                  ],
                  decoration: InputDecoration(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: const OutlineInputBorder(),
                    suffixText: 'pts',
                    suffixStyle: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  onSubmitted: (_) => _validateAndUpdate(),
                ),
              ),
            ),

            // Increment button
            _StepButton(
              icon: Icons.add,
              onPressed: widget.enabled && widget.value < widget.max
                  ? _increment
                  : null,
              tooltip: 'Increase points',
            ),
          ],
        ),

        // Preset chips
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: presets.map((preset) {
            final isSelected = widget.value == preset;
            return FilterChip(
              label: Text(_formatValue(preset)),
              selected: isSelected,
              onSelected: widget.enabled
                  ? (selected) {
                      if (selected) _selectPreset(preset);
                    }
                  : null,
              avatar: isSelected
                  ? const Icon(Icons.check, size: 16)
                  : const Icon(Icons.grade_outlined, size: 16),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.icon,
    required this.onPressed,
    required this.tooltip,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Tooltip(
      message: tooltip,
      child: Material(
        color: onPressed != null
            ? theme.colorScheme.primaryContainer
            : theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            child: Icon(
              icon,
              color: onPressed != null
                  ? theme.colorScheme.onPrimaryContainer
                  : theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact inline points input
class PointsInputCompact extends StatelessWidget {
  const PointsInputCompact({
    required this.value,
    required this.onChanged,
    this.enabled = true,
    super.key,
  });

  final double value;
  final ValueChanged<double> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.grade_outlined,
          size: 18,
          color: AivoBrand.mint[600],
        ),
        const SizedBox(width: 4),
        SizedBox(
          width: 50,
          child: TextField(
            enabled: enabled,
            controller: TextEditingController(
              text: value % 1 == 0
                  ? value.toStringAsFixed(0)
                  : value.toStringAsFixed(1),
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
            decoration: const InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              border: OutlineInputBorder(),
            ),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
            ],
            onSubmitted: (text) {
              final parsed = double.tryParse(text);
              if (parsed != null && parsed >= 0) {
                onChanged(parsed);
              }
            },
          ),
        ),
        const SizedBox(width: 4),
        Text(
          'pts',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
