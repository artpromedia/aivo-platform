/// Focus Highlight Widget - ND-3.3
///
/// Provides enhanced visual focus indicators for navigation
/// to help learners track their current focus position.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that adds enhanced focus highlighting
class FocusHighlight extends StatefulWidget {
  final Widget child;

  /// Color of the focus highlight
  final Color? focusColor;

  /// Width of the focus border
  final double? borderWidth;

  /// Whether to show glow effect
  final bool showGlow;

  /// Animation duration
  final Duration animationDuration;

  const FocusHighlight({
    super.key,
    required this.child,
    this.focusColor,
    this.borderWidth,
    this.showGlow = true,
    this.animationDuration = const Duration(milliseconds: 200),
  });

  @override
  State<FocusHighlight> createState() => _FocusHighlightState();
}

class _FocusHighlightState extends State<FocusHighlight> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final highlightEnabled = motorProfile.highlightFocusedElement;
        final multiplier = motorProfile.touchTargetMultiplier;

        if (!highlightEnabled) {
          return widget.child;
        }

        final focusColor = widget.focusColor ?? Theme.of(context).primaryColor;
        final borderWidth = widget.borderWidth ?? (3.0 * multiplier);

        return Focus(
          onFocusChange: (hasFocus) {
            setState(() => _isFocused = hasFocus);
          },
          child: AnimatedContainer(
            duration: widget.animationDuration,
            decoration: _isFocused
                ? BoxDecoration(
                    borderRadius: BorderRadius.circular(8 * multiplier),
                    border: Border.all(
                      color: focusColor,
                      width: borderWidth,
                    ),
                    boxShadow: widget.showGlow
                        ? [
                            BoxShadow(
                              color: focusColor.withOpacity(0.4),
                              blurRadius: 12,
                              spreadRadius: 2,
                            ),
                          ]
                        : null,
                  )
                : null,
            child: widget.child,
          ),
        );
      },
    );
  }
}

/// A focusable container with enhanced highlighting
class FocusableHighlight extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onDoubleTap;
  final VoidCallback? onLongPress;
  final FocusNode? focusNode;
  final bool autofocus;
  final Color? focusColor;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;

  const FocusableHighlight({
    super.key,
    required this.child,
    this.onTap,
    this.onDoubleTap,
    this.onLongPress,
    this.focusNode,
    this.autofocus = false,
    this.focusColor,
    this.backgroundColor,
    this.borderRadius,
  });

  @override
  State<FocusableHighlight> createState() => _FocusableHighlightState();
}

class _FocusableHighlightState extends State<FocusableHighlight>
    with SingleTickerProviderStateMixin {
  late FocusNode _focusNode;
  late AnimationController _pulseController;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    _pulseController.dispose();
    super.dispose();
  }

  void _handleFocusChange(bool hasFocus) {
    setState(() => _isFocused = hasFocus);
    if (hasFocus) {
      _pulseController.repeat(reverse: true);
    } else {
      _pulseController.stop();
      _pulseController.reset();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final highlightEnabled = motorProfile.highlightFocusedElement;
        final multiplier = motorProfile.touchTargetMultiplier;
        final focusColor =
            widget.focusColor ?? Theme.of(context).primaryColor;
        final borderRadius =
            widget.borderRadius ?? BorderRadius.circular(8 * multiplier);

        return Focus(
          focusNode: _focusNode,
          autofocus: widget.autofocus,
          onFocusChange: _handleFocusChange,
          child: GestureDetector(
            onTap: () {
              _focusNode.requestFocus();
              widget.onTap?.call();
            },
            onDoubleTap: widget.onDoubleTap,
            onLongPress: widget.onLongPress,
            child: AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final pulseScale =
                    _isFocused ? 1.0 + (_pulseController.value * 0.02) : 1.0;

                return Transform.scale(
                  scale: highlightEnabled ? pulseScale : 1.0,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: widget.backgroundColor,
                      borderRadius: borderRadius,
                      border: _isFocused && highlightEnabled
                          ? Border.all(
                              color: focusColor,
                              width: 3 * multiplier,
                            )
                          : null,
                      boxShadow: _isFocused && highlightEnabled
                          ? [
                              BoxShadow(
                                color: focusColor.withOpacity(
                                  0.3 + (_pulseController.value * 0.2),
                                ),
                                blurRadius: 12 + (_pulseController.value * 4),
                                spreadRadius: 2,
                              ),
                            ]
                          : null,
                    ),
                    child: widget.child,
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}

/// Focus indicator that follows the currently focused element
class FocusTracker extends StatefulWidget {
  final Widget child;
  final Color? indicatorColor;
  final double indicatorWidth;

  const FocusTracker({
    super.key,
    required this.child,
    this.indicatorColor,
    this.indicatorWidth = 3,
  });

  @override
  State<FocusTracker> createState() => _FocusTrackerState();
}

class _FocusTrackerState extends State<FocusTracker>
    with SingleTickerProviderStateMixin {
  Rect? _focusRect;
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  // ignore: unused_element
  void _updateFocusRect(Rect? rect) {
    if (rect != _focusRect) {
      setState(() => _focusRect = rect);
      _animationController.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final highlightEnabled = motorProfile.highlightFocusedElement;
        final indicatorColor =
            widget.indicatorColor ?? Theme.of(context).primaryColor;

        if (!highlightEnabled) {
          return widget.child;
        }

        return Stack(
          children: [
            widget.child,

            // Focus indicator overlay
            if (_focusRect != null)
              AnimatedBuilder(
                animation: _animationController,
                builder: (context, _) {
                  return Positioned(
                    left: _focusRect!.left - widget.indicatorWidth,
                    top: _focusRect!.top - widget.indicatorWidth,
                    child: IgnorePointer(
                      child: Container(
                        width: _focusRect!.width + widget.indicatorWidth * 2,
                        height: _focusRect!.height + widget.indicatorWidth * 2,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: indicatorColor,
                            width: widget.indicatorWidth,
                          ),
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: indicatorColor.withOpacity(0.3),
                              blurRadius: 8,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
          ],
        );
      },
    );
  }
}

/// A row of focusable items with keyboard navigation
class FocusableRow extends StatefulWidget {
  final List<Widget> children;
  final int initialIndex;
  final void Function(int index)? onSelectionChanged;
  final double spacing;

  const FocusableRow({
    super.key,
    required this.children,
    this.initialIndex = 0,
    this.onSelectionChanged,
    this.spacing = 8,
  });

  @override
  State<FocusableRow> createState() => _FocusableRowState();
}

class _FocusableRowState extends State<FocusableRow> {
  // ignore: unused_field
  late int _currentIndex;
  late List<FocusNode> _focusNodes;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _focusNodes = List.generate(
      widget.children.length,
      (index) => FocusNode(),
    );
  }

  @override
  void dispose() {
    for (final node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _handleKeyEvent(KeyEvent event, int index) {
    if (event is! KeyDownEvent) return;

    int newIndex = index;

    if (event.logicalKey == LogicalKeyboardKey.arrowLeft ||
        event.logicalKey == LogicalKeyboardKey.arrowUp) {
      newIndex = (index - 1 + widget.children.length) % widget.children.length;
    } else if (event.logicalKey == LogicalKeyboardKey.arrowRight ||
        event.logicalKey == LogicalKeyboardKey.arrowDown) {
      newIndex = (index + 1) % widget.children.length;
    }

    if (newIndex != index) {
      _focusNodes[newIndex].requestFocus();
      setState(() => _currentIndex = newIndex);
      widget.onSelectionChanged?.call(newIndex);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(widget.children.length, (index) {
            final isLast = index == widget.children.length - 1;

            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Focus(
                  focusNode: _focusNodes[index],
                  onKeyEvent: (node, event) {
                    _handleKeyEvent(event, index);
                    return KeyEventResult.handled;
                  },
                  onFocusChange: (hasFocus) {
                    if (hasFocus) {
                      setState(() => _currentIndex = index);
                      widget.onSelectionChanged?.call(index);
                    }
                  },
                  child: FocusHighlight(
                    child: widget.children[index],
                  ),
                ),
                if (!isLast) SizedBox(width: widget.spacing * multiplier),
              ],
            );
          }),
        );
      },
    );
  }
}

/// Skip link for keyboard navigation
class SkipLink extends StatelessWidget {
  final String label;
  final VoidCallback onActivate;

  const SkipLink({
    super.key,
    required this.label,
    required this.onActivate,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final highlightEnabled = motorProfile.highlightFocusedElement;
        final multiplier = motorProfile.touchTargetMultiplier;

        if (!highlightEnabled) {
          return const SizedBox.shrink();
        }

        return Focus(
          child: Builder(
            builder: (context) {
              final hasFocus = Focus.of(context).hasFocus;

              if (!hasFocus) {
                return const SizedBox.shrink();
              }

              return Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  color: Theme.of(context).primaryColor,
                  padding: EdgeInsets.all(16 * multiplier),
                  child: GestureDetector(
                    onTap: onActivate,
                    child: Text(
                      label,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16 * multiplier,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
