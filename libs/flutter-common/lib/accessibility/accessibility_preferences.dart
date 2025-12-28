import 'package:flutter/material.dart';

/// Detects and provides user accessibility preferences
class AccessibilityPreferences {
  /// Check if user prefers reduced motion
  static bool prefersReducedMotion(BuildContext context) {
    return MediaQuery.of(context).disableAnimations;
  }

  /// Check if bold text is enabled
  static bool prefersBoldText(BuildContext context) {
    return MediaQuery.of(context).boldText;
  }

  /// Check if high contrast is enabled
  static bool prefersHighContrast(BuildContext context) {
    return MediaQuery.of(context).highContrast;
  }

  /// Check if inverted colors are enabled
  static bool prefersInvertedColors(BuildContext context) {
    return MediaQuery.of(context).invertColors;
  }

  /// Get the current text scale factor
  static double getTextScaleFactor(BuildContext context) {
    return MediaQuery.of(context).textScaler.scale(1.0);
  }

  /// Check if text is scaled beyond normal
  static bool hasLargeText(BuildContext context) {
    return getTextScaleFactor(context) > 1.0;
  }

  /// Check if accessibility features are enabled
  static bool accessibilityFeaturesEnabled(BuildContext context) {
    return MediaQuery.of(context).accessibleNavigation;
  }

  /// Get animation duration based on reduced motion preference
  static Duration getAnimationDuration(
    BuildContext context, {
    Duration normal = const Duration(milliseconds: 300),
    Duration reduced = Duration.zero,
  }) {
    return prefersReducedMotion(context) ? reduced : normal;
  }

  /// Get curve based on reduced motion preference
  static Curve getAnimationCurve(
    BuildContext context, {
    Curve normal = Curves.easeInOut,
    Curve reduced = Curves.linear,
  }) {
    return prefersReducedMotion(context) ? reduced : normal;
  }
}

/// Widget that adapts based on accessibility preferences
class AccessibilityAdaptive extends StatelessWidget {
  final Widget child;
  final Widget? reducedMotionChild;
  final Widget? highContrastChild;
  final Widget? boldTextChild;
  final Widget? largeTextChild;

  const AccessibilityAdaptive({
    super.key,
    required this.child,
    this.reducedMotionChild,
    this.highContrastChild,
    this.boldTextChild,
    this.largeTextChild,
  });

  @override
  Widget build(BuildContext context) {
    if (AccessibilityPreferences.prefersHighContrast(context) && 
        highContrastChild != null) {
      return highContrastChild!;
    }
    
    if (AccessibilityPreferences.prefersBoldText(context) && 
        boldTextChild != null) {
      return boldTextChild!;
    }
    
    if (AccessibilityPreferences.hasLargeText(context) && 
        largeTextChild != null) {
      return largeTextChild!;
    }
    
    if (AccessibilityPreferences.prefersReducedMotion(context) && 
        reducedMotionChild != null) {
      return reducedMotionChild!;
    }
    
    return child;
  }
}

/// Animated widget that respects reduced motion preference
class MotionSafeAnimatedContainer extends StatelessWidget {
  final Widget child;
  final Duration duration;
  final Curve curve;
  final AlignmentGeometry? alignment;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final Decoration? decoration;
  final BoxConstraints? constraints;
  final EdgeInsetsGeometry? margin;
  final Matrix4? transform;
  final double? width;
  final double? height;

  const MotionSafeAnimatedContainer({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 300),
    this.curve = Curves.easeInOut,
    this.alignment,
    this.padding,
    this.color,
    this.decoration,
    this.constraints,
    this.margin,
    this.transform,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveDuration = AccessibilityPreferences.getAnimationDuration(
      context,
      normal: duration,
    );
    final effectiveCurve = AccessibilityPreferences.getAnimationCurve(
      context,
      normal: curve,
    );

    return AnimatedContainer(
      duration: effectiveDuration,
      curve: effectiveCurve,
      alignment: alignment,
      padding: padding,
      color: color,
      decoration: decoration,
      constraints: constraints,
      margin: margin,
      transform: transform,
      width: width,
      height: height,
      child: child,
    );
  }
}

/// Extension to check accessibility preferences easily
extension AccessibilityContext on BuildContext {
  bool get prefersReducedMotion => AccessibilityPreferences.prefersReducedMotion(this);
  bool get prefersBoldText => AccessibilityPreferences.prefersBoldText(this);
  bool get prefersHighContrast => AccessibilityPreferences.prefersHighContrast(this);
  bool get hasLargeText => AccessibilityPreferences.hasLargeText(this);
  double get textScaleFactor => AccessibilityPreferences.getTextScaleFactor(this);
  
  Duration animationDuration([Duration normal = const Duration(milliseconds: 300)]) {
    return AccessibilityPreferences.getAnimationDuration(this, normal: normal);
  }
}
