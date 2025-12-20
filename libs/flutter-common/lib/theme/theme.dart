/// AIVO Theme System
///
/// This barrel file exports all theme-related utilities.
///
/// Usage:
/// ```dart
/// import 'package:flutter_common/theme/theme.dart';
/// ```
///
/// This gives you access to:
/// - `AivoBrand` - Design tokens (colors, spacing, shadows, etc.)
/// - `AivoColors` - Theme extension for runtime color access
/// - `AivoGradeBand` - Grade level enum (k5, g6_8, g9_12)
/// - `themeForBand()` - Get theme for a specific grade
/// - `aivoThemeK5`, `aivoThemeG6_8`, `aivoThemeG9_12` - Pre-built themes
/// - Theme extensions for BuildContext
/// - Gradient and shadow helpers

library aivo_theme;

export 'aivo_brand.dart';
export 'aivo_theme.dart';
export 'theme_extensions.dart';
