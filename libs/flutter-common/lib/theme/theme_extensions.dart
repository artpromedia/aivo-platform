import 'package:flutter/material.dart';

import 'aivo_brand.dart';
import 'aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// STATUS ENUM
// ══════════════════════════════════════════════════════════════════════════════

/// Status types for semantic color selection.
enum Status {
  success,
  warning,
  error,
  info,
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD CONTEXT EXTENSION
// Easy access to theme properties
// ══════════════════════════════════════════════════════════════════════════════

/// Extension on [BuildContext] for easy access to AIVO theme properties.
///
/// Usage:
/// ```dart
/// final colors = context.aivoColors;
/// final primary = context.colorScheme.primary;
/// final headline = context.textTheme.headlineMedium;
/// ```
extension AivoThemeExtension on BuildContext {
  /// Get the current AIVO color palette.
  ///
  /// Returns the [AivoColors] theme extension.
  /// Throws if the extension is not found in the current theme.
  AivoColors get aivoColors => Theme.of(this).extension<AivoColors>()!;

  /// Try to get the current AIVO color palette.
  ///
  /// Returns null if the extension is not found.
  AivoColors? get maybeAivoColors => Theme.of(this).extension<AivoColors>();

  /// Get the current color scheme.
  ColorScheme get colorScheme => Theme.of(this).colorScheme;

  /// Get the current text theme.
  TextTheme get textTheme => Theme.of(this).textTheme;

  /// Get the current theme data.
  ThemeData get theme => Theme.of(this);

  /// Check if the current theme is dark mode.
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  /// Check if the current theme is light mode.
  bool get isLightMode => Theme.of(this).brightness == Brightness.light;

  /// Get the current brightness.
  Brightness get brightness => Theme.of(this).brightness;

  /// Get the media query data.
  MediaQueryData get mediaQuery => MediaQuery.of(this);

  /// Get the screen size.
  Size get screenSize => MediaQuery.sizeOf(this);

  /// Get the screen width.
  double get screenWidth => MediaQuery.sizeOf(this).width;

  /// Get the screen height.
  double get screenHeight => MediaQuery.sizeOf(this).height;

  /// Check if the device is in compact width (mobile).
  bool get isCompactWidth => screenWidth < AivoBrand.breakpointMd;

  /// Check if the device is in medium width (tablet).
  bool get isMediumWidth =>
      screenWidth >= AivoBrand.breakpointMd &&
      screenWidth < AivoBrand.breakpointLg;

  /// Check if the device is in expanded width (desktop).
  bool get isExpandedWidth => screenWidth >= AivoBrand.breakpointLg;
}

// ══════════════════════════════════════════════════════════════════════════════
// AIVO COLORS SEMANTIC EXTENSION
// Helpers for semantic color usage
// ══════════════════════════════════════════════════════════════════════════════

/// Extension on [AivoColors] for semantic color helpers.
extension AivoColorsSemanticExtension on AivoColors {
  /// Get color for a given status.
  ///
  /// Usage:
  /// ```dart
  /// final color = context.aivoColors.colorForStatus(Status.success);
  /// ```
  Color colorForStatus(Status status) {
    switch (status) {
      case Status.success:
        return success;
      case Status.warning:
        return warning;
      case Status.error:
        return error;
      case Status.info:
        return info;
    }
  }

  /// Get container color (10% opacity) for a given color.
  ///
  /// Useful for creating subtle backgrounds.
  Color containerFor(Color color) => color.withOpacity(0.1);

  /// Get hover color (8% opacity) for a given color.
  Color hoverFor(Color color) => color.withOpacity(0.08);

  /// Get pressed color (15% opacity) for a given color.
  Color pressedFor(Color color) => color.withOpacity(0.15);

  /// Get disabled color (38% opacity) for a given color.
  Color disabledFor(Color color) => color.withOpacity(0.38);

  /// Get on-color (text color) for a background color.
  ///
  /// Returns white for dark backgrounds, textPrimary for light backgrounds.
  Color onColorFor(Color backgroundColor) {
    return backgroundColor.computeLuminance() > 0.5
        ? textPrimary
        : Colors.white;
  }

  /// Get a lighter variant of the primary color.
  Color get primaryLight => Color.lerp(primary, Colors.white, 0.3)!;

  /// Get a darker variant of the primary color.
  Color get primaryDark => Color.lerp(primary, Colors.black, 0.2)!;

  /// Get a lighter variant of the secondary color.
  Color get secondaryLight => Color.lerp(secondary, Colors.white, 0.3)!;

  /// Get a darker variant of the secondary color.
  Color get secondaryDark => Color.lerp(secondary, Colors.black, 0.2)!;
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADIENT BUILDERS
// Pre-configured gradients using brand colors
// ══════════════════════════════════════════════════════════════════════════════

/// Pre-configured gradient builders using AIVO brand colors.
///
/// Usage:
/// ```dart
/// Container(
///   decoration: BoxDecoration(
///     gradient: AivoGradients.primary(),
///   ),
/// )
/// ```
class AivoGradients {
  AivoGradients._();

  /// Primary brand gradient (violet 500 → violet 700).
  static LinearGradient primary({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.primary[500]!, AivoBrand.primary[700]!],
      );

  /// CTA gradient (coral → salmon → violet).
  static LinearGradient cta({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [
          AivoBrand.coral[500]!,
          AivoBrand.salmon[500]!,
          AivoBrand.primary[500]!,
        ],
      );

  /// Coral gradient (coral 500 → coral 600).
  static LinearGradient coral({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.coral[500]!, AivoBrand.coral[600]!],
      );

  /// Success gradient (mint 500 → mint 600).
  static LinearGradient success({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.mint[500]!, AivoBrand.mint[600]!],
      );

  /// Warning gradient (sunshine 400 → sunshine 500).
  static LinearGradient warning({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.sunshine[400]!, AivoBrand.sunshine[500]!],
      );

  /// Info gradient (sky 500 → sky 600).
  static LinearGradient info({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.sky[500]!, AivoBrand.sky[600]!],
      );

  /// Error gradient (error 500 → error 600).
  static LinearGradient error({
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.error[500]!, AivoBrand.error[600]!],
      );

  /// Hero background gradient (primary tint → white).
  static LinearGradient hero({
    AlignmentGeometry begin = Alignment.topCenter,
    AlignmentGeometry end = Alignment.bottomCenter,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.primary[50]!, Colors.white],
      );

  /// Streak fire gradient (coral → sunshine) for gamification.
  static LinearGradient streakFire({
    AlignmentGeometry begin = Alignment.bottomCenter,
    AlignmentGeometry end = Alignment.topCenter,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.coral[500]!, AivoBrand.sunshine[400]!],
      );

  /// XP progress gradient (mint) for gamification.
  static LinearGradient xpProgress({
    AlignmentGeometry begin = Alignment.centerLeft,
    AlignmentGeometry end = Alignment.centerRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: [AivoBrand.mint[500]!, AivoBrand.mint[600]!],
      );

  /// Custom gradient with any two colors.
  static LinearGradient custom({
    required Color start,
    required Color end,
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry endAlignment = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: endAlignment,
        colors: [start, end],
      );

  /// Custom gradient with multiple colors.
  static LinearGradient multiColor({
    required List<Color> colors,
    List<double>? stops,
    AlignmentGeometry begin = Alignment.topLeft,
    AlignmentGeometry end = Alignment.bottomRight,
  }) =>
      LinearGradient(
        begin: begin,
        end: end,
        colors: colors,
        stops: stops,
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHADOW HELPERS
// Easy access to shadow definitions
// ══════════════════════════════════════════════════════════════════════════════

/// Shadow helpers using AIVO brand shadow definitions.
///
/// Usage:
/// ```dart
/// Container(
///   decoration: BoxDecoration(
///     boxShadow: AivoShadows.elevation(2),
///   ),
/// )
/// ```
class AivoShadows {
  AivoShadows._();

  /// Get shadow for a given elevation level (1-5).
  ///
  /// - Level 1: Small shadow (sm)
  /// - Level 2: Default shadow
  /// - Level 3: Medium shadow (md)
  /// - Level 4: Large shadow (lg)
  /// - Level 5+: Extra large shadow (xl)
  static List<BoxShadow> elevation(int level) {
    switch (level) {
      case 0:
        return const [];
      case 1:
        return AivoBrand.shadowSm;
      case 2:
        return AivoBrand.shadow;
      case 3:
        return AivoBrand.shadowMd;
      case 4:
        return AivoBrand.shadowLg;
      default:
        return AivoBrand.shadowXl;
    }
  }

  /// No shadow.
  static List<BoxShadow> get none => const [];

  /// Small shadow.
  static List<BoxShadow> get sm => AivoBrand.shadowSm;

  /// Default shadow.
  static List<BoxShadow> get md => AivoBrand.shadow;

  /// Medium shadow.
  static List<BoxShadow> get lg => AivoBrand.shadowMd;

  /// Large shadow.
  static List<BoxShadow> get xl => AivoBrand.shadowLg;

  /// Extra large shadow.
  static List<BoxShadow> get xxl => AivoBrand.shadowXl;

  /// Primary colored shadow for elevated primary buttons.
  static List<BoxShadow> get primary => AivoBrand.shadowPrimary;

  /// Coral colored shadow for CTA buttons.
  static List<BoxShadow> get coral => AivoBrand.shadowCoral;

  /// Create a colored shadow.
  ///
  /// Useful for creating branded shadow effects.
  static List<BoxShadow> colored(
    Color color, {
    double opacity = 0.25,
    double blurRadius = 24,
    Offset offset = const Offset(0, 8),
  }) =>
      [
        BoxShadow(
          color: color.withOpacity(opacity),
          blurRadius: blurRadius,
          offset: offset,
        ),
      ];

  /// Create a soft shadow with the given color.
  static List<BoxShadow> soft(Color color) => colored(
        color,
        opacity: 0.15,
        blurRadius: 16,
        offset: const Offset(0, 4),
      );

  /// Create an intense shadow with the given color.
  static List<BoxShadow> intense(Color color) => colored(
        color,
        opacity: 0.4,
        blurRadius: 32,
        offset: const Offset(0, 12),
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// SPACING HELPERS
// Pre-configured spacing widgets
// ══════════════════════════════════════════════════════════════════════════════

/// Spacing helpers using AIVO brand spacing scale.
///
/// Usage:
/// ```dart
/// Column(
///   children: [
///     Text('Hello'),
///     AivoSpacing.md,
///     Text('World'),
///   ],
/// )
/// ```
class AivoSpacing {
  AivoSpacing._();

  /// Extra small spacing (4px).
  static const SizedBox xs = SizedBox(height: 4, width: 4);

  /// Small spacing (8px).
  static const SizedBox sm = SizedBox(height: 8, width: 8);

  /// Medium spacing (12px).
  static const SizedBox md = SizedBox(height: 12, width: 12);

  /// Large spacing (16px).
  static const SizedBox lg = SizedBox(height: 16, width: 16);

  /// Extra large spacing (24px).
  static const SizedBox xl = SizedBox(height: 24, width: 24);

  /// Extra extra large spacing (32px).
  static const SizedBox xxl = SizedBox(height: 32, width: 32);

  /// Extra extra extra large spacing (48px).
  static const SizedBox xxxl = SizedBox(height: 48, width: 48);

  /// Create vertical spacing with custom height.
  static SizedBox vertical(double height) => SizedBox(height: height);

  /// Create horizontal spacing with custom width.
  static SizedBox horizontal(double width) => SizedBox(width: width);

  /// Vertical extra small spacing (4px).
  static const SizedBox verticalXs = SizedBox(height: 4);

  /// Vertical small spacing (8px).
  static const SizedBox verticalSm = SizedBox(height: 8);

  /// Vertical medium spacing (12px).
  static const SizedBox verticalMd = SizedBox(height: 12);

  /// Vertical large spacing (16px).
  static const SizedBox verticalLg = SizedBox(height: 16);

  /// Vertical extra large spacing (24px).
  static const SizedBox verticalXl = SizedBox(height: 24);

  /// Vertical extra extra large spacing (32px).
  static const SizedBox verticalXxl = SizedBox(height: 32);

  /// Horizontal extra small spacing (4px).
  static const SizedBox horizontalXs = SizedBox(width: 4);

  /// Horizontal small spacing (8px).
  static const SizedBox horizontalSm = SizedBox(width: 8);

  /// Horizontal medium spacing (12px).
  static const SizedBox horizontalMd = SizedBox(width: 12);

  /// Horizontal large spacing (16px).
  static const SizedBox horizontalLg = SizedBox(width: 16);

  /// Horizontal extra large spacing (24px).
  static const SizedBox horizontalXl = SizedBox(width: 24);

  /// Horizontal extra extra large spacing (32px).
  static const SizedBox horizontalXxl = SizedBox(width: 32);
}

// ══════════════════════════════════════════════════════════════════════════════
// PADDING HELPERS
// Pre-configured padding values
// ══════════════════════════════════════════════════════════════════════════════

/// Padding helpers using AIVO brand spacing scale.
///
/// Usage:
/// ```dart
/// Padding(
///   padding: AivoPadding.all.md,
///   child: Text('Hello'),
/// )
/// ```
class AivoPadding {
  AivoPadding._();

  /// All sides padding.
  static const _AllPadding all = _AllPadding();

  /// Horizontal padding.
  static const _HorizontalPadding horizontal = _HorizontalPadding();

  /// Vertical padding.
  static const _VerticalPadding vertical = _VerticalPadding();

  /// Symmetric padding.
  static EdgeInsets symmetric({double? horizontal, double? vertical}) =>
      EdgeInsets.symmetric(
        horizontal: horizontal ?? 0,
        vertical: vertical ?? 0,
      );
}

class _AllPadding {
  const _AllPadding();

  EdgeInsets get xs => const EdgeInsets.all(4);
  EdgeInsets get sm => const EdgeInsets.all(8);
  EdgeInsets get md => const EdgeInsets.all(12);
  EdgeInsets get lg => const EdgeInsets.all(16);
  EdgeInsets get xl => const EdgeInsets.all(24);
  EdgeInsets get xxl => const EdgeInsets.all(32);
}

class _HorizontalPadding {
  const _HorizontalPadding();

  EdgeInsets get xs => const EdgeInsets.symmetric(horizontal: 4);
  EdgeInsets get sm => const EdgeInsets.symmetric(horizontal: 8);
  EdgeInsets get md => const EdgeInsets.symmetric(horizontal: 12);
  EdgeInsets get lg => const EdgeInsets.symmetric(horizontal: 16);
  EdgeInsets get xl => const EdgeInsets.symmetric(horizontal: 24);
  EdgeInsets get xxl => const EdgeInsets.symmetric(horizontal: 32);
}

class _VerticalPadding {
  const _VerticalPadding();

  EdgeInsets get xs => const EdgeInsets.symmetric(vertical: 4);
  EdgeInsets get sm => const EdgeInsets.symmetric(vertical: 8);
  EdgeInsets get md => const EdgeInsets.symmetric(vertical: 12);
  EdgeInsets get lg => const EdgeInsets.symmetric(vertical: 16);
  EdgeInsets get xl => const EdgeInsets.symmetric(vertical: 24);
  EdgeInsets get xxl => const EdgeInsets.symmetric(vertical: 32);
}

// ══════════════════════════════════════════════════════════════════════════════
// BORDER RADIUS HELPERS
// Pre-configured border radius values
// ══════════════════════════════════════════════════════════════════════════════

/// Border radius helpers using AIVO brand radius scale.
///
/// Usage:
/// ```dart
/// Container(
///   decoration: BoxDecoration(
///     borderRadius: AivoBorderRadius.md,
///   ),
/// )
/// ```
class AivoBorderRadius {
  AivoBorderRadius._();

  /// No border radius.
  static BorderRadius get none => BorderRadius.zero;

  /// Small border radius (8px).
  static BorderRadius get sm => AivoBrand.borderRadiusSm;

  /// Default border radius (12px).
  static BorderRadius get md => AivoBrand.borderRadius;

  /// Medium border radius (16px).
  static BorderRadius get lg => AivoBrand.borderRadiusMd;

  /// Large border radius (20px).
  static BorderRadius get xl => AivoBrand.borderRadiusLg;

  /// Extra large border radius (24px).
  static BorderRadius get xxl => AivoBrand.borderRadiusXl;

  /// Extra extra large border radius (32px).
  static BorderRadius get xxxl => AivoBrand.borderRadius2Xl;

  /// Full/circular border radius.
  static BorderRadius circular(double radius) =>
      BorderRadius.all(Radius.circular(radius));

  /// Top only border radius.
  static BorderRadius top(double radius) => BorderRadius.vertical(
        top: Radius.circular(radius),
      );

  /// Bottom only border radius.
  static BorderRadius bottom(double radius) => BorderRadius.vertical(
        bottom: Radius.circular(radius),
      );

  /// Left only border radius.
  static BorderRadius left(double radius) => BorderRadius.horizontal(
        left: Radius.circular(radius),
      );

  /// Right only border radius.
  static BorderRadius right(double radius) => BorderRadius.horizontal(
        right: Radius.circular(radius),
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// DURATION HELPERS
// Animation duration presets
// ══════════════════════════════════════════════════════════════════════════════

/// Animation duration helpers.
///
/// Usage:
/// ```dart
/// AnimatedContainer(
///   duration: AivoDuration.normal,
///   // ...
/// )
/// ```
class AivoDuration {
  AivoDuration._();

  /// Fast duration (150ms).
  static Duration get fast => AivoBrand.durationFast;

  /// Normal duration (300ms).
  static Duration get normal => AivoBrand.durationNormal;

  /// Slow duration (500ms).
  static Duration get slow => AivoBrand.durationSlow;

  /// Instant (0ms).
  static Duration get instant => Duration.zero;

  /// Custom duration in milliseconds.
  static Duration ms(int milliseconds) => Duration(milliseconds: milliseconds);
}

// ══════════════════════════════════════════════════════════════════════════════
// CURVE HELPERS
// Animation curve presets
// ══════════════════════════════════════════════════════════════════════════════

/// Animation curve helpers.
///
/// Usage:
/// ```dart
/// AnimatedContainer(
///   curve: AivoCurve.emphasized,
///   // ...
/// )
/// ```
class AivoCurve {
  AivoCurve._();

  /// Default ease-in-out curve.
  static Curve get standard => AivoBrand.curveDefault;

  /// Emphasized ease-out curve.
  static Curve get emphasized => AivoBrand.curveEmphasized;

  /// Spring/elastic curve.
  static Curve get spring => AivoBrand.curveSpring;

  /// Linear curve.
  static Curve get linear => Curves.linear;

  /// Ease in curve.
  static Curve get easeIn => Curves.easeIn;

  /// Ease out curve.
  static Curve get easeOut => Curves.easeOut;

  /// Ease in-out curve.
  static Curve get easeInOut => Curves.easeInOut;

  /// Decelerate curve.
  static Curve get decelerate => Curves.decelerate;

  /// Bounce curve.
  static Curve get bounce => Curves.bounceOut;
}
