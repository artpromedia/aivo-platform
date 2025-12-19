/// Simplified Gesture Widget - ND-3.3
///
/// Provides simplified gesture alternatives for complex multi-touch gestures.
/// Converts pinch, rotate, multi-finger swipes to single-tap/button alternatives.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that provides button alternatives for zoom gestures
class SimplifiedZoom extends StatefulWidget {
  final Widget child;
  final double minScale;
  final double maxScale;
  final double initialScale;
  final void Function(double scale)? onScaleChanged;
  final double zoomStep;

  const SimplifiedZoom({
    super.key,
    required this.child,
    this.minScale = 0.5,
    this.maxScale = 3.0,
    this.initialScale = 1.0,
    this.onScaleChanged,
    this.zoomStep = 0.25,
  });

  @override
  State<SimplifiedZoom> createState() => _SimplifiedZoomState();
}

class _SimplifiedZoomState extends State<SimplifiedZoom> {
  late double _scale;

  @override
  void initState() {
    super.initState();
    _scale = widget.initialScale;
  }

  void _zoomIn() {
    setState(() {
      _scale = (_scale + widget.zoomStep).clamp(widget.minScale, widget.maxScale);
    });
    widget.onScaleChanged?.call(_scale);
    HapticFeedback.selectionClick();
  }

  void _zoomOut() {
    setState(() {
      _scale = (_scale - widget.zoomStep).clamp(widget.minScale, widget.maxScale);
    });
    widget.onScaleChanged?.call(_scale);
    HapticFeedback.selectionClick();
  }

  void _resetZoom() {
    setState(() {
      _scale = widget.initialScale;
    });
    widget.onScaleChanged?.call(_scale);
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final gestureSimplified = motorProfile.gesturesToButtons;
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonSize = 48.0 * multiplier;

        if (!gestureSimplified) {
          // Use standard pinch zoom
          return InteractiveViewer(
            minScale: widget.minScale,
            maxScale: widget.maxScale,
            onInteractionEnd: (details) {
              // Report scale would need ScaleUpdateDetails tracking
            },
            child: widget.child,
          );
        }

        return Stack(
          children: [
            // Scaled content
            Center(
              child: Transform.scale(
                scale: _scale,
                child: widget.child,
              ),
            ),

            // Zoom controls
            Positioned(
              right: 16,
              bottom: 16,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ZoomButton(
                    icon: Icons.add,
                    onPressed: _scale < widget.maxScale ? _zoomIn : null,
                    size: buttonSize,
                    tooltip: 'Zoom in',
                  ),
                  SizedBox(height: 8 * multiplier),
                  _ZoomButton(
                    icon: Icons.fit_screen,
                    onPressed: _resetZoom,
                    size: buttonSize,
                    tooltip: 'Reset zoom',
                  ),
                  SizedBox(height: 8 * multiplier),
                  _ZoomButton(
                    icon: Icons.remove,
                    onPressed: _scale > widget.minScale ? _zoomOut : null,
                    size: buttonSize,
                    tooltip: 'Zoom out',
                  ),
                ],
              ),
            ),

            // Zoom level indicator
            Positioned(
              right: 16,
              top: 16,
              child: Container(
                padding: EdgeInsets.symmetric(
                  horizontal: 12 * multiplier,
                  vertical: 6 * multiplier,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  '${(_scale * 100).round()}%',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12 * multiplier,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ZoomButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final String tooltip;

  const _ZoomButton({
    required this.icon,
    this.onPressed,
    required this.size,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white,
        elevation: 4,
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(
              icon,
              size: size * 0.5,
              color: onPressed != null ? Colors.black87 : Colors.grey,
            ),
          ),
        ),
      ),
    );
  }
}

/// Provides button alternatives for rotation gestures
class SimplifiedRotation extends StatefulWidget {
  final Widget child;
  final void Function(double angle)? onRotationChanged;
  final double rotationStep;

  const SimplifiedRotation({
    super.key,
    required this.child,
    this.onRotationChanged,
    this.rotationStep = 45.0, // degrees
  });

  @override
  State<SimplifiedRotation> createState() => _SimplifiedRotationState();
}

class _SimplifiedRotationState extends State<SimplifiedRotation> {
  double _rotation = 0;

  void _rotateLeft() {
    setState(() {
      _rotation -= widget.rotationStep;
    });
    widget.onRotationChanged?.call(_rotation);
    HapticFeedback.selectionClick();
  }

  void _rotateRight() {
    setState(() {
      _rotation += widget.rotationStep;
    });
    widget.onRotationChanged?.call(_rotation);
    HapticFeedback.selectionClick();
  }

  void _resetRotation() {
    setState(() {
      _rotation = 0;
    });
    widget.onRotationChanged?.call(_rotation);
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final gestureSimplified = motorProfile.gesturesToButtons;
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonSize = 48.0 * multiplier;

        if (!gestureSimplified) {
          // Standard widget without rotation controls
          return widget.child;
        }

        return Stack(
          children: [
            // Rotated content
            Center(
              child: Transform.rotate(
                angle: _rotation * (3.14159 / 180), // Convert to radians
                child: widget.child,
              ),
            ),

            // Rotation controls
            Positioned(
              left: 16,
              bottom: 16,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ZoomButton(
                    icon: Icons.rotate_left,
                    onPressed: _rotateLeft,
                    size: buttonSize,
                    tooltip: 'Rotate left',
                  ),
                  SizedBox(width: 8 * multiplier),
                  _ZoomButton(
                    icon: Icons.refresh,
                    onPressed: _resetRotation,
                    size: buttonSize,
                    tooltip: 'Reset rotation',
                  ),
                  SizedBox(width: 8 * multiplier),
                  _ZoomButton(
                    icon: Icons.rotate_right,
                    onPressed: _rotateRight,
                    size: buttonSize,
                    tooltip: 'Rotate right',
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Converts swipe gestures to arrow button navigation
class SimplifiedSwipeNavigation extends StatelessWidget {
  final VoidCallback? onSwipeLeft;
  final VoidCallback? onSwipeRight;
  final VoidCallback? onSwipeUp;
  final VoidCallback? onSwipeDown;
  final Widget child;
  final bool showAllDirections;

  const SimplifiedSwipeNavigation({
    super.key,
    this.onSwipeLeft,
    this.onSwipeRight,
    this.onSwipeUp,
    this.onSwipeDown,
    required this.child,
    this.showAllDirections = false,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final gestureSimplified = motorProfile.gesturesToButtons;
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonSize = 56.0 * multiplier;

        if (!gestureSimplified) {
          // Use standard swipe detection
          return GestureDetector(
            onHorizontalDragEnd: (details) {
              if (details.primaryVelocity == null) return;
              if (details.primaryVelocity! < 0) {
                onSwipeLeft?.call();
              } else {
                onSwipeRight?.call();
              }
            },
            onVerticalDragEnd: (details) {
              if (details.primaryVelocity == null) return;
              if (details.primaryVelocity! < 0) {
                onSwipeUp?.call();
              } else {
                onSwipeDown?.call();
              }
            },
            child: child,
          );
        }

        return Stack(
          children: [
            child,

            // Navigation arrows
            // Left
            if (onSwipeLeft != null || showAllDirections)
              Positioned(
                left: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _NavigationArrow(
                    icon: Icons.chevron_left,
                    onPressed: onSwipeLeft,
                    size: buttonSize,
                    tooltip: 'Previous',
                  ),
                ),
              ),

            // Right
            if (onSwipeRight != null || showAllDirections)
              Positioned(
                right: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _NavigationArrow(
                    icon: Icons.chevron_right,
                    onPressed: onSwipeRight,
                    size: buttonSize,
                    tooltip: 'Next',
                  ),
                ),
              ),

            // Up
            if (onSwipeUp != null || showAllDirections)
              Positioned(
                top: 8,
                left: 0,
                right: 0,
                child: Center(
                  child: _NavigationArrow(
                    icon: Icons.expand_less,
                    onPressed: onSwipeUp,
                    size: buttonSize,
                    tooltip: 'Up',
                  ),
                ),
              ),

            // Down
            if (onSwipeDown != null || showAllDirections)
              Positioned(
                bottom: 8,
                left: 0,
                right: 0,
                child: Center(
                  child: _NavigationArrow(
                    icon: Icons.expand_more,
                    onPressed: onSwipeDown,
                    size: buttonSize,
                    tooltip: 'Down',
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _NavigationArrow extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final String tooltip;

  const _NavigationArrow({
    required this.icon,
    this.onPressed,
    required this.size,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white.withOpacity(0.9),
        elevation: 2,
        borderRadius: BorderRadius.circular(size / 2),
        child: InkWell(
          onTap: () {
            onPressed?.call();
            HapticFeedback.selectionClick();
          },
          borderRadius: BorderRadius.circular(size / 2),
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(
              icon,
              size: size * 0.6,
              color: onPressed != null ? Colors.black87 : Colors.grey,
            ),
          ),
        ),
      ),
    );
  }
}

/// Converts multi-finger tap to single button
class SimplifiedMultiTap extends StatelessWidget {
  final Widget child;
  final VoidCallback? onDoubleTap;
  final VoidCallback? onTripleTap;
  final VoidCallback? onLongPress;
  final String? doubleTapLabel;
  final String? tripleTapLabel;
  final String? longPressLabel;

  const SimplifiedMultiTap({
    super.key,
    required this.child,
    this.onDoubleTap,
    this.onTripleTap,
    this.onLongPress,
    this.doubleTapLabel,
    this.tripleTapLabel,
    this.longPressLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final gestureSimplified = motorProfile.gesturesToButtons;
        final multiplier = motorProfile.touchTargetMultiplier;

        if (!gestureSimplified) {
          // Use standard gesture detection
          return GestureDetector(
            onDoubleTap: onDoubleTap,
            onLongPress: onLongPress,
            // Triple tap would need custom implementation
            child: child,
          );
        }

        // Show action buttons
        final actions = <Widget>[];

        if (onDoubleTap != null) {
          actions.add(_ActionChip(
            label: doubleTapLabel ?? 'Double tap',
            icon: Icons.touch_app,
            onTap: onDoubleTap!,
            multiplier: multiplier,
          ));
        }

        if (onTripleTap != null) {
          actions.add(_ActionChip(
            label: tripleTapLabel ?? 'Triple tap',
            icon: Icons.gesture,
            onTap: onTripleTap!,
            multiplier: multiplier,
          ));
        }

        if (onLongPress != null) {
          actions.add(_ActionChip(
            label: longPressLabel ?? 'Long press',
            icon: Icons.touch_app_outlined,
            onTap: onLongPress!,
            multiplier: multiplier,
          ));
        }

        if (actions.isEmpty) {
          return child;
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: child),
            SizedBox(height: 8 * multiplier),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: actions,
            ),
          ],
        );
      },
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final double multiplier;

  const _ActionChip({
    required this.label,
    required this.icon,
    required this.onTap,
    required this.multiplier,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.blue.shade50,
      borderRadius: BorderRadius.circular(20 * multiplier),
      child: InkWell(
        onTap: () {
          onTap();
          HapticFeedback.selectionClick();
        },
        borderRadius: BorderRadius.circular(20 * multiplier),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: 16 * multiplier,
            vertical: 12 * multiplier,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18 * multiplier, color: Colors.blue),
              SizedBox(width: 6 * multiplier),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14 * multiplier,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Simplified scroll with button controls
class SimplifiedScroll extends StatefulWidget {
  final Widget child;
  final Axis scrollDirection;
  final double scrollStep;

  const SimplifiedScroll({
    super.key,
    required this.child,
    this.scrollDirection = Axis.vertical,
    this.scrollStep = 100,
  });

  @override
  State<SimplifiedScroll> createState() => _SimplifiedScrollState();
}

class _SimplifiedScrollState extends State<SimplifiedScroll> {
  final ScrollController _controller = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _scrollUp() {
    _controller.animateTo(
      (_controller.offset - widget.scrollStep).clamp(
        0,
        _controller.position.maxScrollExtent,
      ),
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
    HapticFeedback.selectionClick();
  }

  void _scrollDown() {
    _controller.animateTo(
      (_controller.offset + widget.scrollStep).clamp(
        0,
        _controller.position.maxScrollExtent,
      ),
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final gestureSimplified = motorProfile.gesturesToButtons;
        final multiplier = motorProfile.touchTargetMultiplier;
        final buttonSize = 48.0 * multiplier;

        if (!gestureSimplified) {
          return SingleChildScrollView(
            controller: _controller,
            scrollDirection: widget.scrollDirection,
            child: widget.child,
          );
        }

        final isVertical = widget.scrollDirection == Axis.vertical;

        return Stack(
          children: [
            SingleChildScrollView(
              controller: _controller,
              scrollDirection: widget.scrollDirection,
              child: widget.child,
            ),

            // Scroll controls
            Positioned(
              right: isVertical ? 8 : null,
              bottom: isVertical ? null : 8,
              left: isVertical ? null : 0,
              top: isVertical ? 0 : null,
              child: isVertical
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _ZoomButton(
                          icon: Icons.keyboard_arrow_up,
                          onPressed: _scrollUp,
                          size: buttonSize,
                          tooltip: 'Scroll up',
                        ),
                        SizedBox(height: 8 * multiplier),
                        _ZoomButton(
                          icon: Icons.keyboard_arrow_down,
                          onPressed: _scrollDown,
                          size: buttonSize,
                          tooltip: 'Scroll down',
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _ZoomButton(
                          icon: Icons.keyboard_arrow_left,
                          onPressed: _scrollUp,
                          size: buttonSize,
                          tooltip: 'Scroll left',
                        ),
                        SizedBox(width: 8 * multiplier),
                        _ZoomButton(
                          icon: Icons.keyboard_arrow_right,
                          onPressed: _scrollDown,
                          size: buttonSize,
                          tooltip: 'Scroll right',
                        ),
                      ],
                    ),
            ),
          ],
        );
      },
    );
  }
}
