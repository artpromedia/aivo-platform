import 'package:flutter/material.dart';

/// Utilities for managing focus in an accessible way
class AccessibilityFocus {
  /// Request focus on a specific node
  static void requestFocus(FocusNode node) {
    node.requestFocus();
  }

  /// Request focus and announce to screen reader
  static Future<void> requestFocusWithAnnouncement(
    FocusNode node,
    String announcement,
  ) async {
    node.requestFocus();
    // Small delay to ensure focus is set before announcement
    await Future.delayed(const Duration(milliseconds: 100));
    // Note: Announcement would go through AccessibilityAnnouncer
  }

  /// Clear focus from current node
  static void unfocus(BuildContext context) {
    FocusScope.of(context).unfocus();
  }

  /// Move focus to next focusable widget
  static bool nextFocus(BuildContext context) {
    return FocusScope.of(context).nextFocus();
  }

  /// Move focus to previous focusable widget
  static bool previousFocus(BuildContext context) {
    return FocusScope.of(context).previousFocus();
  }

  /// Check if a node currently has focus
  static bool hasFocus(FocusNode node) {
    return node.hasFocus;
  }

  /// Check if a node or any of its descendants has focus
  static bool hasPrimaryFocus(FocusNode node) {
    return node.hasPrimaryFocus;
  }
}

/// A widget that traps focus within its children (for modals/dialogs)
class FocusTrapArea extends StatefulWidget {
  final Widget child;
  final bool active;
  final bool autoFocus;

  const FocusTrapArea({
    super.key,
    required this.child,
    this.active = true,
    this.autoFocus = true,
  });

  @override
  State<FocusTrapArea> createState() => _FocusTrapAreaState();
}

class _FocusTrapAreaState extends State<FocusTrapArea> {
  late FocusScopeNode _focusScopeNode;

  @override
  void initState() {
    super.initState();
    _focusScopeNode = FocusScopeNode(debugLabel: 'FocusTrapArea');
  }

  @override
  void dispose() {
    _focusScopeNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FocusScope(
      node: _focusScopeNode,
      autofocus: widget.autoFocus && widget.active,
      canRequestFocus: widget.active,
      child: widget.child,
    );
  }
}

/// Widget that auto-focuses when mounted
class AutoFocusWidget extends StatefulWidget {
  final Widget child;
  final Duration delay;

  const AutoFocusWidget({
    super.key,
    required this.child,
    this.delay = Duration.zero,
  });

  @override
  State<AutoFocusWidget> createState() => _AutoFocusWidgetState();
}

class _AutoFocusWidgetState extends State<AutoFocusWidget> {
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.delay == Duration.zero) {
        _focusNode.requestFocus();
      } else {
        Future.delayed(widget.delay, () {
          if (mounted) {
            _focusNode.requestFocus();
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focusNode,
      child: widget.child,
    );
  }
}

/// Widget that restores focus when disposed
class FocusRestorer extends StatefulWidget {
  final Widget child;
  final FocusNode? restoreTo;

  const FocusRestorer({
    super.key,
    required this.child,
    this.restoreTo,
  });

  @override
  State<FocusRestorer> createState() => _FocusRestorerState();
}

class _FocusRestorerState extends State<FocusRestorer> {
  FocusNode? _previousFocus;

  @override
  void initState() {
    super.initState();
    _previousFocus = widget.restoreTo ?? FocusManager.instance.primaryFocus;
  }

  @override
  void dispose() {
    _previousFocus?.requestFocus();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Skip link widget for keyboard navigation
class SkipLink extends StatelessWidget {
  final String label;
  final VoidCallback onActivate;
  final bool visuallyHidden;

  const SkipLink({
    super.key,
    required this.label,
    required this.onActivate,
    this.visuallyHidden = true,
  });

  @override
  Widget build(BuildContext context) {
    return Focus(
      child: Builder(
        builder: (context) {
          final hasFocus = Focus.of(context).hasFocus;
          
          return Semantics(
            link: true,
            label: label,
            child: GestureDetector(
              onTap: onActivate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: hasFocus ? Theme.of(context).primaryColor : Colors.transparent,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: visuallyHidden && !hasFocus
                    ? const SizedBox.shrink()
                    : Text(
                        label,
                        style: TextStyle(
                          color: hasFocus ? Colors.white : Theme.of(context).primaryColor,
                          decoration: TextDecoration.underline,
                        ),
                      ),
              ),
            ),
          );
        },
      ),
    );
  }
}
