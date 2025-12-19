/// Touch Ripples Widget - ND-3.3
///
/// Provides enhanced visual feedback for touch interactions
/// to help learners confirm their touches were registered.

import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// Configuration for touch ripple appearance
class TouchRippleConfig {
  final Color color;
  final double maxRadius;
  final Duration duration;
  final bool showCenterDot;
  final double opacity;

  const TouchRippleConfig({
    this.color = Colors.blue,
    this.maxRadius = 80,
    this.duration = const Duration(milliseconds: 600),
    this.showCenterDot = true,
    this.opacity = 0.5,
  });

  TouchRippleConfig copyWith({
    Color? color,
    double? maxRadius,
    Duration? duration,
    bool? showCenterDot,
    double? opacity,
  }) {
    return TouchRippleConfig(
      color: color ?? this.color,
      maxRadius: maxRadius ?? this.maxRadius,
      duration: duration ?? this.duration,
      showCenterDot: showCenterDot ?? this.showCenterDot,
      opacity: opacity ?? this.opacity,
    );
  }
}

/// A single ripple effect
class _TouchRipple {
  final Offset position;
  final DateTime startTime;
  final String id;

  _TouchRipple({
    required this.position,
    required this.startTime,
  }) : id = '${position.dx}_${position.dy}_${startTime.millisecondsSinceEpoch}';
}

/// Widget that shows ripple effects on touch
class TouchRippleOverlay extends StatefulWidget {
  final Widget child;
  final TouchRippleConfig config;
  final bool enableHapticFeedback;

  const TouchRippleOverlay({
    super.key,
    required this.child,
    this.config = const TouchRippleConfig(),
    this.enableHapticFeedback = true,
  });

  @override
  State<TouchRippleOverlay> createState() => _TouchRippleOverlayState();
}

class _TouchRippleOverlayState extends State<TouchRippleOverlay>
    with TickerProviderStateMixin {
  final List<_TouchRipple> _ripples = [];
  final Map<String, AnimationController> _controllers = {};

  void _addRipple(Offset position) {
    final ripple = _TouchRipple(
      position: position,
      startTime: DateTime.now(),
    );

    final controller = AnimationController(
      vsync: this,
      duration: widget.config.duration,
    );

    controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _removeRipple(ripple.id);
      }
    });

    setState(() {
      _ripples.add(ripple);
      _controllers[ripple.id] = controller;
    });

    controller.forward();

    if (widget.enableHapticFeedback) {
      HapticFeedback.lightImpact();
    }
  }

  void _removeRipple(String id) {
    _controllers[id]?.dispose();
    setState(() {
      _ripples.removeWhere((r) => r.id == id);
      _controllers.remove(id);
    });
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final showRipples = motorProfile.showTouchRipples;

        if (!showRipples) {
          return widget.child;
        }

        final multiplier = motorProfile.touchTargetMultiplier;
        final scaledConfig = widget.config.copyWith(
          maxRadius: widget.config.maxRadius * multiplier,
        );

        return Listener(
          behavior: HitTestBehavior.translucent,
          onPointerDown: (event) => _addRipple(event.localPosition),
          child: Stack(
            children: [
              widget.child,
              
              // Ripple effects
              ...(_ripples.map((ripple) {
                final controller = _controllers[ripple.id];
                if (controller == null) return const SizedBox.shrink();

                return AnimatedBuilder(
                  animation: controller,
                  builder: (context, _) {
                    return Positioned(
                      left: ripple.position.dx - scaledConfig.maxRadius,
                      top: ripple.position.dy - scaledConfig.maxRadius,
                      child: IgnorePointer(
                        child: CustomPaint(
                          size: Size(
                            scaledConfig.maxRadius * 2,
                            scaledConfig.maxRadius * 2,
                          ),
                          painter: _RipplePainter(
                            progress: controller.value,
                            config: scaledConfig,
                          ),
                        ),
                      ),
                    );
                  },
                );
              })),
            ],
          ),
        );
      },
    );
  }
}

/// Custom painter for ripple effect
class _RipplePainter extends CustomPainter {
  final double progress;
  final TouchRippleConfig config;

  _RipplePainter({
    required this.progress,
    required this.config,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final currentRadius = config.maxRadius * progress;
    final opacity = config.opacity * (1 - progress);

    // Draw expanding circle
    final ripplePaint = Paint()
      ..color = config.color.withOpacity(opacity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    canvas.drawCircle(center, currentRadius, ripplePaint);

    // Draw fill with gradient opacity
    final fillPaint = Paint()
      ..color = config.color.withOpacity(opacity * 0.3)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, currentRadius, fillPaint);

    // Draw center dot
    if (config.showCenterDot && progress < 0.5) {
      final dotOpacity = (1 - progress * 2) * config.opacity;
      final dotPaint = Paint()
        ..color = config.color.withOpacity(dotOpacity)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(center, 5, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _RipplePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// A button with enhanced ripple effect
class RippleButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color? rippleColor;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;
  final EdgeInsets? padding;

  const RippleButton({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.rippleColor,
    this.backgroundColor,
    this.borderRadius,
    this.padding,
  });

  @override
  State<RippleButton> createState() => _RippleButtonState();
}

class _RippleButtonState extends State<RippleButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Offset? _tapPosition;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    setState(() {
      _tapPosition = details.localPosition;
      _isPressed = true;
    });
    _controller.forward(from: 0);
    HapticFeedback.lightImpact();
  }

  void _handleTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
    widget.onTap?.call();
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final showRipples = motorProfile.showTouchRipples;
        final multiplier = motorProfile.touchTargetMultiplier;
        
        final rippleColor =
            widget.rippleColor ?? Theme.of(context).primaryColor;
        final borderRadius = widget.borderRadius ?? 
            BorderRadius.circular(8 * multiplier);
        final padding = widget.padding ?? 
            EdgeInsets.all(16 * multiplier);

        return GestureDetector(
          onTapDown: _handleTapDown,
          onTapUp: _handleTapUp,
          onTapCancel: _handleTapCancel,
          onLongPress: widget.onLongPress,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Container(
                padding: padding,
                decoration: BoxDecoration(
                  color: widget.backgroundColor ?? Colors.transparent,
                  borderRadius: borderRadius,
                ),
                child: ClipRRect(
                  borderRadius: borderRadius,
                  child: CustomPaint(
                    painter: showRipples && _tapPosition != null
                        ? _ButtonRipplePainter(
                            tapPosition: _tapPosition!,
                            progress: _controller.value,
                            color: rippleColor,
                            isPressed: _isPressed,
                          )
                        : null,
                    child: child,
                  ),
                ),
              );
            },
            child: widget.child,
          ),
        );
      },
    );
  }
}

/// Custom painter for button ripple
class _ButtonRipplePainter extends CustomPainter {
  final Offset tapPosition;
  final double progress;
  final Color color;
  final bool isPressed;

  _ButtonRipplePainter({
    required this.tapPosition,
    required this.progress,
    required this.color,
    required this.isPressed,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Calculate max radius to cover entire button
    final maxDistance = math.sqrt(
      math.max(
        math.pow(tapPosition.dx, 2) + math.pow(tapPosition.dy, 2),
        math.pow(size.width - tapPosition.dx, 2) +
            math.pow(size.height - tapPosition.dy, 2),
      ),
    );

    final maxRadius = maxDistance * 1.2;
    final currentRadius = maxRadius * progress;
    final opacity = isPressed ? 0.3 : 0.2 * (1 - progress);

    final paint = Paint()
      ..color = color.withOpacity(opacity)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(tapPosition, currentRadius, paint);
  }

  @override
  bool shouldRepaint(covariant _ButtonRipplePainter oldDelegate) {
    return oldDelegate.progress != progress || 
           oldDelegate.isPressed != isPressed;
  }
}

/// Enhanced ink splash for Material widgets
class EnhancedInkSplash extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color? splashColor;
  final Color? highlightColor;
  final ShapeBorder? shape;

  const EnhancedInkSplash({
    super.key,
    required this.child,
    this.onTap,
    this.splashColor,
    this.highlightColor,
    this.shape,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final showRipples = motorProfile.showTouchRipples;
        final multiplier = motorProfile.touchTargetMultiplier;

        final splashColor = this.splashColor ?? 
            Theme.of(context).primaryColor.withOpacity(0.3);
        final highlightColor = this.highlightColor ?? 
            Theme.of(context).primaryColor.withOpacity(0.1);

        if (!showRipples) {
          return GestureDetector(
            onTap: onTap,
            child: child,
          );
        }

        return Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: () {
              HapticFeedback.lightImpact();
              onTap?.call();
            },
            splashColor: splashColor,
            highlightColor: highlightColor,
            splashFactory: InkSparkle.splashFactory,
            borderRadius: shape is RoundedRectangleBorder
                ? (shape as RoundedRectangleBorder).borderRadius 
                    as BorderRadius?
                : BorderRadius.circular(8 * multiplier),
            child: child,
          ),
        );
      },
    );
  }
}

/// Touch confirmation indicator that shows where user touched
class TouchConfirmation extends StatefulWidget {
  final Widget child;
  final Duration displayDuration;
  final double size;
  final Color? color;

  const TouchConfirmation({
    super.key,
    required this.child,
    this.displayDuration = const Duration(milliseconds: 400),
    this.size = 24,
    this.color,
  });

  @override
  State<TouchConfirmation> createState() => _TouchConfirmationState();
}

class _TouchConfirmationState extends State<TouchConfirmation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Offset? _touchPosition;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.displayDuration,
    );
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() => _touchPosition = null);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTouch(Offset position) {
    setState(() => _touchPosition = position);
    _controller.forward(from: 0);
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final showRipples = motorProfile.showTouchRipples;
        final multiplier = motorProfile.touchTargetMultiplier;
        final color = widget.color ?? Theme.of(context).primaryColor;
        final size = widget.size * multiplier;

        if (!showRipples) {
          return widget.child;
        }

        return Listener(
          behavior: HitTestBehavior.translucent,
          onPointerDown: (event) => _handleTouch(event.localPosition),
          child: Stack(
            children: [
              widget.child,
              
              if (_touchPosition != null)
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) {
                    final scale = 1.0 - (_controller.value * 0.3);
                    final opacity = 1.0 - _controller.value;

                    return Positioned(
                      left: _touchPosition!.dx - size / 2,
                      top: _touchPosition!.dy - size / 2,
                      child: IgnorePointer(
                        child: Transform.scale(
                          scale: scale,
                          child: Container(
                            width: size,
                            height: size,
                            decoration: BoxDecoration(
                              color: color.withOpacity(opacity * 0.5),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: color.withOpacity(opacity),
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}
