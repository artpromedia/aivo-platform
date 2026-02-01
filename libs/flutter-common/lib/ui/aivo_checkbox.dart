/// Aivo Checkbox Widget
///
/// Consistent checkbox styling across apps with grade-band awareness.
/// Aligned with web Checkbox component.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_theme.dart';

/// Checkbox state
enum AivoCheckboxState {
  /// Unchecked state
  unchecked,

  /// Checked state
  checked,

  /// Indeterminate state (partially checked)
  indeterminate,
}

/// Checkbox animation configuration per grade band.
class _CheckboxAnimationConfig {
  const _CheckboxAnimationConfig({
    required this.duration,
    required this.curve,
    required this.scale,
  });

  final Duration duration;
  final Curve curve;
  final double scale; // Scale effect on press

  /// Explorer (Pre-K–5): More playful animations
  static const explorer = _CheckboxAnimationConfig(
    duration: Duration(milliseconds: 200),
    curve: Curves.easeOutBack,
    scale: 0.9,
  );

  /// Navigator (6-8): Moderate animations
  static const navigator = _CheckboxAnimationConfig(
    duration: Duration(milliseconds: 150),
    curve: Curves.easeOut,
    scale: 0.95,
  );

  /// Scholar (9-12): Subtle animations
  static const scholar = _CheckboxAnimationConfig(
    duration: Duration(milliseconds: 100),
    curve: Curves.easeOut,
    scale: 0.98,
  );

  static _CheckboxAnimationConfig forGradeBand(AivoGradeBand? band) {
    return switch (band) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
      null => navigator,
    };
  }
}

/// Aivo styled checkbox with grade-band awareness.
///
/// Features:
/// - Rounded corners per grade band
/// - Check icon styling
/// - Indeterminate state support
/// - Label positioning and spacing
/// - Focus ring support
///
/// Example:
/// ```dart
/// AivoCheckbox(
///   value: isChecked,
///   onChanged: (value) => setState(() => isChecked = value),
///   label: 'I agree to terms',
///   gradeBand: AivoGradeBand.k5,
/// )
/// ```
class AivoCheckbox extends StatefulWidget {
  const AivoCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    this.tristate = false,
    this.label,
    this.subtitle,
    this.gradeBand,
    this.enabled = true,
    this.size = AivoCheckboxSize.md,
    this.error = false,
  });

  /// Current checkbox state (true, false, or null for indeterminate)
  final bool? value;

  /// Callback when checkbox state changes
  final ValueChanged<bool?>? onChanged;

  /// Whether to use tristate (checked, unchecked, indeterminate)
  final bool tristate;

  /// Optional label text
  final String? label;

  /// Optional subtitle/description text
  final String? subtitle;

  /// Grade band for styling and animations
  final AivoGradeBand? gradeBand;

  /// Whether the checkbox is enabled
  final bool enabled;

  /// Size of the checkbox
  final AivoCheckboxSize size;

  /// Whether the checkbox is in error state
  final bool error;

  @override
  State<AivoCheckbox> createState() => _AivoCheckboxState();
}

/// Checkbox sizes
enum AivoCheckboxSize {
  /// Small: 16x16
  sm,

  /// Medium (default): 20x20
  md,

  /// Large: 24x24
  lg,
}

class _AivoCheckboxState extends State<AivoCheckbox>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    final config = _CheckboxAnimationConfig.forGradeBand(widget.gradeBand);
    _animationController = AnimationController(
      vsync: this,
      duration: config.duration,
    );

    // Set initial state
    if (widget.value == true) {
      _animationController.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(AivoCheckbox oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.gradeBand != widget.gradeBand) {
      final config = _CheckboxAnimationConfig.forGradeBand(widget.gradeBand);
      _animationController.duration = config.duration;
    }

    if (oldWidget.value != widget.value) {
      if (widget.value == true) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (!widget.enabled || widget.onChanged == null) return;

    if (widget.tristate) {
      // Cycle through: unchecked -> checked -> indeterminate -> unchecked
      final newValue = switch (widget.value) {
        false => true,
        true => null,
        null => false,
      };
      widget.onChanged!(newValue);
    } else {
      widget.onChanged!(!(widget.value ?? false));
    }
  }

  void _handleTapDown(TapDownDetails details) {
    setState(() => _isPressed = true);
  }

  void _handleTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  /// Get checkbox dimensions for size
  double _getSize() {
    return switch (widget.size) {
      AivoCheckboxSize.sm => 16.0,
      AivoCheckboxSize.md => 20.0,
      AivoCheckboxSize.lg => 24.0,
    };
  }

  /// Get icon size for checkbox size
  double _getIconSize() {
    return switch (widget.size) {
      AivoCheckboxSize.sm => 12.0,
      AivoCheckboxSize.md => 16.0,
      AivoCheckboxSize.lg => 20.0,
    };
  }

  /// Get border radius for grade band
  double _getBorderRadius() {
    // Checkbox uses smaller radius than input
    return switch (widget.gradeBand) {
      AivoGradeBand.k5 => 6.0, // More rounded for young learners
      AivoGradeBand.g6_8 => 4.0,
      AivoGradeBand.g9_12 => 3.0,
      null => 4.0,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final size = _getSize();
    final iconSize = _getIconSize();
    final borderRadius = _getBorderRadius();
    final config = _CheckboxAnimationConfig.forGradeBand(widget.gradeBand);

    // Determine colors
    final isChecked = widget.value == true;
    final isIndeterminate = widget.value == null && widget.tristate;

    final backgroundColor = (isChecked || isIndeterminate)
        ? (widget.error ? colorScheme.error : colorScheme.primary)
        : colorScheme.surface;

    final borderColor = widget.error
        ? colorScheme.error
        : (isChecked || isIndeterminate)
            ? colorScheme.primary
            : colorScheme.outline;

    final checkColor = colorScheme.onPrimary;

    // Build checkbox
    Widget checkbox = GestureDetector(
      onTap: _handleTap,
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          final scale = _isPressed ? config.scale : 1.0;

          return Transform.scale(
            scale: scale,
            child: Semantics(
              checked: widget.value,
              enabled: widget.enabled,
              child: Opacity(
                opacity: widget.enabled ? 1.0 : 0.5,
                child: AnimatedContainer(
                  duration: config.duration,
                  width: size,
                  height: size,
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(borderRadius),
                    border: Border.all(
                      color: borderColor,
                      width: (isChecked || isIndeterminate) ? 0 : 1.5,
                    ),
                  ),
                  child: Center(
                    child: AnimatedOpacity(
                      opacity: (isChecked || isIndeterminate) ? 1.0 : 0.0,
                      duration: config.duration,
                      child: Icon(
                        isIndeterminate ? Icons.remove : Icons.check,
                        size: iconSize,
                        color: checkColor,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );

    // Add focus indicator
    checkbox = Focus(
      child: Builder(
        builder: (context) {
          final isFocused = Focus.of(context).hasFocus;
          if (!isFocused) return checkbox;

          return Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(borderRadius + 4),
              border: Border.all(
                color: colorScheme.primary.withValues(alpha: 0.5),
                width: 2,
              ),
            ),
            padding: const EdgeInsets.all(2),
            child: checkbox,
          );
        },
      ),
    );

    // If no label, return just the checkbox
    if (widget.label == null) {
      return checkbox;
    }

    // Build row with checkbox and label
    return GestureDetector(
      onTap: _handleTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: EdgeInsets.only(
              top: widget.subtitle != null ? 2 : 0,
            ),
            child: checkbox,
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.label!,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: widget.error
                        ? colorScheme.error
                        : widget.enabled
                            ? colorScheme.onSurface
                            : colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
                if (widget.subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    widget.subtitle!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A list tile variant with checkbox for settings/forms.
class AivoCheckboxTile extends StatelessWidget {
  const AivoCheckboxTile({
    super.key,
    required this.value,
    required this.onChanged,
    required this.title,
    this.subtitle,
    this.secondary,
    this.gradeBand,
    this.enabled = true,
    this.tristate = false,
    this.controlAffinity = ListTileControlAffinity.leading,
  });

  final bool? value;
  final ValueChanged<bool?>? onChanged;
  final String title;
  final String? subtitle;
  final Widget? secondary;
  final AivoGradeBand? gradeBand;
  final bool enabled;
  final bool tristate;
  final ListTileControlAffinity controlAffinity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final checkbox = AivoCheckbox(
      value: value,
      onChanged: enabled ? onChanged : null,
      tristate: tristate,
      gradeBand: gradeBand,
      enabled: enabled,
    );

    return ListTile(
      enabled: enabled,
      leading: controlAffinity == ListTileControlAffinity.leading
          ? checkbox
          : secondary,
      trailing: controlAffinity == ListTileControlAffinity.trailing
          ? checkbox
          : secondary,
      title: Text(
        title,
        style: theme.textTheme.bodyLarge?.copyWith(
          color: enabled
              ? colorScheme.onSurface
              : colorScheme.onSurface.withValues(alpha: 0.5),
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            )
          : null,
      onTap: enabled && onChanged != null
          ? () {
              if (tristate) {
                final newValue = switch (value) {
                  false => true,
                  true => null,
                  null => false,
                };
                onChanged!(newValue);
              } else {
                onChanged!(!(value ?? false));
              }
            }
          : null,
    );
  }
}

/// A group of checkboxes with optional "select all" functionality.
class AivoCheckboxGroup<T> extends StatelessWidget {
  const AivoCheckboxGroup({
    super.key,
    required this.items,
    required this.values,
    required this.onChanged,
    this.label,
    this.gradeBand,
    this.enabled = true,
    this.showSelectAll = false,
    this.selectAllLabel = 'Select all',
  });

  /// List of items with value and label
  final List<({T value, String label, String? subtitle})> items;

  /// Currently selected values
  final Set<T> values;

  /// Callback when selection changes
  final ValueChanged<Set<T>> onChanged;

  /// Optional group label
  final String? label;

  /// Grade band for styling
  final AivoGradeBand? gradeBand;

  /// Whether the group is enabled
  final bool enabled;

  /// Show select all checkbox
  final bool showSelectAll;

  /// Label for select all checkbox
  final String selectAllLabel;

  bool get _allSelected =>
      items.every((item) => values.contains(item.value));

  bool get _someSelected =>
      items.any((item) => values.contains(item.value)) && !_allSelected;

  void _handleSelectAll(bool? value) {
    if (value == true) {
      onChanged(items.map((item) => item.value).toSet());
    } else {
      onChanged({});
    }
  }

  void _handleItemChanged(T itemValue, bool? checked) {
    final newValues = Set<T>.from(values);
    if (checked == true) {
      newValues.add(itemValue);
    } else {
      newValues.remove(itemValue);
    }
    onChanged(newValues);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              label!,
              style: theme.textTheme.labelLarge?.copyWith(
                color: enabled
                    ? colorScheme.onSurface
                    : colorScheme.onSurface.withValues(alpha: 0.5),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
        if (showSelectAll) ...[
          AivoCheckbox(
            value: _allSelected ? true : (_someSelected ? null : false),
            onChanged: enabled ? _handleSelectAll : null,
            tristate: true,
            label: selectAllLabel,
            gradeBand: gradeBand,
            enabled: enabled,
          ),
          const SizedBox(height: 8),
          const Divider(),
          const SizedBox(height: 8),
        ],
        ...items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AivoCheckbox(
                value: values.contains(item.value),
                onChanged: enabled
                    ? (checked) => _handleItemChanged(item.value, checked)
                    : null,
                label: item.label,
                subtitle: item.subtitle,
                gradeBand: gradeBand,
                enabled: enabled,
              ),
            )),
      ],
    );
  }
}
