/// Accessibility Announcements - HIGH-010
///
/// Provides utilities for making screen reader announcements
/// for dynamic content changes that wouldn't otherwise be announced.
///
/// Usage:
/// ```dart
/// // Import the announcer
/// import 'package:mobile_learner/accessibility/accessibility_announcements.dart';
///
/// // Announce a message to screen readers
/// A11yAnnouncer.announce('Your progress has been saved');
///
/// // Announce politely (interrupts less)
/// A11yAnnouncer.announcePolite('New message received');
///
/// // Announce assertively (interrupts current speech)
/// A11yAnnouncer.announceAssertive('Error: Please try again');
/// ```

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Priorities for accessibility announcements
enum AnnouncementPriority {
  /// Polite announcements wait for current speech to finish
  polite,
  /// Assertive announcements interrupt current speech
  assertive,
}

/// Utility class for making screen reader announcements
abstract class A11yAnnouncer {
  /// Announce a message to screen readers (polite by default)
  static void announce(
    String message, {
    AnnouncementPriority priority = AnnouncementPriority.polite,
  }) {
    SemanticsService.announce(
      message,
      priority == AnnouncementPriority.assertive
          ? TextDirection.ltr // Using ltr for assertive
          : TextDirection.ltr,
    );
  }

  /// Announce a message politely (doesn't interrupt current speech)
  static void announcePolite(String message) {
    announce(message, priority: AnnouncementPriority.polite);
  }

  /// Announce a message assertively (interrupts current speech)
  static void announceAssertive(String message) {
    announce(message, priority: AnnouncementPriority.assertive);
  }

  /// Announce a status change
  static void announceStatus(String status) {
    announcePolite(status);
  }

  /// Announce an error (assertive)
  static void announceError(String error) {
    announceAssertive('Error: $error');
  }

  /// Announce a success (polite)
  static void announceSuccess(String message) {
    announcePolite(message);
  }

  /// Announce progress
  static void announceProgress(int current, int total, {String? context}) {
    final percentage = total > 0 ? ((current / total) * 100).round() : 0;
    final message = context != null
        ? '$context: $percentage percent complete'
        : '$percentage percent complete';
    announcePolite(message);
  }

  /// Announce a timer update
  static void announceTimeRemaining(int minutes, int seconds) {
    if (minutes > 0) {
      announcePolite('$minutes minutes and $seconds seconds remaining');
    } else {
      announcePolite('$seconds seconds remaining');
    }
  }

  /// Announce activity start
  static void announceActivityStart(String activityName) {
    announceAssertive('Starting: $activityName');
  }

  /// Announce activity completion
  static void announceActivityComplete(String activityName, {int? score, int? total}) {
    String message = '$activityName complete';
    if (score != null && total != null) {
      message += '. Score: $score out of $total';
    }
    announceAssertive(message);
  }

  /// Announce a navigation change
  static void announceNavigation(String destination) {
    announcePolite('Navigated to $destination');
  }

  /// Announce a list update
  static void announceListUpdate(int itemCount, String itemType) {
    if (itemCount == 0) {
      announcePolite('No $itemType');
    } else {
      announcePolite('$itemCount $itemType available');
    }
  }

  /// Announce a selection change
  static void announceSelection(String item, bool selected) {
    announcePolite('$item ${selected ? "selected" : "deselected"}');
  }

  /// Announce connectivity change
  static void announceConnectivity(bool isOnline) {
    if (isOnline) {
      announcePolite('Connected to the internet');
    } else {
      announceAssertive('You are now offline');
    }
  }
}

/// Widget that announces its content when it becomes visible
class AnnounceOnVisible extends StatefulWidget {
  final Widget child;
  final String announcement;
  final AnnouncementPriority priority;
  final Duration delay;

  const AnnounceOnVisible({
    super.key,
    required this.child,
    required this.announcement,
    this.priority = AnnouncementPriority.polite,
    this.delay = const Duration(milliseconds: 500),
  });

  @override
  State<AnnounceOnVisible> createState() => _AnnounceOnVisibleState();
}

class _AnnounceOnVisibleState extends State<AnnounceOnVisible> {
  @override
  void initState() {
    super.initState();
    Future.delayed(widget.delay, () {
      if (mounted) {
        A11yAnnouncer.announce(widget.announcement, priority: widget.priority);
      }
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Widget that announces changes to its value
class AnnounceOnChange<T> extends StatefulWidget {
  final T value;
  final String Function(T value) announceValue;
  final Widget child;
  final AnnouncementPriority priority;
  final bool announceInitial;

  const AnnounceOnChange({
    super.key,
    required this.value,
    required this.announceValue,
    required this.child,
    this.priority = AnnouncementPriority.polite,
    this.announceInitial = false,
  });

  @override
  State<AnnounceOnChange<T>> createState() => _AnnounceOnChangeState<T>();
}

class _AnnounceOnChangeState<T> extends State<AnnounceOnChange<T>> {
  late T _previousValue;

  @override
  void initState() {
    super.initState();
    _previousValue = widget.value;
    if (widget.announceInitial) {
      _announce();
    }
  }

  @override
  void didUpdateWidget(AnnounceOnChange<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _previousValue) {
      _previousValue = widget.value;
      _announce();
    }
  }

  void _announce() {
    A11yAnnouncer.announce(
      widget.announceValue(widget.value),
      priority: widget.priority,
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Widget that provides live region semantics for dynamic content
class LiveRegion extends StatelessWidget {
  final Widget child;
  final String label;
  final bool liveRegion;

  const LiveRegion({
    super.key,
    required this.child,
    required this.label,
    this.liveRegion = true,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      liveRegion: liveRegion,
      child: child,
    );
  }
}

/// Widget that provides countdown announcements
class CountdownAnnouncer extends StatefulWidget {
  final int seconds;
  final Widget child;
  final List<int> announceAt;
  final VoidCallback? onComplete;

  const CountdownAnnouncer({
    super.key,
    required this.seconds,
    required this.child,
    this.announceAt = const [60, 30, 10, 5, 3, 2, 1],
    this.onComplete,
  });

  @override
  State<CountdownAnnouncer> createState() => _CountdownAnnouncerState();
}

class _CountdownAnnouncerState extends State<CountdownAnnouncer> {
  int _lastAnnounced = -1;

  @override
  void didUpdateWidget(CountdownAnnouncer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.seconds != oldWidget.seconds) {
      _checkAnnouncement();
    }
  }

  void _checkAnnouncement() {
    if (widget.seconds != _lastAnnounced &&
        widget.announceAt.contains(widget.seconds)) {
      _lastAnnounced = widget.seconds;
      A11yAnnouncer.announcePolite('${widget.seconds} seconds remaining');
    }

    if (widget.seconds == 0 && widget.onComplete != null) {
      A11yAnnouncer.announceAssertive('Time is up');
      widget.onComplete!();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Extension for easy semantic labeling
extension AccessibilityExtensions on Widget {
  /// Add a semantic label to this widget
  Widget semanticLabel(String label) {
    return Semantics(
      label: label,
      child: this,
    );
  }

  /// Mark this widget as a button with semantic label
  Widget semanticButton(String label, {VoidCallback? onTap}) {
    return Semantics(
      label: label,
      button: true,
      onTap: onTap,
      child: this,
    );
  }

  /// Mark this widget as a header
  Widget semanticHeader(String label) {
    return Semantics(
      label: label,
      header: true,
      child: this,
    );
  }

  /// Mark this widget as an image with description
  Widget semanticImage(String description) {
    return Semantics(
      label: description,
      image: true,
      child: ExcludeSemantics(child: this),
    );
  }

  /// Add a live region for dynamic content
  Widget asLiveRegion(String label) {
    return Semantics(
      label: label,
      liveRegion: true,
      child: this,
    );
  }
}
