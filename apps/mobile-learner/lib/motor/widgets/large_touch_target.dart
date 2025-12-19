/// Large Touch Target Widget - ND-3.3
///
/// Adapts touch target size based on motor accommodations.
/// Provides hold-to-activate and enhanced feedback options.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that adapts touch target size based on motor accommodations
class LargeTouchTarget extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double? minWidth;
  final double? minHeight;
  final EdgeInsets? padding;
  final BorderRadius? borderRadius;

  const LargeTouchTarget({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.minWidth,
    this.minHeight,
    this.padding,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final holdDuration = motorProfile.touchHoldDuration;
        final enhancedFeedback = motorProfile.enhancedTouchFeedback;
        final hapticIntensity = motorProfile.hapticFeedbackIntensity;

        // Calculate minimum sizes with multiplier
        final effectiveMinWidth = (minWidth ?? 48) * multiplier;
        final effectiveMinHeight = (minHeight ?? 48) * multiplier;
        final effectivePadding =
            padding ?? EdgeInsets.all((8 * multiplier).toDouble());

        return _AccommodatedTouchTarget(
          onTap: onTap,
          onLongPress: onLongPress,
          minWidth: effectiveMinWidth,
          minHeight: effectiveMinHeight,
          padding: effectivePadding,
          borderRadius: borderRadius ?? BorderRadius.circular(8),
          holdDuration: holdDuration,
          enhancedFeedback: enhancedFeedback,
          hapticIntensity: hapticIntensity,
          child: child,
        );
      },
    );
  }

  /// Create with explicit size (ignores multiplier)
  static Widget fixed({
    required Widget child,
    required double width,
    required double height,
    VoidCallback? onTap,
    VoidCallback? onLongPress,
    EdgeInsets? padding,
    BorderRadius? borderRadius,
  }) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        return _AccommodatedTouchTarget(
          onTap: onTap,
          onLongPress: onLongPress,
          minWidth: width,
          minHeight: height,
          padding: padding ?? const EdgeInsets.all(8),
          borderRadius: borderRadius ?? BorderRadius.circular(8),
          holdDuration: motorProfile.touchHoldDuration,
          enhancedFeedback: motorProfile.enhancedTouchFeedback,
          hapticIntensity: motorProfile.hapticFeedbackIntensity,
          child: child,
        );
      },
    );
  }
}

class _AccommodatedTouchTarget extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double minWidth;
  final double minHeight;
  final EdgeInsets padding;
  final BorderRadius borderRadius;
  final int holdDuration;
  final bool enhancedFeedback;
  final String hapticIntensity;

  const _AccommodatedTouchTarget({
    required this.child,
    this.onTap,
    this.onLongPress,
    required this.minWidth,
    required this.minHeight,
    required this.padding,
    required this.borderRadius,
    required this.holdDuration,
    required this.enhancedFeedback,
    required this.hapticIntensity,
  });

  @override
  State<_AccommodatedTouchTarget> createState() =>
      _AccommodatedTouchTargetState();
}

class _AccommodatedTouchTargetState extends State<_AccommodatedTouchTarget>
    with SingleTickerProviderStateMixin {
  bool _isPressed = false;
  bool _holdComplete = false;
  late AnimationController _holdProgressController;
  Timer? _holdTimer;

  @override
  void initState() {
    super.initState();
    _holdProgressController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: widget.holdDuration),
    );

    _holdProgressController.addStatusListener((status) {
      if (status == AnimationStatus.completed && !_holdComplete) {
        _holdComplete = true;
        _triggerAction();
      }
    });
  }

  @override
  void didUpdateWidget(_AccommodatedTouchTarget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.holdDuration != widget.holdDuration) {
      _holdProgressController.duration =
          Duration(milliseconds: widget.holdDuration);
    }
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _holdProgressController.dispose();
    super.dispose();
  }

  void _onPointerDown(PointerDownEvent event) {
    setState(() => _isPressed = true);

    if (widget.holdDuration > 0) {
      // Start hold timer
      _holdProgressController.forward(from: 0);
    }

    if (widget.enhancedFeedback) {
      _triggerHaptic('light');
    }
  }

  void _onPointerUp(PointerUpEvent event) {
    final wasPressed = _isPressed;
    
    setState(() {
      _isPressed = false;
      _holdComplete = false;
    });

    _holdProgressController.stop();
    _holdProgressController.reset();

    // If no hold duration required, trigger immediately on release
    if (widget.holdDuration == 0 && wasPressed) {
      _triggerAction();
    }
  }

  void _onPointerCancel(PointerCancelEvent event) {
    setState(() {
      _isPressed = false;
      _holdComplete = false;
    });
    _holdProgressController.stop();
    _holdProgressController.reset();
  }

  void _triggerAction() {
    if (widget.onTap != null) {
      _triggerHaptic(widget.hapticIntensity);
      widget.onTap!();
    }
  }

  void _triggerHaptic(String intensity) {
    switch (intensity) {
      case 'none':
        break;
      case 'light':
        HapticFeedback.lightImpact();
        break;
      case 'strong':
        HapticFeedback.heavyImpact();
        break;
      default:
        HapticFeedback.mediumImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: _onPointerDown,
      onPointerUp: _onPointerUp,
      onPointerCancel: _onPointerCancel,
      child: GestureDetector(
        onLongPress: widget.onLongPress,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: widget.minWidth,
            minHeight: widget.minHeight,
          ),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 100),
            padding: widget.padding,
            decoration: BoxDecoration(
              borderRadius: widget.borderRadius,
              color: _isPressed
                  ? Theme.of(context).primaryColor.withOpacity(0.1)
                  : Colors.transparent,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                widget.child,

                // Hold progress indicator
                if (widget.holdDuration > 0 && _isPressed && !_holdComplete)
                  Positioned.fill(
                    child: AnimatedBuilder(
                      animation: _holdProgressController,
                      builder: (context, child) {
                        return CustomPaint(
                          painter: _HoldProgressPainter(
                            progress: _holdProgressController.value,
                            color: Theme.of(context).primaryColor,
                            borderRadius: widget.borderRadius,
                          ),
                        );
                      },
                    ),
                  ),

                // Enhanced touch feedback border
                if (widget.enhancedFeedback && _isPressed)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: widget.borderRadius,
                        border: Border.all(
                          color: Theme.of(context).primaryColor,
                          width: 3,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HoldProgressPainter extends CustomPainter {
  final double progress;
  final Color color;
  final BorderRadius borderRadius;

  _HoldProgressPainter({
    required this.progress,
    required this.color,
    required this.borderRadius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromLTWH(4, 4, size.width - 8, size.height - 8);
    final rrect = RRect.fromRectAndCorners(
      rect,
      topLeft: borderRadius.topLeft,
      topRight: borderRadius.topRight,
      bottomLeft: borderRadius.bottomLeft,
      bottomRight: borderRadius.bottomRight,
    );

    // Draw progress around the border
    final path = Path()..addRRect(rrect);
    final pathMetrics = path.computeMetrics().first;
    final extractPath = pathMetrics.extractPath(
      0,
      pathMetrics.length * progress,
    );

    canvas.drawPath(extractPath, paint);
  }

  @override
  bool shouldRepaint(covariant _HoldProgressPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

/// Convenience wrapper for icon buttons with motor accommodations
class LargeTouchIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final double? iconSize;
  final Color? iconColor;
  final Color? backgroundColor;
  final String? tooltip;

  const LargeTouchIconButton({
    super.key,
    required this.icon,
    this.onTap,
    this.iconSize,
    this.iconColor,
    this.backgroundColor,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final effectiveIconSize = (iconSize ?? 24) * multiplier;

        Widget button = LargeTouchTarget(
          onTap: onTap,
          borderRadius: BorderRadius.circular(100),
          child: Container(
            decoration: BoxDecoration(
              color: backgroundColor ?? Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: effectiveIconSize,
              color: iconColor,
            ),
          ),
        );

        if (tooltip != null) {
          button = Tooltip(
            message: tooltip!,
            child: button,
          );
        }

        return button;
      },
    );
  }
}
