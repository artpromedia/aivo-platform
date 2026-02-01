/// Aivo Page Transitions
///
/// Consistent page transition animations across apps with grade-band awareness.
/// Aligned with web transition timing and feel.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_theme.dart';

/// Page transition types.
enum AivoTransitionType {
  /// Fade transition
  fade,

  /// Slide from right
  slideRight,

  /// Slide from bottom
  slideUp,

  /// Scale with fade
  scale,

  /// Shared axis horizontal
  sharedAxisHorizontal,

  /// Shared axis vertical
  sharedAxisVertical,

  /// No animation
  none,
}

/// Page transition configuration for grade bands.
class _TransitionConfig {
  const _TransitionConfig({
    required this.duration,
    required this.curve,
    required this.reverseCurve,
  });

  final Duration duration;
  final Curve curve;
  final Curve reverseCurve;

  static _TransitionConfig forGradeBand(AivoGradeBand? gradeBand) {
    return switch (gradeBand) {
      // Explorer: Playful, bouncy animations
      AivoGradeBand.k5 => const _TransitionConfig(
          duration: Duration(milliseconds: 350),
          curve: Curves.easeOutBack,
          reverseCurve: Curves.easeInBack,
        ),
      // Navigator: Moderate animations
      AivoGradeBand.g6_8 => const _TransitionConfig(
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        ),
      // Scholar: Quick, subtle animations
      AivoGradeBand.g9_12 => const _TransitionConfig(
          duration: Duration(milliseconds: 250),
          curve: Curves.easeOut,
          reverseCurve: Curves.easeIn,
        ),
      // Default
      null => const _TransitionConfig(
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        ),
    };
  }
}

/// Custom page route with Aivo transitions.
class AivoPageRoute<T> extends PageRouteBuilder<T> {
  AivoPageRoute({
    required this.page,
    this.transitionType = AivoTransitionType.slideRight,
    this.gradeBand,
    super.settings,
    this.maintainState = true,
    this.fullscreenDialog = false,
  }) : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: _buildTransition(transitionType, gradeBand),
          transitionDuration: _TransitionConfig.forGradeBand(gradeBand).duration,
          reverseTransitionDuration:
              _TransitionConfig.forGradeBand(gradeBand).duration,
          maintainState: maintainState,
          fullscreenDialog: fullscreenDialog,
        );

  /// The page to display.
  final Widget page;

  /// Type of transition animation.
  final AivoTransitionType transitionType;

  /// Grade band for transition timing.
  final AivoGradeBand? gradeBand;

  @override
  final bool maintainState;

  @override
  final bool fullscreenDialog;

  static RouteTransitionsBuilder _buildTransition(
    AivoTransitionType type,
    AivoGradeBand? gradeBand,
  ) {
    final config = _TransitionConfig.forGradeBand(gradeBand);

    return (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(
        parent: animation,
        curve: config.curve,
        reverseCurve: config.reverseCurve,
      );

      return switch (type) {
        AivoTransitionType.fade => FadeTransition(
            opacity: curvedAnimation,
            child: child,
          ),
        AivoTransitionType.slideRight => SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(1.0, 0.0),
              end: Offset.zero,
            ).animate(curvedAnimation),
            child: child,
          ),
        AivoTransitionType.slideUp => SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.0, 1.0),
              end: Offset.zero,
            ).animate(curvedAnimation),
            child: child,
          ),
        AivoTransitionType.scale => ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.0).animate(curvedAnimation),
            child: FadeTransition(
              opacity: curvedAnimation,
              child: child,
            ),
          ),
        AivoTransitionType.sharedAxisHorizontal => _SharedAxisTransition(
            animation: curvedAnimation,
            secondaryAnimation: secondaryAnimation,
            axis: Axis.horizontal,
            child: child,
          ),
        AivoTransitionType.sharedAxisVertical => _SharedAxisTransition(
            animation: curvedAnimation,
            secondaryAnimation: secondaryAnimation,
            axis: Axis.vertical,
            child: child,
          ),
        AivoTransitionType.none => child,
      };
    };
  }
}

/// Shared axis transition for coordinated enter/exit.
class _SharedAxisTransition extends StatelessWidget {
  const _SharedAxisTransition({
    required this.animation,
    required this.secondaryAnimation,
    required this.axis,
    required this.child,
  });

  final Animation<double> animation;
  final Animation<double> secondaryAnimation;
  final Axis axis;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final enterOffset = axis == Axis.horizontal
        ? const Offset(0.3, 0.0)
        : const Offset(0.0, 0.3);

    final exitOffset = axis == Axis.horizontal
        ? const Offset(-0.3, 0.0)
        : const Offset(0.0, -0.3);

    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: enterOffset,
          end: Offset.zero,
        ).animate(animation),
        child: FadeTransition(
          opacity: Tween<double>(begin: 1.0, end: 0.5).animate(secondaryAnimation),
          child: SlideTransition(
            position: Tween<Offset>(
              begin: Offset.zero,
              end: exitOffset,
            ).animate(secondaryAnimation),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Modal page route with bottom sheet style transition.
class AivoModalRoute<T> extends PageRouteBuilder<T> {
  AivoModalRoute({
    required this.page,
    this.gradeBand,
    super.settings,
    this.barrierDismissible = true,
    this.barrierLabel,
  }) : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final config = _TransitionConfig.forGradeBand(gradeBand);
            final curvedAnimation = CurvedAnimation(
              parent: animation,
              curve: config.curve,
              reverseCurve: config.reverseCurve,
            );

            return SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, 1.0),
                end: Offset.zero,
              ).animate(curvedAnimation),
              child: child,
            );
          },
          transitionDuration: _TransitionConfig.forGradeBand(gradeBand).duration,
          reverseTransitionDuration:
              _TransitionConfig.forGradeBand(gradeBand).duration,
          barrierDismissible: barrierDismissible,
          barrierColor: Colors.black54,
          barrierLabel: barrierLabel,
          opaque: false,
        );

  final Widget page;
  final AivoGradeBand? gradeBand;

  @override
  final bool barrierDismissible;

  @override
  final String? barrierLabel;
}

/// Page transition theme for MaterialApp.
PageTransitionsTheme aivoPageTransitionsTheme({
  AivoGradeBand? gradeBand,
}) {
  final config = _TransitionConfig.forGradeBand(gradeBand);

  return PageTransitionsTheme(
    builders: {
      TargetPlatform.android: _AivoPageTransitionsBuilder(
        duration: config.duration,
        curve: config.curve,
      ),
      TargetPlatform.iOS: _AivoPageTransitionsBuilder(
        duration: config.duration,
        curve: config.curve,
      ),
      TargetPlatform.windows: _AivoPageTransitionsBuilder(
        duration: config.duration,
        curve: config.curve,
      ),
      TargetPlatform.macOS: _AivoPageTransitionsBuilder(
        duration: config.duration,
        curve: config.curve,
      ),
      TargetPlatform.linux: _AivoPageTransitionsBuilder(
        duration: config.duration,
        curve: config.curve,
      ),
    },
  );
}

class _AivoPageTransitionsBuilder extends PageTransitionsBuilder {
  const _AivoPageTransitionsBuilder({
    required this.duration,
    required this.curve,
  });

  final Duration duration;
  final Curve curve;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final curvedAnimation = CurvedAnimation(
      parent: animation,
      curve: curve,
    );

    // Use different transitions based on route type
    if (route.fullscreenDialog) {
      // Modal routes slide up
      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.0, 1.0),
          end: Offset.zero,
        ).animate(curvedAnimation),
        child: child,
      );
    }

    // Standard routes slide horizontally with fade
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0.3, 0.0),
        end: Offset.zero,
      ).animate(curvedAnimation),
      child: FadeTransition(
        opacity: curvedAnimation,
        child: child,
      ),
    );
  }
}

/// Extension for easy navigation with Aivo transitions.
extension AivoNavigatorExtension on NavigatorState {
  /// Push with Aivo transition.
  Future<T?> pushAivo<T extends Object?>(
    Widget page, {
    AivoTransitionType transition = AivoTransitionType.slideRight,
    AivoGradeBand? gradeBand,
    RouteSettings? settings,
  }) {
    return push(
      AivoPageRoute<T>(
        page: page,
        transitionType: transition,
        gradeBand: gradeBand,
        settings: settings,
      ),
    );
  }

  /// Push replacement with Aivo transition.
  Future<T?> pushReplacementAivo<T extends Object?, TO extends Object?>(
    Widget page, {
    AivoTransitionType transition = AivoTransitionType.fade,
    AivoGradeBand? gradeBand,
    RouteSettings? settings,
    TO? result,
  }) {
    return pushReplacement(
      AivoPageRoute<T>(
        page: page,
        transitionType: transition,
        gradeBand: gradeBand,
        settings: settings,
      ),
      result: result,
    );
  }

  /// Push modal with Aivo transition.
  Future<T?> pushModalAivo<T extends Object?>(
    Widget page, {
    AivoGradeBand? gradeBand,
    RouteSettings? settings,
    bool barrierDismissible = true,
  }) {
    return push(
      AivoModalRoute<T>(
        page: page,
        gradeBand: gradeBand,
        settings: settings,
        barrierDismissible: barrierDismissible,
      ),
    );
  }
}

/// Animated switcher with Aivo transitions.
class AivoAnimatedSwitcher extends StatelessWidget {
  const AivoAnimatedSwitcher({
    super.key,
    required this.child,
    this.gradeBand,
    this.transitionType = AivoTransitionType.fade,
    this.layoutBuilder,
  });

  /// Current child widget.
  final Widget child;

  /// Grade band for transition duration.
  final AivoGradeBand? gradeBand;

  /// Type of transition.
  final AivoTransitionType transitionType;

  /// Custom layout builder.
  final AnimatedSwitcherLayoutBuilder? layoutBuilder;

  @override
  Widget build(BuildContext context) {
    final config = _TransitionConfig.forGradeBand(gradeBand);

    return AnimatedSwitcher(
      duration: config.duration,
      switchInCurve: config.curve,
      switchOutCurve: config.reverseCurve,
      transitionBuilder: (child, animation) {
        return switch (transitionType) {
          AivoTransitionType.fade => FadeTransition(
              opacity: animation,
              child: child,
            ),
          AivoTransitionType.scale => ScaleTransition(
              scale: animation,
              child: FadeTransition(
                opacity: animation,
                child: child,
              ),
            ),
          AivoTransitionType.slideRight => SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.2, 0.0),
                end: Offset.zero,
              ).animate(animation),
              child: FadeTransition(
                opacity: animation,
                child: child,
              ),
            ),
          AivoTransitionType.slideUp => SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, 0.2),
                end: Offset.zero,
              ).animate(animation),
              child: FadeTransition(
                opacity: animation,
                child: child,
              ),
            ),
          _ => FadeTransition(
              opacity: animation,
              child: child,
            ),
        };
      },
      layoutBuilder: layoutBuilder ?? AnimatedSwitcher.defaultLayoutBuilder,
      child: child,
    );
  }
}

/// Hero transition wrapper with Aivo styling.
class AivoHero extends StatelessWidget {
  const AivoHero({
    super.key,
    required this.tag,
    required this.child,
    this.gradeBand,
    this.placeholderBuilder,
  });

  /// Hero tag for matching.
  final Object tag;

  /// Child widget.
  final Widget child;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Placeholder shown during flight.
  final HeroPlaceholderBuilder? placeholderBuilder;

  @override
  Widget build(BuildContext context) {
    return Hero(
      tag: tag,
      flightShuttleBuilder: (
        flightContext,
        animation,
        flightDirection,
        fromHeroContext,
        toHeroContext,
      ) {
        final config = _TransitionConfig.forGradeBand(gradeBand);
        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: config.curve,
        );

        return AnimatedBuilder(
          animation: curvedAnimation,
          builder: (context, child) {
            return Material(
              type: MaterialType.transparency,
              child: toHeroContext.widget,
            );
          },
        );
      },
      placeholderBuilder: placeholderBuilder,
      child: child,
    );
  }
}
