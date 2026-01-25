/// Parent App Accessibility Utilities
///
/// Provides reusable accessibility widgets and helpers for screen reader support.
/// Sprint 3.3: Implements parent mobile accessibility improvements.
library;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE BUTTON WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/// Wraps a button with enhanced accessibility semantics.
class AccessibleButton extends StatelessWidget {
  const AccessibleButton({
    super.key,
    required this.child,
    required this.label,
    this.hint,
    this.onTap,
    this.isEnabled = true,
    this.isSelected = false,
    this.isExpanded = false,
  });

  final Widget child;
  final String label;
  final String? hint;
  final VoidCallback? onTap;
  final bool isEnabled;
  final bool isSelected;
  final bool isExpanded;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: true,
      enabled: isEnabled,
      selected: isSelected,
      expanded: isExpanded,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE CARD
// ══════════════════════════════════════════════════════════════════════════════

/// Wraps a card with enhanced accessibility semantics.
class AccessibleCard extends StatelessWidget {
  const AccessibleCard({
    super.key,
    required this.child,
    required this.label,
    this.hint,
    this.onTap,
    this.isHeader = false,
  });

  final Widget child;
  final String label;
  final String? hint;
  final VoidCallback? onTap;
  final bool isHeader;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: onTap != null,
      header: isHeader,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE PROGRESS INDICATOR
// ══════════════════════════════════════════════════════════════════════════════

/// Announces progress values to screen readers.
class AccessibleProgressIndicator extends StatelessWidget {
  const AccessibleProgressIndicator({
    super.key,
    required this.value,
    required this.label,
    this.child,
    this.maxValue = 100,
    this.unit = '%',
  });

  final double value;
  final String label;
  final Widget? child;
  final double maxValue;
  final String unit;

  @override
  Widget build(BuildContext context) {
    final progressText = maxValue == 100
        ? '${value.round()}$unit'
        : '${value.round()} of ${maxValue.round()} $unit';

    return Semantics(
      label: '$label: $progressText',
      value: progressText,
      child: child ?? const SizedBox.shrink(),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE LIVE REGION
// ══════════════════════════════════════════════════════════════════════════════

/// Announces dynamic content changes to screen readers.
class AccessibleLiveRegion extends StatelessWidget {
  const AccessibleLiveRegion({
    super.key,
    required this.child,
    this.politeness = Assertiveness.polite,
  });

  final Widget child;
  final Assertiveness politeness;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE ICON
// ══════════════════════════════════════════════════════════════════════════════

/// Icon with required accessibility label.
class AccessibleIcon extends StatelessWidget {
  const AccessibleIcon({
    super.key,
    required this.icon,
    required this.label,
    this.size,
    this.color,
  });

  final IconData icon;
  final String label;
  final double? size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      image: true,
      child: Icon(
        icon,
        size: size,
        color: color,
        semanticLabel: label,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE IMAGE
// ══════════════════════════════════════════════════════════════════════════════

/// Image with required accessibility description.
class AccessibleImage extends StatelessWidget {
  const AccessibleImage({
    super.key,
    required this.imageProvider,
    required this.description,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.isDecorative = false,
  });

  final ImageProvider imageProvider;
  final String description;
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool isDecorative;

  @override
  Widget build(BuildContext context) {
    final image = Image(
      image: imageProvider,
      width: width,
      height: height,
      fit: fit,
      semanticLabel: isDecorative ? null : description,
    );

    if (isDecorative) {
      return ExcludeSemantics(child: image);
    }

    return Semantics(
      label: description,
      image: true,
      child: image,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE NAVIGATION ITEM
// ══════════════════════════════════════════════════════════════════════════════

/// Navigation item with enhanced semantics.
class AccessibleNavigationItem extends StatelessWidget {
  const AccessibleNavigationItem({
    super.key,
    required this.child,
    required this.label,
    this.hint,
    this.isSelected = false,
    this.position,
    this.totalItems,
  });

  final Widget child;
  final String label;
  final String? hint;
  final bool isSelected;
  final int? position;
  final int? totalItems;

  @override
  Widget build(BuildContext context) {
    String semanticLabel = label;
    if (position != null && totalItems != null) {
      semanticLabel = '$label, item $position of $totalItems';
    }
    if (isSelected) {
      semanticLabel = '$semanticLabel, selected';
    }

    return Semantics(
      label: semanticLabel,
      hint: hint,
      button: true,
      selected: isSelected,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE HEADING
// ══════════════════════════════════════════════════════════════════════════════

/// Marks text as a heading for screen reader navigation.
class AccessibleHeading extends StatelessWidget {
  const AccessibleHeading({
    super.key,
    required this.text,
    this.style,
  });

  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: Text(text, style: style),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBLE FORM FIELD
// ══════════════════════════════════════════════════════════════════════════════

/// Wraps form fields with proper accessibility hints.
class AccessibleFormField extends StatelessWidget {
  const AccessibleFormField({
    super.key,
    required this.child,
    required this.label,
    this.hint,
    this.errorText,
    this.isRequired = false,
  });

  final Widget child;
  final String label;
  final String? hint;
  final String? errorText;
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    String semanticLabel = label;
    if (isRequired) {
      semanticLabel = '$label, required';
    }
    if (errorText != null) {
      semanticLabel = '$semanticLabel, error: $errorText';
    }

    return Semantics(
      label: semanticLabel,
      hint: hint,
      textField: true,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/// Helper functions for accessibility.
class A11yHelper {
  /// Generates accessibility label for a list item.
  static String listItemLabel(String name, int position, int total) {
    return '$name, item $position of $total';
  }

  /// Generates accessibility label for progress.
  static String progressLabel(String name, double value, {double max = 100}) {
    if (max == 100) {
      return '$name: ${value.round()} percent';
    }
    return '$name: ${value.round()} of ${max.round()}';
  }

  /// Generates accessibility label for status.
  static String statusLabel(String name, String status) {
    return '$name: $status';
  }

  /// Generates accessibility label for action.
  static String actionLabel(String action, String target) {
    return '$action $target';
  }

  /// Announces a message via screen reader.
  static void announce(BuildContext context, String message) {
    SemanticsService.announce(message, TextDirection.ltr);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SKIP NAVIGATION LINK
// ══════════════════════════════════════════════════════════════════════════════

/// Provides skip navigation for screen reader users.
class SkipNavigationLink extends StatelessWidget {
  const SkipNavigationLink({
    super.key,
    required this.targetKey,
    this.label = 'Skip to main content',
  });

  final GlobalKey targetKey;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: Focus(
        onKeyEvent: (node, event) {
          // Handle Enter/Space key
          Scrollable.ensureVisible(
            targetKey.currentContext!,
            duration: const Duration(milliseconds: 300),
          );
          return KeyEventResult.handled;
        },
        child: const SizedBox.shrink(),
      ),
    );
  }
}
