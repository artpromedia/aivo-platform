/// RTL support utilities for AIVO Flutter apps
library;

import 'package:flutter/widgets.dart';
import 'types.dart';
import 'i18n.dart';
import 'constants.dart';

/// RTL support utilities
class RtlUtils {
  RtlUtils._();

  /// Check if locale is RTL
  static bool isRTL(SupportedLocale locale) {
    return rtlLocales.contains(locale);
  }

  /// Check if current locale is RTL
  static bool get isCurrentRTL => i18n.isRTL;

  /// Get text direction for locale
  static TextDirection getDirection(SupportedLocale? locale) {
    final loc = locale ?? i18n.currentLocale;
    return isRTL(loc) ? TextDirection.rtl : TextDirection.ltr;
  }

  /// Get start alignment based on direction
  static AlignmentDirectional get start => AlignmentDirectional.centerStart;

  /// Get end alignment based on direction
  static AlignmentDirectional get end => AlignmentDirectional.centerEnd;

  /// Flip value for RTL (useful for icons/animations)
  static double flipForRtl(double value, {SupportedLocale? locale}) {
    final loc = locale ?? i18n.currentLocale;
    return isRTL(loc) ? -value : value;
  }

  /// Get horizontal padding based on direction
  static EdgeInsetsDirectional horizontalPadding({
    double start = 0,
    double end = 0,
  }) {
    return EdgeInsetsDirectional.only(start: start, end: end);
  }

  /// Get directional edge insets
  static EdgeInsetsDirectional directionalInsets({
    double start = 0,
    double end = 0,
    double top = 0,
    double bottom = 0,
  }) {
    return EdgeInsetsDirectional.only(
      start: start,
      end: end,
      top: top,
      bottom: bottom,
    );
  }
}

/// Widget that flips its child for RTL
class FlipForRtl extends StatelessWidget {
  const FlipForRtl({
    super.key,
    required this.child,
    this.flip = true,
  });

  final Widget child;
  final bool flip;

  @override
  Widget build(BuildContext context) {
    if (!flip || !i18n.isRTL) {
      return child;
    }

    return Transform.scale(
      scaleX: -1,
      child: child,
    );
  }
}

/// Widget that conditionally renders based on text direction
class DirectionalBuilder extends StatelessWidget {
  const DirectionalBuilder({
    super.key,
    required this.ltr,
    required this.rtl,
  });

  final Widget ltr;
  final Widget rtl;

  @override
  Widget build(BuildContext context) {
    return i18n.isRTL ? rtl : ltr;
  }
}

/// Extension on BuildContext for RTL utilities
extension RtlContextExtension on BuildContext {
  /// Check if current context is RTL
  bool get isRtl {
    final direction = Directionality.maybeOf(this);
    return direction == TextDirection.rtl;
  }

  /// Get start side margin
  EdgeInsetsDirectional startMargin(double value) {
    return EdgeInsetsDirectional.only(start: value);
  }

  /// Get end side margin
  EdgeInsetsDirectional endMargin(double value) {
    return EdgeInsetsDirectional.only(end: value);
  }

  /// Get horizontal directional margin
  EdgeInsetsDirectional horizontalMargin({double start = 0, double end = 0}) {
    return EdgeInsetsDirectional.only(start: start, end: end);
  }
}

/// Extension on Widget for RTL support
extension RtlWidgetExtension on Widget {
  /// Flip widget for RTL
  Widget flipForRtl({bool flip = true}) {
    return FlipForRtl(flip: flip, child: this);
  }

  /// Add directional padding
  Widget withDirectionalPadding({
    double start = 0,
    double end = 0,
    double top = 0,
    double bottom = 0,
  }) {
    return Padding(
      padding: EdgeInsetsDirectional.only(
        start: start,
        end: end,
        top: top,
        bottom: bottom,
      ),
      child: this,
    );
  }

  /// Add directional margin
  Widget withDirectionalMargin({
    double start = 0,
    double end = 0,
    double top = 0,
    double bottom = 0,
  }) {
    return Container(
      margin: EdgeInsetsDirectional.only(
        start: start,
        end: end,
        top: top,
        bottom: bottom,
      ),
      child: this,
    );
  }
}
