/// AIVO Animation & Motion System
///
/// Comprehensive animation utilities matching web design system exactly.
/// Provides grade-band specific durations, easing curves, and reduced motion support.
///
/// Usage:
/// ```dart
/// // Grade-band aware duration
/// AnimatedContainer(
///   duration: AivoMotion.durationFor(gradeBand).base,
///   curve: AivoMotion.curves.standard,
///   child: ...
/// );
///
/// // Reduced motion aware
/// AnimatedOpacity(
///   duration: context.aivoDuration.base,
///   opacity: isVisible ? 1.0 : 0.0,
///   child: ...
/// );
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// DURATION CONFIGURATION PER GRADE BAND
// ══════════════════════════════════════════════════════════════════════════════

/// Duration configuration for a specific grade band.
///
/// Each grade band has different timing to match age-appropriate UX:
/// - Explorer (Pre-K–5): Slower, more noticeable animations (playful)
/// - Navigator (6-8): Moderate animations (balanced)
/// - Scholar (9-12): Faster, subtle animations (professional)
class AivoDurationConfig {
  const AivoDurationConfig({
    required this.fast,
    required this.base,
    required this.slow,
    this.style = 'standard',
  });

  /// Fast duration - for quick micro-interactions
  /// Used for: button press feedback, icon animations, tooltips
  final Duration fast;

  /// Base duration - for standard transitions
  /// Used for: page transitions, modal open/close, card hover
  final Duration base;

  /// Slow duration - for emphasized transitions
  /// Used for: large content reveals, onboarding animations
  final Duration slow;

  /// Style identifier for this configuration
  final String style;

  /// Explorer (Pre-K–5): More playful, noticeable animations
  /// Web reference: grade-themes.ts Explorer animations
  /// - fast: 0.2s (200ms) - adjusted to 150ms for mobile
  /// - base: 0.4s (400ms) - adjusted to 250ms for mobile feel
  /// - slow: 0.6s (600ms) - adjusted to 400ms for mobile feel
  static const explorer = AivoDurationConfig(
    fast: Duration(milliseconds: 150),
    base: Duration(milliseconds: 250),
    slow: Duration(milliseconds: 400),
    style: 'playful',
  );

  /// Navigator (6-8): Balanced, moderate animations
  /// Web reference: grade-themes.ts Navigator animations
  /// - fast: 0.15s (150ms) - adjusted to 120ms for mobile
  /// - base: 0.25s (250ms) - adjusted to 200ms for mobile feel
  /// - slow: 0.4s (400ms) - adjusted to 320ms for mobile feel
  static const navigator = AivoDurationConfig(
    fast: Duration(milliseconds: 120),
    base: Duration(milliseconds: 200),
    slow: Duration(milliseconds: 320),
    style: 'subtle',
  );

  /// Scholar (9-12): Professional, minimal animations
  /// Web reference: grade-themes.ts Scholar animations
  /// - fast: 0.1s (100ms)
  /// - base: 0.15s (150ms)
  /// - slow: 0.25s (250ms)
  static const scholar = AivoDurationConfig(
    fast: Duration(milliseconds: 100),
    base: Duration(milliseconds: 150),
    slow: Duration(milliseconds: 250),
    style: 'professional',
  );

  /// Reduced motion configuration - instant or minimal animations
  /// Used when user has requested reduced motion in accessibility settings
  static const reduced = AivoDurationConfig(
    fast: Duration.zero,
    base: Duration.zero,
    slow: Duration(milliseconds: 150),
    style: 'reduced',
  );

  /// Get duration config for a specific grade band
  static AivoDurationConfig forGradeBand(AivoGradeBand? band) {
    return switch (band) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
      null => navigator, // Default to navigator
    };
  }

  /// Interpolate between two duration configs
  static AivoDurationConfig lerp(
    AivoDurationConfig a,
    AivoDurationConfig b,
    double t,
  ) {
    return AivoDurationConfig(
      fast: Duration(
        milliseconds:
            ((1 - t) * a.fast.inMilliseconds + t * b.fast.inMilliseconds)
                .round(),
      ),
      base: Duration(
        milliseconds:
            ((1 - t) * a.base.inMilliseconds + t * b.base.inMilliseconds)
                .round(),
      ),
      slow: Duration(
        milliseconds:
            ((1 - t) * a.slow.inMilliseconds + t * b.slow.inMilliseconds)
                .round(),
      ),
      style: t < 0.5 ? a.style : b.style,
    );
  }

  @override
  String toString() =>
      'AivoDurationConfig(fast: ${fast.inMilliseconds}ms, base: ${base.inMilliseconds}ms, slow: ${slow.inMilliseconds}ms, style: $style)';
}

// ══════════════════════════════════════════════════════════════════════════════
// EASING CURVES MATCHING WEB
// ══════════════════════════════════════════════════════════════════════════════

/// Easing curves matching web cubic-bezier values.
///
/// Web reference:
/// - standard: cubic-bezier(0.2, 0, 0, 1) - Material decelerate
/// - emphasized: cubic-bezier(0.3, 0, 0.2, 1) - Material emphasized decelerate
/// - bounce (Explorer): cubic-bezier(0.68, -0.55, 0.265, 1.55) - Playful overshoot
/// - subtle bounce (Navigator): cubic-bezier(0.34, 1.2, 0.64, 1) - Slight overshoot
/// - minimal bounce (Scholar): cubic-bezier(0.34, 1.1, 0.64, 1) - Barely noticeable
class AivoCurves {
  AivoCurves._();

  /// Standard easing - web: cubic-bezier(0.2, 0, 0, 1)
  /// Used for most transitions, follows Material decelerate curve
  static const Curve standard = Cubic(0.2, 0, 0, 1);

  /// Emphasized easing - web: cubic-bezier(0.3, 0, 0.2, 1)
  /// Used for important or emphasized transitions
  static const Curve emphasized = Cubic(0.3, 0, 0.2, 1);

  /// Emphasized accelerate - for exit animations
  static const Curve emphasizedAccelerate = Cubic(0.3, 0, 0.8, 0.15);

  /// Linear - no easing, for reduced motion or simple transitions
  static const Curve linear = Curves.linear;

  /// Explorer bounce - web: cubic-bezier(0.68, -0.55, 0.265, 1.55)
  /// Playful overshoot for younger learners
  static const Curve bounceExplorer = Cubic(0.68, -0.55, 0.265, 1.55);

  /// Navigator bounce - web: cubic-bezier(0.34, 1.2, 0.64, 1)
  /// Subtle overshoot for middle schoolers
  static const Curve bounceNavigator = Cubic(0.34, 1.2, 0.64, 1);

  /// Scholar bounce - web: cubic-bezier(0.34, 1.1, 0.64, 1)
  /// Minimal overshoot for high schoolers
  static const Curve bounceScholar = Cubic(0.34, 1.1, 0.64, 1);

  /// Ease out - for most enter/show animations
  static const Curve easeOut = Curves.easeOut;

  /// Ease in - for most exit/hide animations
  static const Curve easeIn = Curves.easeIn;

  /// Ease in out - for symmetric animations
  static const Curve easeInOut = Curves.easeInOut;

  /// Spring curve - for physics-based animations
  static const Curve spring = Curves.elasticOut;

  /// Get bounce curve for grade band
  static Curve bounceForGradeBand(AivoGradeBand? band) {
    return switch (band) {
      AivoGradeBand.k5 => bounceExplorer,
      AivoGradeBand.g6_8 => bounceNavigator,
      AivoGradeBand.g9_12 => bounceScholar,
      null => bounceNavigator,
    };
  }

  /// Get standard curve - same for all grade bands
  static Curve standardForGradeBand(AivoGradeBand? band) => standard;

  /// Get emphasized curve - same for all grade bands
  static Curve emphasizedForGradeBand(AivoGradeBand? band) => emphasized;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCALE CONFIGURATION FOR HOVER/PRESS
// ══════════════════════════════════════════════════════════════════════════════

/// Scale values for hover and press states per grade band.
class AivoScaleConfig {
  const AivoScaleConfig({
    required this.hover,
    required this.press,
  });

  /// Scale when hovering (1.0 = no change)
  final double hover;

  /// Scale when pressed (1.0 = no change)
  final double press;

  /// Explorer: More noticeable scale changes
  /// Web: hoverScale: 1.05, pressScale: 0.95
  static const explorer = AivoScaleConfig(hover: 1.05, press: 0.95);

  /// Navigator: Moderate scale changes
  /// Web: hoverScale: 1.02, pressScale: 0.98
  static const navigator = AivoScaleConfig(hover: 1.02, press: 0.98);

  /// Scholar: Minimal scale changes
  /// Web: hoverScale: 1.01, pressScale: 0.99
  static const scholar = AivoScaleConfig(hover: 1.01, press: 0.99);

  /// Reduced: No scale changes
  static const reduced = AivoScaleConfig(hover: 1.0, press: 1.0);

  /// Get scale config for grade band
  static AivoScaleConfig forGradeBand(AivoGradeBand? band) {
    return switch (band) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
      null => navigator,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REDUCED MOTION SUPPORT
// ══════════════════════════════════════════════════════════════════════════════

/// Utility for checking and respecting reduced motion preferences.
class AivoReducedMotion {
  AivoReducedMotion._();

  static bool? _cachedPreference;

  /// Check if the system has reduced motion enabled.
  ///
  /// This respects the user's accessibility preference for reduced motion,
  /// which is important for users with vestibular disorders or who simply
  /// prefer less motion.
  static bool isEnabled(BuildContext context) {
    // Check cached value first for performance
    if (_cachedPreference != null) {
      return _cachedPreference!;
    }

    // Check MediaQuery for platform preference
    final mediaQuery = MediaQuery.maybeOf(context);
    if (mediaQuery != null) {
      _cachedPreference = mediaQuery.disableAnimations;
      return _cachedPreference!;
    }

    // Fallback: Check timeDilation for testing
    return timeDilation > 1.0;
  }

  /// Clear cached preference (call when returning from settings)
  static void clearCache() {
    _cachedPreference = null;
  }

  /// Get duration adjusted for reduced motion preference
  static Duration adjustedDuration(BuildContext context, Duration original) {
    if (isEnabled(context)) {
      // For reduced motion, use instant for fast/base, minimal for slow
      if (original.inMilliseconds <= 250) {
        return Duration.zero;
      }
      return const Duration(milliseconds: 150);
    }
    return original;
  }

  /// Get curve adjusted for reduced motion preference
  static Curve adjustedCurve(BuildContext context, Curve original) {
    if (isEnabled(context)) {
      return Curves.linear;
    }
    return original;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MOTION UTILITY CLASS
// ══════════════════════════════════════════════════════════════════════════════

/// Main entry point for AIVO animation system.
///
/// Provides centralized access to durations, curves, and reduced motion support.
///
/// Usage:
/// ```dart
/// // Get duration config for grade band
/// final durations = AivoMotion.durationFor(gradeBand);
/// AnimatedContainer(
///   duration: durations.base,
///   child: ...
/// );
///
/// // Use curves
/// AnimatedContainer(
///   curve: AivoMotion.curves.standard,
///   child: ...
/// );
///
/// // Check reduced motion
/// if (AivoMotion.isReducedMotion(context)) {
///   // Skip animation
/// }
/// ```
class AivoMotion {
  AivoMotion._();

  /// Access to all curve definitions
  static const curves = AivoCurves;

  /// Get duration configuration for a grade band
  static AivoDurationConfig durationFor(AivoGradeBand? band) {
    return AivoDurationConfig.forGradeBand(band);
  }

  /// Get scale configuration for a grade band
  static AivoScaleConfig scaleFor(AivoGradeBand? band) {
    return AivoScaleConfig.forGradeBand(band);
  }

  /// Check if reduced motion is enabled
  static bool isReducedMotion(BuildContext context) {
    return AivoReducedMotion.isEnabled(context);
  }

  /// Get the appropriate bounce curve for a grade band
  static Curve bounceFor(AivoGradeBand? band) {
    return AivoCurves.bounceForGradeBand(band);
  }

  /// Get reduced motion aware duration
  static Duration duration(
    BuildContext context,
    Duration original, {
    AivoGradeBand? gradeBand,
  }) {
    if (isReducedMotion(context)) {
      return AivoReducedMotion.adjustedDuration(context, original);
    }
    return original;
  }

  /// Get reduced motion aware curve
  static Curve curve(BuildContext context, Curve original) {
    if (isReducedMotion(context)) {
      return AivoReducedMotion.adjustedCurve(context, original);
    }
    return original;
  }

  /// Default base durations (matches web tokens.json)
  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationBase = Duration(milliseconds: 250);
  static const Duration durationSlow = Duration(milliseconds: 400);
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME EXTENSION FOR CONTEXT ACCESS
// ══════════════════════════════════════════════════════════════════════════════

/// Theme extension for accessing motion configuration from BuildContext.
class AivoMotionTheme extends ThemeExtension<AivoMotionTheme> {
  const AivoMotionTheme({
    required this.durations,
    required this.scales,
    required this.gradeBand,
  });

  /// Duration configuration for this theme
  final AivoDurationConfig durations;

  /// Scale configuration for this theme
  final AivoScaleConfig scales;

  /// Grade band this theme is configured for
  final AivoGradeBand gradeBand;

  /// Explorer theme preset
  static const explorer = AivoMotionTheme(
    durations: AivoDurationConfig.explorer,
    scales: AivoScaleConfig.explorer,
    gradeBand: AivoGradeBand.k5,
  );

  /// Navigator theme preset
  static const navigator = AivoMotionTheme(
    durations: AivoDurationConfig.navigator,
    scales: AivoScaleConfig.navigator,
    gradeBand: AivoGradeBand.g6_8,
  );

  /// Scholar theme preset
  static const scholar = AivoMotionTheme(
    durations: AivoDurationConfig.scholar,
    scales: AivoScaleConfig.scholar,
    gradeBand: AivoGradeBand.g9_12,
  );

  /// Get theme preset for grade band
  static AivoMotionTheme forGradeBand(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
    };
  }

  @override
  AivoMotionTheme copyWith({
    AivoDurationConfig? durations,
    AivoScaleConfig? scales,
    AivoGradeBand? gradeBand,
  }) {
    return AivoMotionTheme(
      durations: durations ?? this.durations,
      scales: scales ?? this.scales,
      gradeBand: gradeBand ?? this.gradeBand,
    );
  }

  @override
  AivoMotionTheme lerp(AivoMotionTheme? other, double t) {
    if (other is! AivoMotionTheme) return this;
    return AivoMotionTheme(
      durations: AivoDurationConfig.lerp(durations, other.durations, t),
      scales: t < 0.5 ? scales : other.scales,
      gradeBand: t < 0.5 ? gradeBand : other.gradeBand,
    );
  }
}

/// Extension for easy access to motion config from BuildContext.
extension AivoMotionExtension on BuildContext {
  /// Get the motion theme extension from context
  AivoMotionTheme? get aivoMotionTheme =>
      Theme.of(this).extension<AivoMotionTheme>();

  /// Get duration config, with fallback to Navigator
  AivoDurationConfig get aivoDuration =>
      aivoMotionTheme?.durations ?? AivoDurationConfig.navigator;

  /// Get scale config, with fallback to Navigator
  AivoScaleConfig get aivoScale =>
      aivoMotionTheme?.scales ?? AivoScaleConfig.navigator;

  /// Check if reduced motion is enabled
  bool get aivoReducedMotion => AivoMotion.isReducedMotion(this);

  /// Get a duration adjusted for reduced motion
  Duration aivoAdjustedDuration(Duration duration) {
    if (aivoReducedMotion) {
      return AivoReducedMotion.adjustedDuration(this, duration);
    }
    return duration;
  }

  /// Get a curve adjusted for reduced motion
  Curve aivoAdjustedCurve(Curve curve) {
    if (aivoReducedMotion) {
      return AivoReducedMotion.adjustedCurve(this, curve);
    }
    return curve;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATED WRAPPER WIDGETS
// ══════════════════════════════════════════════════════════════════════════════

/// Animated scale widget with grade-band awareness.
///
/// Automatically uses appropriate duration and curve for the grade band.
/// Respects reduced motion preferences.
class AivoAnimatedScale extends StatelessWidget {
  const AivoAnimatedScale({
    super.key,
    required this.child,
    required this.scale,
    this.gradeBand,
    this.duration,
    this.curve,
    this.alignment = Alignment.center,
    this.onEnd,
  });

  /// Child widget to scale
  final Widget child;

  /// Target scale value
  final double scale;

  /// Optional grade band override
  final AivoGradeBand? gradeBand;

  /// Optional duration override
  final Duration? duration;

  /// Optional curve override
  final Curve? curve;

  /// Alignment for scale transform
  final Alignment alignment;

  /// Callback when animation completes
  final VoidCallback? onEnd;

  @override
  Widget build(BuildContext context) {
    final config = AivoDurationConfig.forGradeBand(gradeBand);
    final effectiveCurve =
        curve ?? AivoCurves.bounceForGradeBand(gradeBand);

    Duration effectiveDuration = duration ?? config.fast;
    if (context.aivoReducedMotion) {
      effectiveDuration = Duration.zero;
    }

    return AnimatedScale(
      scale: scale,
      duration: effectiveDuration,
      curve: context.aivoReducedMotion ? Curves.linear : effectiveCurve,
      alignment: alignment,
      onEnd: onEnd,
      child: child,
    );
  }
}

/// Animated opacity widget with grade-band awareness.
///
/// Automatically uses appropriate duration for the grade band.
/// Respects reduced motion preferences.
class AivoAnimatedOpacity extends StatelessWidget {
  const AivoAnimatedOpacity({
    super.key,
    required this.child,
    required this.opacity,
    this.gradeBand,
    this.duration,
    this.curve,
    this.onEnd,
    this.alwaysIncludeSemantics = false,
  });

  /// Child widget to fade
  final Widget child;

  /// Target opacity value (0.0 to 1.0)
  final double opacity;

  /// Optional grade band override
  final AivoGradeBand? gradeBand;

  /// Optional duration override
  final Duration? duration;

  /// Optional curve override
  final Curve? curve;

  /// Callback when animation completes
  final VoidCallback? onEnd;

  /// Whether to include semantics when opacity is 0
  final bool alwaysIncludeSemantics;

  @override
  Widget build(BuildContext context) {
    final config = AivoDurationConfig.forGradeBand(gradeBand);

    Duration effectiveDuration = duration ?? config.base;
    Curve effectiveCurve = curve ?? AivoCurves.standard;

    if (context.aivoReducedMotion) {
      effectiveDuration = Duration.zero;
      effectiveCurve = Curves.linear;
    }

    return AnimatedOpacity(
      opacity: opacity,
      duration: effectiveDuration,
      curve: effectiveCurve,
      onEnd: onEnd,
      alwaysIncludeSemantics: alwaysIncludeSemantics,
      child: child,
    );
  }
}

/// Animated slide widget with grade-band awareness.
class AivoAnimatedSlide extends StatelessWidget {
  const AivoAnimatedSlide({
    super.key,
    required this.child,
    required this.offset,
    this.gradeBand,
    this.duration,
    this.curve,
    this.onEnd,
  });

  /// Child widget to slide
  final Widget child;

  /// Target offset (in fractions of child size)
  final Offset offset;

  /// Optional grade band override
  final AivoGradeBand? gradeBand;

  /// Optional duration override
  final Duration? duration;

  /// Optional curve override
  final Curve? curve;

  /// Callback when animation completes
  final VoidCallback? onEnd;

  @override
  Widget build(BuildContext context) {
    final config = AivoDurationConfig.forGradeBand(gradeBand);

    Duration effectiveDuration = duration ?? config.base;
    Curve effectiveCurve = curve ?? AivoCurves.emphasized;

    if (context.aivoReducedMotion) {
      effectiveDuration = Duration.zero;
      effectiveCurve = Curves.linear;
    }

    return AnimatedSlide(
      offset: offset,
      duration: effectiveDuration,
      curve: effectiveCurve,
      onEnd: onEnd,
      child: child,
    );
  }
}

/// Combined scale and opacity animation for enter/exit transitions.
class AivoAnimatedPresence extends StatelessWidget {
  const AivoAnimatedPresence({
    super.key,
    required this.child,
    required this.visible,
    this.gradeBand,
    this.duration,
    this.curve,
    this.scaleStart = 0.95,
    this.maintainState = false,
    this.maintainAnimation = false,
    this.maintainSize = false,
  });

  /// Child widget to animate
  final Widget child;

  /// Whether the child should be visible
  final bool visible;

  /// Optional grade band override
  final AivoGradeBand? gradeBand;

  /// Optional duration override
  final Duration? duration;

  /// Optional curve override
  final Curve? curve;

  /// Starting scale when hidden (1.0 = full size)
  final double scaleStart;

  /// Whether to maintain the state when hidden
  final bool maintainState;

  /// Whether to maintain the animation when hidden
  final bool maintainAnimation;

  /// Whether to maintain the size when hidden
  final bool maintainSize;

  @override
  Widget build(BuildContext context) {
    final config = AivoDurationConfig.forGradeBand(gradeBand);

    Duration effectiveDuration = duration ?? config.base;
    Curve effectiveCurve = curve ?? AivoCurves.emphasized;

    if (context.aivoReducedMotion) {
      effectiveDuration = Duration.zero;
      effectiveCurve = Curves.linear;
    }

    return AnimatedOpacity(
      opacity: visible ? 1.0 : 0.0,
      duration: effectiveDuration,
      curve: effectiveCurve,
      child: AnimatedScale(
        scale: visible ? 1.0 : scaleStart,
        duration: effectiveDuration,
        curve: effectiveCurve,
        child: Visibility(
          visible: visible,
          maintainState: maintainState,
          maintainAnimation: maintainAnimation,
          maintainSize: maintainSize,
          child: child,
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE TRANSITION BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Page transition builder with grade-band aware animations.
class AivoPageTransitionsBuilder extends PageTransitionsBuilder {
  const AivoPageTransitionsBuilder({
    this.gradeBand,
  });

  final AivoGradeBand? gradeBand;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final effectiveGradeBand = gradeBand ?? AivoGradeBand.g6_8;

    // Check for reduced motion
    final isReduced = AivoReducedMotion.isEnabled(context);
    if (isReduced) {
      return FadeTransition(
        opacity: animation,
        child: child,
      );
    }

    // Different transitions per grade band
    return switch (effectiveGradeBand) {
      AivoGradeBand.k5 => _buildExplorerTransition(
          animation,
          secondaryAnimation,
          child,
        ),
      AivoGradeBand.g6_8 => _buildNavigatorTransition(
          animation,
          secondaryAnimation,
          child,
        ),
      AivoGradeBand.g9_12 => _buildScholarTransition(
          animation,
          secondaryAnimation,
          child,
        ),
    };
  }

  Widget _buildExplorerTransition(
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Scale + fade + slight slide for playful feel
    final scaleAnimation = Tween<double>(begin: 0.92, end: 1.0).animate(
      CurvedAnimation(
        parent: animation,
        curve: AivoCurves.bounceExplorer,
      ),
    );

    final fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: animation,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );

    return FadeTransition(
      opacity: fadeAnimation,
      child: ScaleTransition(
        scale: scaleAnimation,
        child: child,
      ),
    );
  }

  Widget _buildNavigatorTransition(
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Slide + fade for balanced feel
    final slideAnimation = Tween<Offset>(
      begin: const Offset(0.1, 0.0),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: animation,
        curve: AivoCurves.emphasized,
      ),
    );

    final fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: animation,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    return FadeTransition(
      opacity: fadeAnimation,
      child: SlideTransition(
        position: slideAnimation,
        child: child,
      ),
    );
  }

  Widget _buildScholarTransition(
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Simple fade for professional feel
    final fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: animation,
        curve: AivoCurves.standard,
      ),
    );

    return FadeTransition(
      opacity: fadeAnimation,
      child: child,
    );
  }
}

/// Create page transitions theme for a grade band.
PageTransitionsTheme aivoPageTransitionsTheme(AivoGradeBand gradeBand) {
  return PageTransitionsTheme(
    builders: {
      TargetPlatform.android: AivoPageTransitionsBuilder(gradeBand: gradeBand),
      TargetPlatform.iOS: AivoPageTransitionsBuilder(gradeBand: gradeBand),
      TargetPlatform.fuchsia: AivoPageTransitionsBuilder(gradeBand: gradeBand),
      TargetPlatform.linux: AivoPageTransitionsBuilder(gradeBand: gradeBand),
      TargetPlatform.macOS: AivoPageTransitionsBuilder(gradeBand: gradeBand),
      TargetPlatform.windows: AivoPageTransitionsBuilder(gradeBand: gradeBand),
    },
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATION CONTROLLER HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/// Extension on AnimationController for grade-band aware configuration.
extension AivoAnimationControllerExtension on AnimationController {
  /// Configure this controller for a specific grade band
  void configureForGradeBand(
    AivoGradeBand? gradeBand, {
    bool useFast = false,
    bool useSlow = false,
  }) {
    final config = AivoDurationConfig.forGradeBand(gradeBand);
    duration = useFast
        ? config.fast
        : useSlow
            ? config.slow
            : config.base;
  }
}

/// Mixin for stateful widgets that need grade-band aware animations.
mixin AivoAnimationMixin<T extends StatefulWidget>
    on SingleTickerProviderStateMixin<T> {
  late AnimationController _aivoController;

  /// Initialize the animation controller with grade-band aware duration
  void initAivoAnimation({
    AivoGradeBand? gradeBand,
    bool useFast = false,
    bool useSlow = false,
  }) {
    final config = AivoDurationConfig.forGradeBand(gradeBand);
    _aivoController = AnimationController(
      vsync: this,
      duration: useFast
          ? config.fast
          : useSlow
              ? config.slow
              : config.base,
    );
  }

  /// Get the animation controller
  AnimationController get aivoController => _aivoController;

  /// Dispose the animation controller
  void disposeAivoAnimation() {
    _aivoController.dispose();
  }
}
