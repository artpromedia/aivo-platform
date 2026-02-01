/// High Contrast Theme Utilities
///
/// Provides high contrast color adjustments for accessibility.
/// Matches web `colorHighContrast` tokens from tokens.json.
library;

import 'package:flutter/material.dart';

import 'aivo_theme.dart';
import 'aivo_brand.dart';

// ══════════════════════════════════════════════════════════════════════════════
// HIGH CONTRAST COLOR TOKENS
// ══════════════════════════════════════════════════════════════════════════════

/// High contrast colors for Explorer (K-5) theme.
/// Matches web `gradeThemes.explorer.colorHighContrast`.
class ExplorerHighContrastColors {
  ExplorerHighContrastColors._();

  static const Color primary = Color(0xFF5B21B6);       // Darker purple
  static const Color background = Color(0xFFFFFFFF);    // Pure white
  static const Color surface = Color(0xFFFFFFFF);       // Pure white
  static const Color surfaceMuted = Color(0xFFF5F3FF);  // Very light purple
  static const Color textPrimary = Color(0xFF09090B);   // Near black
  static const Color textSecondary = Color(0xFF27272A); // Dark gray
  static const Color border = Color(0xFF5B21B6);        // Match primary
  static const Color focus = Color(0xFF1D4ED8);         // Strong blue
}

/// High contrast colors for Navigator (6-8) theme.
/// Matches web `gradeThemes.navigator.colorHighContrast`.
class NavigatorHighContrastColors {
  NavigatorHighContrastColors._();

  static const Color primary = Color(0xFF0E7490);       // Darker teal
  static const Color background = Color(0xFFFFFFFF);    // Pure white
  static const Color surface = Color(0xFFFFFFFF);       // Pure white
  static const Color surfaceMuted = Color(0xFFECFEFF);  // Very light cyan
  static const Color textPrimary = Color(0xFF09090B);   // Near black
  static const Color textSecondary = Color(0xFF27272A); // Dark gray
  static const Color border = Color(0xFF0E7490);        // Match primary
  static const Color focus = Color(0xFF1D4ED8);         // Strong blue
}

/// High contrast colors for Scholar (9-12) theme.
/// Matches web `gradeThemes.scholar.colorHighContrast`.
class ScholarHighContrastColors {
  ScholarHighContrastColors._();

  static const Color primary = Color(0xFF09090B);       // Near black
  static const Color background = Color(0xFFFFFFFF);    // Pure white
  static const Color surface = Color(0xFFFFFFFF);       // Pure white
  static const Color surfaceMuted = Color(0xFFF4F4F5);  // Light gray
  static const Color textPrimary = Color(0xFF09090B);   // Near black
  static const Color textSecondary = Color(0xFF27272A); // Dark gray
  static const Color border = Color(0xFF09090B);        // Match primary
  static const Color focus = Color(0xFF1D4ED8);         // Strong blue
}

// ══════════════════════════════════════════════════════════════════════════════
// HIGH CONTRAST ADJUSTMENTS
// ══════════════════════════════════════════════════════════════════════════════

/// Utility class for high contrast mode adjustments.
class HighContrastUtils {
  HighContrastUtils._();

  /// Minimum contrast ratio for WCAG AA compliance
  static const double wcagAAContrastRatio = 4.5;

  /// Minimum contrast ratio for WCAG AAA compliance
  static const double wcagAAAContrastRatio = 7.0;

  /// Border width multiplier for high contrast mode
  static const double borderWidthMultiplier = 2.0;

  /// Shadow opacity increase for high contrast mode
  static const double shadowOpacityIncrease = 0.3;

  /// Focus ring width for high contrast mode
  static const double focusRingWidth = 3.0;

  /// Calculate the contrast ratio between two colors
  static double contrastRatio(Color foreground, Color background) {
    final fLuminance = foreground.computeLuminance();
    final bLuminance = background.computeLuminance();
    final lighter = fLuminance > bLuminance ? fLuminance : bLuminance;
    final darker = fLuminance > bLuminance ? bLuminance : fLuminance;
    return (lighter + 0.05) / (darker + 0.05);
  }

  /// Check if colors meet WCAG AA contrast requirements
  static bool meetsWcagAA(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagAAContrastRatio;
  }

  /// Check if colors meet WCAG AAA contrast requirements
  static bool meetsWcagAAA(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagAAAContrastRatio;
  }

  /// Adjust a color for better contrast against a background
  static Color adjustForContrast(
    Color color,
    Color background, {
    double targetRatio = wcagAAContrastRatio,
  }) {
    if (contrastRatio(color, background) >= targetRatio) {
      return color;
    }

    // Determine if we should lighten or darken
    final bgLuminance = background.computeLuminance();
    final shouldDarken = bgLuminance > 0.5;

    Color adjusted = color;
    for (int i = 0; i < 10; i++) {
      if (shouldDarken) {
        adjusted = _darken(adjusted, 0.1);
      } else {
        adjusted = _lighten(adjusted, 0.1);
      }

      if (contrastRatio(adjusted, background) >= targetRatio) {
        return adjusted;
      }
    }

    // If we couldn't reach target, return black or white
    return shouldDarken ? Colors.black : Colors.white;
  }

  /// Darken a color by a percentage
  static Color _darken(Color color, double percent) {
    final hsl = HSLColor.fromColor(color);
    return hsl.withLightness((hsl.lightness - percent).clamp(0.0, 1.0)).toColor();
  }

  /// Lighten a color by a percentage
  static Color _lighten(Color color, double percent) {
    final hsl = HSLColor.fromColor(color);
    return hsl.withLightness((hsl.lightness + percent).clamp(0.0, 1.0)).toColor();
  }

  /// Get high contrast border
  static Border highContrastBorder({
    Color? color,
    double normalWidth = 1.0,
  }) {
    return Border.all(
      color: color ?? Colors.black,
      width: normalWidth * borderWidthMultiplier,
    );
  }

  /// Get high contrast box shadow
  static List<BoxShadow> highContrastShadow({
    Color color = Colors.black,
    double blurRadius = 8.0,
    Offset offset = const Offset(0, 4),
  }) {
    return [
      BoxShadow(
        color: color.withOpacity(0.3 + shadowOpacityIncrease),
        blurRadius: blurRadius,
        offset: offset,
      ),
    ];
  }

  /// Get high contrast focus decoration
  static BoxDecoration focusDecoration({
    Color focusColor = const Color(0xFF1D4ED8),
    double borderRadius = 8.0,
  }) {
    return BoxDecoration(
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: focusColor,
        width: focusRingWidth,
      ),
      boxShadow: [
        BoxShadow(
          color: focusColor.withOpacity(0.4),
          blurRadius: 0,
          spreadRadius: 2,
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME EXTENSION FOR HIGH CONTRAST
// ══════════════════════════════════════════════════════════════════════════════

/// Theme extension for high contrast settings
@immutable
class AivoHighContrastTheme extends ThemeExtension<AivoHighContrastTheme> {
  const AivoHighContrastTheme({
    this.isEnabled = false,
    this.borderWidth = 2.0,
    this.focusRingWidth = 3.0,
    this.focusColor = const Color(0xFF1D4ED8),
    this.shadowOpacity = 0.3,
  });

  final bool isEnabled;
  final double borderWidth;
  final double focusRingWidth;
  final Color focusColor;
  final double shadowOpacity;

  @override
  AivoHighContrastTheme copyWith({
    bool? isEnabled,
    double? borderWidth,
    double? focusRingWidth,
    Color? focusColor,
    double? shadowOpacity,
  }) {
    return AivoHighContrastTheme(
      isEnabled: isEnabled ?? this.isEnabled,
      borderWidth: borderWidth ?? this.borderWidth,
      focusRingWidth: focusRingWidth ?? this.focusRingWidth,
      focusColor: focusColor ?? this.focusColor,
      shadowOpacity: shadowOpacity ?? this.shadowOpacity,
    );
  }

  @override
  AivoHighContrastTheme lerp(AivoHighContrastTheme? other, double t) {
    if (other is! AivoHighContrastTheme) return this;
    return AivoHighContrastTheme(
      isEnabled: t < 0.5 ? isEnabled : other.isEnabled,
      borderWidth: lerpDouble(borderWidth, other.borderWidth, t) ?? borderWidth,
      focusRingWidth: lerpDouble(focusRingWidth, other.focusRingWidth, t) ?? focusRingWidth,
      focusColor: Color.lerp(focusColor, other.focusColor, t) ?? focusColor,
      shadowOpacity: lerpDouble(shadowOpacity, other.shadowOpacity, t) ?? shadowOpacity,
    );
  }

  static double? lerpDouble(double? a, double? b, double t) {
    if (a == null && b == null) return null;
    a ??= 0.0;
    b ??= 0.0;
    return a + (b - a) * t;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HIGH CONTRAST THEME BUILDER
// ══════════════════════════════════════════════════════════════════════════════

/// Build a high contrast version of a theme
ThemeData buildHighContrastTheme(
  ThemeData baseTheme,
  AivoGradeBand gradeBand,
) {
  // Get high contrast colors for the grade band
  final Color primary;
  final Color background;
  final Color surface;
  final Color textPrimary;
  final Color textSecondary;
  final Color border;
  final Color focus;

  switch (gradeBand) {
    case AivoGradeBand.k5:
      primary = ExplorerHighContrastColors.primary;
      background = ExplorerHighContrastColors.background;
      surface = ExplorerHighContrastColors.surface;
      textPrimary = ExplorerHighContrastColors.textPrimary;
      textSecondary = ExplorerHighContrastColors.textSecondary;
      border = ExplorerHighContrastColors.border;
      focus = ExplorerHighContrastColors.focus;
    case AivoGradeBand.g6_8:
      primary = NavigatorHighContrastColors.primary;
      background = NavigatorHighContrastColors.background;
      surface = NavigatorHighContrastColors.surface;
      textPrimary = NavigatorHighContrastColors.textPrimary;
      textSecondary = NavigatorHighContrastColors.textSecondary;
      border = NavigatorHighContrastColors.border;
      focus = NavigatorHighContrastColors.focus;
    case AivoGradeBand.g9_12:
      primary = ScholarHighContrastColors.primary;
      background = ScholarHighContrastColors.background;
      surface = ScholarHighContrastColors.surface;
      textPrimary = ScholarHighContrastColors.textPrimary;
      textSecondary = ScholarHighContrastColors.textSecondary;
      border = ScholarHighContrastColors.border;
      focus = ScholarHighContrastColors.focus;
  }

  // Get grade-specific radius values
  final double cardRadius;
  final double inputRadius;
  switch (gradeBand) {
    case AivoGradeBand.k5:
      cardRadius = AivoBrand.radiusExplorerCard;
      inputRadius = AivoBrand.radiusExplorerInput;
    case AivoGradeBand.g6_8:
      cardRadius = AivoBrand.radiusNavigatorCard;
      inputRadius = AivoBrand.radiusNavigatorInput;
    case AivoGradeBand.g9_12:
      cardRadius = AivoBrand.radiusScholarCard;
      inputRadius = AivoBrand.radiusScholarInput;
  }

  final colorScheme = baseTheme.colorScheme.copyWith(
    primary: primary,
    onPrimary: Colors.white,
    secondary: primary,
    onSecondary: Colors.white,
    surface: surface,
    onSurface: textPrimary,
    onSurfaceVariant: textSecondary,
    outline: border,
    outlineVariant: border.withOpacity(0.5),
  );

  return baseTheme.copyWith(
    colorScheme: colorScheme,
    scaffoldBackgroundColor: background,
    cardTheme: baseTheme.cardTheme.copyWith(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(cardRadius),
        side: BorderSide(
          color: border,
          width: HighContrastUtils.borderWidthMultiplier,
        ),
      ),
    ),
    inputDecorationTheme: baseTheme.inputDecorationTheme.copyWith(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(inputRadius),
        borderSide: BorderSide(
          color: border,
          width: HighContrastUtils.borderWidthMultiplier,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(inputRadius),
        borderSide: BorderSide(
          color: border,
          width: HighContrastUtils.borderWidthMultiplier,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(inputRadius),
        borderSide: BorderSide(
          color: focus,
          width: HighContrastUtils.focusRingWidth,
        ),
      ),
    ),
    dividerTheme: baseTheme.dividerTheme.copyWith(
      color: border,
      thickness: HighContrastUtils.borderWidthMultiplier,
    ),
    extensions: [
      ...baseTheme.extensions.values,
      const AivoHighContrastTheme(isEnabled: true),
    ],
  );
}

/// Get high contrast colors for a grade band
Map<String, Color> getHighContrastColors(AivoGradeBand gradeBand) {
  switch (gradeBand) {
    case AivoGradeBand.k5:
      return {
        'primary': ExplorerHighContrastColors.primary,
        'background': ExplorerHighContrastColors.background,
        'surface': ExplorerHighContrastColors.surface,
        'surfaceMuted': ExplorerHighContrastColors.surfaceMuted,
        'textPrimary': ExplorerHighContrastColors.textPrimary,
        'textSecondary': ExplorerHighContrastColors.textSecondary,
        'border': ExplorerHighContrastColors.border,
        'focus': ExplorerHighContrastColors.focus,
      };
    case AivoGradeBand.g6_8:
      return {
        'primary': NavigatorHighContrastColors.primary,
        'background': NavigatorHighContrastColors.background,
        'surface': NavigatorHighContrastColors.surface,
        'surfaceMuted': NavigatorHighContrastColors.surfaceMuted,
        'textPrimary': NavigatorHighContrastColors.textPrimary,
        'textSecondary': NavigatorHighContrastColors.textSecondary,
        'border': NavigatorHighContrastColors.border,
        'focus': NavigatorHighContrastColors.focus,
      };
    case AivoGradeBand.g9_12:
      return {
        'primary': ScholarHighContrastColors.primary,
        'background': ScholarHighContrastColors.background,
        'surface': ScholarHighContrastColors.surface,
        'surfaceMuted': ScholarHighContrastColors.surfaceMuted,
        'textPrimary': ScholarHighContrastColors.textPrimary,
        'textSecondary': ScholarHighContrastColors.textSecondary,
        'border': ScholarHighContrastColors.border,
        'focus': ScholarHighContrastColors.focus,
      };
  }
}
