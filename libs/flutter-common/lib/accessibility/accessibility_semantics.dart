import 'package:flutter/material.dart';

/// Utility class for building accessible semantic properties
class AccessibilitySemantics {
  /// Creates semantics for a button with proper labeling
  static Semantics accessibleButton({
    required Widget child,
    required String label,
    String? hint,
    VoidCallback? onTap,
    bool enabled = true,
  }) {
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      hint: hint,
      onTap: enabled ? onTap : null,
      child: child,
    );
  }

  /// Creates semantics for a link
  static Semantics accessibleLink({
    required Widget child,
    required String label,
    String? hint,
    VoidCallback? onTap,
  }) {
    return Semantics(
      link: true,
      label: label,
      hint: hint ?? 'Double tap to open',
      onTap: onTap,
      child: child,
    );
  }

  /// Creates semantics for an image
  static Semantics accessibleImage({
    required Widget child,
    required String label,
    bool isDecorative = false,
  }) {
    if (isDecorative) {
      return Semantics(
        excludeSemantics: true,
        child: child,
      );
    }
    return Semantics(
      image: true,
      label: label,
      child: child,
    );
  }

  /// Creates semantics for a heading
  static Semantics accessibleHeading({
    required Widget child,
    required String label,
    bool isHeader = true,
  }) {
    return Semantics(
      header: isHeader,
      label: label,
      child: child,
    );
  }

  /// Creates semantics for a text field
  static Semantics accessibleTextField({
    required Widget child,
    required String label,
    String? hint,
    String? value,
    bool obscured = false,
    bool multiline = false,
    bool readOnly = false,
    String? error,
  }) {
    return Semantics(
      textField: true,
      label: label,
      hint: hint,
      value: value,
      obscured: obscured,
      multiline: multiline,
      readOnly: readOnly,
      child: child,
    );
  }

  /// Creates semantics for a checkbox
  static Semantics accessibleCheckbox({
    required Widget child,
    required String label,
    required bool checked,
    VoidCallback? onTap,
    bool enabled = true,
  }) {
    return Semantics(
      checked: checked,
      enabled: enabled,
      label: label,
      onTap: enabled ? onTap : null,
      child: child,
    );
  }

  /// Creates semantics for a switch/toggle
  static Semantics accessibleSwitch({
    required Widget child,
    required String label,
    required bool toggled,
    VoidCallback? onTap,
    bool enabled = true,
  }) {
    return Semantics(
      toggled: toggled,
      enabled: enabled,
      label: label,
      onTap: enabled ? onTap : null,
      child: child,
    );
  }

  /// Creates semantics for a slider
  static Semantics accessibleSlider({
    required Widget child,
    required String label,
    required double value,
    double? minValue,
    double? maxValue,
    String? increasedValue,
    String? decreasedValue,
    VoidCallback? onIncrease,
    VoidCallback? onDecrease,
  }) {
    return Semantics(
      slider: true,
      label: label,
      value: '${(value * 100).round()}%',
      increasedValue: increasedValue,
      decreasedValue: decreasedValue,
      onIncrease: onIncrease,
      onDecrease: onDecrease,
      child: child,
    );
  }

  /// Creates semantics for live region (announces changes)
  static Semantics liveRegion({
    required Widget child,
    required String label,
    bool assertive = false,
  }) {
    return Semantics(
      liveRegion: true,
      label: label,
      child: child,
    );
  }

  /// Excludes widget from semantics tree (decorative elements)
  static Widget excludeFromSemantics({required Widget child}) {
    return ExcludeSemantics(child: child);
  }

  /// Merges semantics with children
  static Widget mergeSemantics({required Widget child}) {
    return MergeSemantics(child: child);
  }

  /// Blocks semantics from descendants
  static Widget blockSemantics({
    required Widget child,
    bool blocking = true,
  }) {
    return BlockSemantics(
      blocking: blocking,
      child: child,
    );
  }
}

/// Extension on Widget for quick semantic wrapping
extension AccessibleWidgetExtension on Widget {
  /// Adds button semantics
  Widget withButtonSemantics(String label, {String? hint, VoidCallback? onTap}) {
    return AccessibilitySemantics.accessibleButton(
      child: this,
      label: label,
      hint: hint,
      onTap: onTap,
    );
  }

  /// Adds image semantics
  Widget withImageSemantics(String label, {bool isDecorative = false}) {
    return AccessibilitySemantics.accessibleImage(
      child: this,
      label: label,
      isDecorative: isDecorative,
    );
  }

  /// Adds heading semantics
  Widget withHeadingSemantics(String label) {
    return AccessibilitySemantics.accessibleHeading(
      child: this,
      label: label,
    );
  }

  /// Marks as decorative (excluded from semantics)
  Widget asDecorative() {
    return AccessibilitySemantics.excludeFromSemantics(child: this);
  }

  /// Adds live region semantics
  Widget asLiveRegion(String label, {bool assertive = false}) {
    return AccessibilitySemantics.liveRegion(
      child: this,
      label: label,
      assertive: assertive,
    );
  }
}
