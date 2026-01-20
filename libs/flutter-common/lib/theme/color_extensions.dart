import 'package:flutter/material.dart';

// ══════════════════════════════════════════════════════════════════════════════
// COLOR SHADES EXTENSION
//
// Provides shade variants (100-900) for any Color, similar to MaterialColor.
// Uses HSL color manipulation for consistent, accessible shade generation.
//
// Usage:
//   final color = Colors.blue;
//   final lightShade = color.shade100;
//   final darkShade = color.shade900;
// ══════════════════════════════════════════════════════════════════════════════

/// Extension on [Color] to provide Material Design shade variants.
///
/// This allows any `Color` to be used like a `MaterialColor` with shade
/// accessors (shade50, shade100, ..., shade900).
///
/// The shades are computed using HSL color manipulation:
/// - shade50-400: Lighter variants (higher lightness)
/// - shade500: Base color
/// - shade600-900: Darker variants (lower lightness)
///
/// Example:
/// ```dart
/// final baseColor = Color(0xFF10B981); // mint green
/// final lightMint = baseColor.shade100; // very light mint
/// final darkMint = baseColor.shade900; // very dark mint
/// ```
extension ColorShades on Color {
  /// Generates a shade variant of this color.
  ///
  /// [shade] should be between 50 and 900 (following Material Design scale).
  /// Values outside this range will be clamped.
  Color _shadeFor(int shade) {
    // Convert to HSL for better lightness manipulation
    final hsl = HSLColor.fromColor(this);

    // Map shade to lightness value
    // shade 50 = 0.95 lightness (very light)
    // shade 500 = original lightness (base)
    // shade 900 = 0.10 lightness (very dark)
    final double targetLightness;

    if (shade <= 50) {
      targetLightness = 0.95;
    } else if (shade >= 900) {
      targetLightness = 0.10 + (hsl.lightness * 0.15); // Keep some base hue visibility
    } else if (shade < 500) {
      // Lighter shades (50-400): interpolate from 0.95 to base lightness
      final t = (shade - 50) / 450; // 0.0 to 1.0
      targetLightness = 0.95 - (t * (0.95 - hsl.lightness));
    } else {
      // Darker shades (500-900): interpolate from base lightness to 0.10
      final t = (shade - 500) / 400; // 0.0 to 1.0
      final darkTarget = 0.10 + (hsl.lightness * 0.15);
      targetLightness = hsl.lightness - (t * (hsl.lightness - darkTarget));
    }

    // Also adjust saturation slightly for darker shades to maintain vibrancy
    final double targetSaturation;
    if (shade >= 600) {
      // Slightly increase saturation for darker shades
      targetSaturation = (hsl.saturation * 1.1).clamp(0.0, 1.0);
    } else if (shade <= 200) {
      // Slightly decrease saturation for very light shades
      targetSaturation = hsl.saturation * 0.8;
    } else {
      targetSaturation = hsl.saturation;
    }

    return hsl
        .withLightness(targetLightness.clamp(0.0, 1.0))
        .withSaturation(targetSaturation)
        .toColor();
  }

  /// Very light shade (95% lightness).
  Color get shade50 => _shadeFor(50);

  /// Extra light shade (90% lightness).
  Color get shade100 => _shadeFor(100);

  /// Light shade (80% lightness).
  Color get shade200 => _shadeFor(200);

  /// Light-medium shade (70% lightness).
  Color get shade300 => _shadeFor(300);

  /// Medium-light shade (60% lightness).
  Color get shade400 => _shadeFor(400);

  /// Base shade (original color).
  Color get shade500 => this;

  /// Medium-dark shade.
  Color get shade600 => _shadeFor(600);

  /// Dark shade.
  Color get shade700 => _shadeFor(700);

  /// Extra dark shade.
  Color get shade800 => _shadeFor(800);

  /// Very dark shade (10% lightness).
  Color get shade900 => _shadeFor(900);

  /// Convenience getter to access shade by index (50, 100, 200, ..., 900).
  ///
  /// Throws [ArgumentError] if shade value is not valid.
  Color shade(int value) {
    switch (value) {
      case 50:
        return shade50;
      case 100:
        return shade100;
      case 200:
        return shade200;
      case 300:
        return shade300;
      case 400:
        return shade400;
      case 500:
        return shade500;
      case 600:
        return shade600;
      case 700:
        return shade700;
      case 800:
        return shade800;
      case 900:
        return shade900;
      default:
        throw ArgumentError(
          'Invalid shade value: $value. Valid values are: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900',
        );
    }
  }

  /// Creates a [MaterialColor] swatch from this color.
  ///
  /// Useful when you need a full MaterialColor but only have a single Color.
  MaterialColor toMaterialColor() {
    return MaterialColor(value, <int, Color>{
      50: shade50,
      100: shade100,
      200: shade200,
      300: shade300,
      400: shade400,
      500: shade500,
      600: shade600,
      700: shade700,
      800: shade800,
      900: shade900,
    });
  }

  /// Returns a color that contrasts well with this color for text/icons.
  ///
  /// Returns white for dark colors, and a dark gray for light colors.
  Color get contrastColor {
    return computeLuminance() > 0.5
        ? const Color(0xFF18181B) // gray.900
        : Colors.white;
  }
}
