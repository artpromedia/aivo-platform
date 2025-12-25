import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Utility for making screen reader announcements
class AccessibilityAnnouncer {
  static final AccessibilityAnnouncer _instance = AccessibilityAnnouncer._();
  factory AccessibilityAnnouncer() => _instance;
  AccessibilityAnnouncer._();

  /// Announce a message to screen readers (polite)
  static Future<void> announce(String message) async {
    await SemanticsService.announce(message, TextDirection.ltr);
  }

  /// Announce with specific text direction
  static Future<void> announceWithDirection(
    String message,
    TextDirection direction,
  ) async {
    await SemanticsService.announce(message, direction);
  }

  /// Announce an error message (assertive)
  static Future<void> announceError(String message) async {
    // In Flutter, announcements are generally polite
    // Adding "Error:" prefix helps indicate severity
    await SemanticsService.announce('Error: $message', TextDirection.ltr);
  }

  /// Announce a success message
  static Future<void> announceSuccess(String message) async {
    await SemanticsService.announce('Success: $message', TextDirection.ltr);
  }

  /// Announce loading state
  static Future<void> announceLoading([String? message]) async {
    await SemanticsService.announce(
      message ?? 'Loading, please wait',
      TextDirection.ltr,
    );
  }

  /// Announce loading complete
  static Future<void> announceLoadingComplete([String? message]) async {
    await SemanticsService.announce(
      message ?? 'Loading complete',
      TextDirection.ltr,
    );
  }

  /// Announce navigation/route change
  static Future<void> announceRouteChange(String routeName) async {
    await SemanticsService.announce(
      'Navigated to $routeName',
      TextDirection.ltr,
    );
  }

  /// Announce progress update
  static Future<void> announceProgress(int percent, [String? label]) async {
    final message = label != null
        ? '$label: $percent percent complete'
        : '$percent percent complete';
    await SemanticsService.announce(message, TextDirection.ltr);
  }

  /// Announce list/collection info
  static Future<void> announceListInfo(int current, int total) async {
    await SemanticsService.announce(
      'Item $current of $total',
      TextDirection.ltr,
    );
  }

  /// Announce form validation result
  static Future<void> announceValidation({
    required bool isValid,
    String? errorMessage,
    int errorCount = 0,
  }) async {
    if (isValid) {
      await announceSuccess('Form is valid');
    } else if (errorMessage != null) {
      await announceError(errorMessage);
    } else if (errorCount > 0) {
      await announceError(
        '$errorCount validation ${errorCount == 1 ? 'error' : 'errors'} found',
      );
    }
  }
}

/// Widget that announces when it becomes visible
class AnnounceOnVisible extends StatefulWidget {
  final Widget child;
  final String message;
  final bool announceOnMount;

  const AnnounceOnVisible({
    super.key,
    required this.child,
    required this.message,
    this.announceOnMount = true,
  });

  @override
  State<AnnounceOnVisible> createState() => _AnnounceOnVisibleState();
}

class _AnnounceOnVisibleState extends State<AnnounceOnVisible> {
  @override
  void initState() {
    super.initState();
    if (widget.announceOnMount) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        AccessibilityAnnouncer.announce(widget.message);
      });
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Widget that announces value changes
class AnnounceOnChange<T> extends StatefulWidget {
  final Widget child;
  final T value;
  final String Function(T value) messageBuilder;
  final bool announceInitial;

  const AnnounceOnChange({
    super.key,
    required this.child,
    required this.value,
    required this.messageBuilder,
    this.announceInitial = false,
  });

  @override
  State<AnnounceOnChange<T>> createState() => _AnnounceOnChangeState<T>();
}

class _AnnounceOnChangeState<T> extends State<AnnounceOnChange<T>> {
  late T _previousValue;
  bool _isFirstBuild = true;

  @override
  void initState() {
    super.initState();
    _previousValue = widget.value;
    if (widget.announceInitial) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        AccessibilityAnnouncer.announce(widget.messageBuilder(widget.value));
      });
    }
  }

  @override
  void didUpdateWidget(AnnounceOnChange<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_isFirstBuild) {
      _isFirstBuild = false;
      return;
    }
    if (widget.value != _previousValue) {
      _previousValue = widget.value;
      AccessibilityAnnouncer.announce(widget.messageBuilder(widget.value));
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
