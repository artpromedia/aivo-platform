import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

enum AivoGradeBand { k5, g6_8, g9_12 }

class _AivoColors {
  const _AivoColors({
    required this.primary,
    required this.secondary,
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.textPrimary,
    required this.textSecondary,
    required this.error,
  });

  final Color primary;
  final Color secondary;
  final Color background;
  final Color surface;
  final Color surfaceMuted;
  final Color textPrimary;
  final Color textSecondary;
  final Color error;
}

class _AivoTypography {
  const _AivoTypography({
    required this.display,
    required this.headline,
    required this.title,
    required this.body,
    required this.label,
  });

  final double display;
  final double headline;
  final double title;
  final double body;
  final double label;
}

const _k5Colors = _AivoColors(
  primary: Color(0xFF2D6BFF),
  secondary: Color(0xFFFF9C32),
  background: Color(0xFFF8FBFF),
  surface: Colors.white,
  surfaceMuted: Color(0xFFEEF5FF),
  textPrimary: Color(0xFF102445),
  textSecondary: Color(0xFF3E5575),
  error: Color(0xFFE64B58),
);

const _g6_8Colors = _AivoColors(
  primary: Color(0xFF2F6AE6),
  secondary: Color(0xFF3FB4A5),
  background: Color(0xFFF6F8FC),
  surface: Colors.white,
  surfaceMuted: Color(0xFFEEF1F7),
  textPrimary: Color(0xFF15243B),
  textSecondary: Color(0xFF42526B),
  error: Color(0xFFD83A52),
);

const _g9_12Colors = _AivoColors(
  primary: Color(0xFF2648A6),
  secondary: Color(0xFF2E7D74),
  background: Color(0xFFF5F6F8),
  surface: Colors.white,
  surfaceMuted: Color(0xFFECEFF3),
  textPrimary: Color(0xFF0F172A),
  textSecondary: Color(0xFF3C4A67),
  error: Color(0xFFCC3D4A),
);

const _k5Type = _AivoTypography(
  display: 36,
  headline: 30,
  title: 24,
  body: 18,
  label: 14,
);
const _g6_8Type = _AivoTypography(
  display: 34,
  headline: 28,
  title: 22,
  body: 17,
  label: 14,
);
const _g9_12Type = _AivoTypography(
  display: 32,
  headline: 26,
  title: 20,
  body: 16,
  label: 13,
);

TextTheme _buildTextTheme(_AivoTypography type) {
  final base = GoogleFonts.interTextTheme();
  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(fontSize: type.display, fontWeight: FontWeight.w700),
    headlineMedium: base.headlineMedium?.copyWith(fontSize: type.headline, fontWeight: FontWeight.w700),
    titleLarge: base.titleLarge?.copyWith(fontSize: type.title, fontWeight: FontWeight.w700),
    bodyLarge: base.bodyLarge?.copyWith(fontSize: type.body, fontWeight: FontWeight.w500),
    labelLarge: base.labelLarge?.copyWith(fontSize: type.label, fontWeight: FontWeight.w600),
  );
}

ThemeData _buildTheme({required _AivoColors colors, required _AivoTypography type}) {
  final textTheme = _buildTextTheme(type);
  final colorScheme = ColorScheme.light(
    primary: colors.primary,
    secondary: colors.secondary,
    surface: colors.surface,
    error: colors.error,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onSurface: colors.textPrimary,
    onError: Colors.white,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: colors.background,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: colors.surface,
      foregroundColor: colors.textPrimary,
      centerTitle: true,
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: colors.surface,
      elevation: 1,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      surfaceTintColor: colors.surfaceMuted,
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      backgroundColor: colors.surfaceMuted,
      selectedColor: colors.primary.withOpacity(0.15),
      labelStyle: TextStyle(color: colors.textSecondary, fontWeight: FontWeight.w600),
      secondaryLabelStyle: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w700),
      secondarySelectedColor: colors.primary.withOpacity(0.2),
      disabledColor: colors.surfaceMuted.withOpacity(0.6),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    ),
  );
}

final ThemeData aivoThemeK5 = _buildTheme(colors: _k5Colors, type: _k5Type);
final ThemeData aivoThemeG6_8 = _buildTheme(colors: _g6_8Colors, type: _g6_8Type);
final ThemeData aivoThemeG9_12 = _buildTheme(colors: _g9_12Colors, type: _g9_12Type);

ThemeData themeForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return aivoThemeK5;
    case AivoGradeBand.g6_8:
      return aivoThemeG6_8;
    case AivoGradeBand.g9_12:
      return aivoThemeG9_12;
  }
}

// Future codegen: map token JSON -> Dart so this stays in sync with design tokens.
// A build_runner step could read libs/design-tokens/aivo-tokens.json and emit a Dart map
// consumed here to avoid manual duplication.
