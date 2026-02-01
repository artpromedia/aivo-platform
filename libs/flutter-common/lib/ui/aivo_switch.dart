/// Aivo Switch Widget
///
/// Consistent switch/toggle styling across apps with grade-band awareness.
/// Aligned with web Switch component (libs/ui-web/src/components/ui/switch.tsx).
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// Switch animation configuration per grade band.
class _SwitchAnimationConfig {
  const _SwitchAnimationConfig({
    required this.duration,
    required this.curve,
  });

  final Duration duration;
  final Curve curve;

  /// Explorer (Pre-K–5): More playful animations
  static const explorer = _SwitchAnimationConfig(
    duration: Duration(milliseconds: 250),
    curve: Curves.easeOutBack,
  );

  /// Navigator (6-8): Moderate animations
  static const navigator = _SwitchAnimationConfig(
    duration: Duration(milliseconds: 200),
    curve: Curves.easeInOut,
  );

  /// Scholar (9-12): Subtle animations
  static const scholar = _SwitchAnimationConfig(
    duration: Duration(milliseconds: 150),
    curve: Curves.easeInOut,
  );

  static _SwitchAnimationConfig forGradeBand(AivoGradeBand? band) {
    return switch (band) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
      null => navigator,
    };
  }
}

/// Aivo styled switch with grade-band awareness.
///
/// Features:
/// - Track and thumb styling matching web
/// - Animation duration per grade band
/// - Disabled state styling
/// - Optional label positioning
/// - Focus ring support
///
/// Example:
/// ```dart
/// AivoSwitch(
///   value: isEnabled,
///   onChanged: (value) => setState(() => isEnabled = value),
///   label: 'Enable notifications',
///   gradeBand: AivoGradeBand.k5,
/// )
/// ```
class AivoSwitch extends StatefulWidget {
  const AivoSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.subtitle,
    this.gradeBand,
    this.enabled = true,
    this.labelPosition = AivoSwitchLabelPosition.end,
    this.size = AivoSwitchSize.md,
  });

  /// Current switch state
  final bool value;

  /// Callback when switch state changes
  final ValueChanged<bool>? onChanged;

  /// Optional label text
  final String? label;

  /// Optional subtitle/description text
  final String? subtitle;

  /// Grade band for styling and animations
  final AivoGradeBand? gradeBand;

  /// Whether the switch is enabled
  final bool enabled;

  /// Position of the label relative to the switch
  final AivoSwitchLabelPosition labelPosition;

  /// Size of the switch
  final AivoSwitchSize size;

  @override
  State<AivoSwitch> createState() => _AivoSwitchState();
}

/// Label position for switch
enum AivoSwitchLabelPosition {
  /// Label at the start (left in LTR)
  start,

  /// Label at the end (right in LTR)
  end,
}

/// Switch sizes
enum AivoSwitchSize {
  /// Small: 36x20
  sm,

  /// Medium (default): 44x24 - matches web h-6 w-11
  md,

  /// Large: 52x28
  lg,
}

class _AivoSwitchState extends State<AivoSwitch>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _thumbPosition;

  @override
  void initState() {
    super.initState();
    final config = _SwitchAnimationConfig.forGradeBand(widget.gradeBand);
    _animationController = AnimationController(
      vsync: this,
      duration: config.duration,
      value: widget.value ? 1.0 : 0.0,
    );
    _setupAnimations();
  }

  @override
  void didUpdateWidget(AivoSwitch oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.gradeBand != widget.gradeBand) {
      final config = _SwitchAnimationConfig.forGradeBand(widget.gradeBand);
      _animationController.duration = config.duration;
    }

    if (oldWidget.value != widget.value) {
      if (widget.value) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    }
  }

  void _setupAnimations() {
    final config = _SwitchAnimationConfig.forGradeBand(widget.gradeBand);
    _thumbPosition = CurvedAnimation(
      parent: _animationController,
      curve: config.curve,
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (!widget.enabled || widget.onChanged == null) return;
    widget.onChanged!(!widget.value);
  }

  /// Get switch dimensions for size
  (double width, double height, double thumbSize) _getDimensions() {
    return switch (widget.size) {
      AivoSwitchSize.sm => (36.0, 20.0, 16.0),
      AivoSwitchSize.md => (44.0, 24.0, 20.0),
      AivoSwitchSize.lg => (52.0, 28.0, 24.0),
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final (width, height, thumbSize) = _getDimensions();

    // Calculate padding to prevent thumb from touching edges
    final trackPadding = 2.0;
    final thumbTravel = width - thumbSize - (trackPadding * 2);

    Widget switchWidget = GestureDetector(
      onTap: _handleTap,
      child: AnimatedBuilder(
        animation: _thumbPosition,
        builder: (context, child) {
          final trackColor = widget.value
              ? colorScheme.primary
              : colorScheme.surfaceContainerHighest;

          return Semantics(
            toggled: widget.value,
            enabled: widget.enabled,
            child: Opacity(
              opacity: widget.enabled ? 1.0 : 0.5,
              child: Container(
                width: width,
                height: height,
                decoration: BoxDecoration(
                  color: trackColor,
                  borderRadius: BorderRadius.circular(height / 2),
                  border: widget.value
                      ? null
                      : Border.all(
                          color: colorScheme.outline,
                          width: 1,
                        ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      left: trackPadding +
                          (_thumbPosition.value * thumbTravel),
                      top: trackPadding,
                      child: Container(
                        width: thumbSize,
                        height: thumbSize,
                        decoration: BoxDecoration(
                          color: widget.value
                              ? Colors.white
                              : colorScheme.surface,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AivoBrand.navy[600]!.withValues(alpha: 0.16),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );

    // Add focus ring
    switchWidget = Focus(
      child: Builder(
        builder: (context) {
          final isFocused = Focus.of(context).hasFocus;
          if (!isFocused) return switchWidget;

          return Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(height / 2 + 4),
              border: Border.all(
                color: colorScheme.primary.withValues(alpha: 0.5),
                width: 2,
              ),
            ),
            padding: const EdgeInsets.all(2),
            child: switchWidget,
          );
        },
      ),
    );

    // If no label, return just the switch
    if (widget.label == null) {
      return switchWidget;
    }

    // Build label widget
    final labelWidget = Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.label!,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: widget.enabled
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
    );

    // Build row with label and switch
    return GestureDetector(
      onTap: _handleTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: widget.labelPosition == AivoSwitchLabelPosition.start
            ? [
                labelWidget,
                const SizedBox(width: 12),
                switchWidget,
              ]
            : [
                switchWidget,
                const SizedBox(width: 12),
                labelWidget,
              ],
      ),
    );
  }
}

/// A list tile variant with switch for settings screens.
class AivoSwitchTile extends StatelessWidget {
  const AivoSwitchTile({
    super.key,
    required this.value,
    required this.onChanged,
    required this.title,
    this.subtitle,
    this.leadingIcon,
    this.gradeBand,
    this.enabled = true,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String title;
  final String? subtitle;
  final IconData? leadingIcon;
  final AivoGradeBand? gradeBand;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return ListTile(
      enabled: enabled,
      leading: leadingIcon != null
          ? Icon(
              leadingIcon,
              color: enabled
                  ? colorScheme.onSurfaceVariant
                  : colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            )
          : null,
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
      trailing: AivoSwitch(
        value: value,
        onChanged: enabled ? onChanged : null,
        gradeBand: gradeBand,
        enabled: enabled,
      ),
      onTap: enabled && onChanged != null ? () => onChanged!(!value) : null,
    );
  }
}
