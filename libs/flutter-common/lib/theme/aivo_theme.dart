import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'aivo_brand.dart';

// ══════════════════════════════════════════════════════════════════════════════
// AIVO BRAND COLORS - Re-exports from aivo_brand.dart
// Source: apps/web-marketing/tailwind.config.cjs
// ══════════════════════════════════════════════════════════════════════════════

/// Brand color palette aligned with AIVO marketing website.
///
/// These colors reference the single source of truth in [AivoBrand].
/// See: apps/web-marketing/tailwind.config.cjs for web equivalents.
abstract class AivoBrandColors {
  // ----------------------------------------
  // PRIMARY BRAND COLOR (Violet/Purple)
  // ----------------------------------------
  static Color get primary50 => AivoBrand.primary[50]!;
  static Color get primary100 => AivoBrand.primary[100]!;
  static Color get primary200 => AivoBrand.primary[200]!;
  static Color get primary300 => AivoBrand.primary[300]!;
  static Color get primary400 => AivoBrand.primary[400]!;
  static Color get primary500 => AivoBrand.primary[500]!;
  static Color get primary600 => AivoBrand.primary[600]!;
  static Color get primary700 => AivoBrand.primary[700]!;
  static Color get primary800 => AivoBrand.primary[800]!;
  static Color get primary900 => AivoBrand.primary[900]!;
  static Color get primary => AivoBrand.primary;

  // ----------------------------------------
  // SECONDARY/CTA COLOR (Coral)
  // ----------------------------------------
  static Color get coral50 => AivoBrand.coral[50]!;
  static Color get coral100 => AivoBrand.coral[100]!;
  static Color get coral200 => AivoBrand.coral[200]!;
  static Color get coral300 => AivoBrand.coral[300]!;
  static Color get coral400 => AivoBrand.coral[400]!;
  static Color get coral500 => AivoBrand.coral[500]!;
  static Color get coral600 => AivoBrand.coral[600]!;
  static Color get coral700 => AivoBrand.coral[700]!;
  static Color get coral800 => AivoBrand.coral[800]!;
  static Color get coral900 => AivoBrand.coral[900]!;
  static Color get coral => AivoBrand.coral;

  // ----------------------------------------
  // ACCENT COLOR (Salmon)
  // ----------------------------------------
  static Color get salmon50 => AivoBrand.salmon[50]!;
  static Color get salmon100 => AivoBrand.salmon[100]!;
  static Color get salmon200 => AivoBrand.salmon[200]!;
  static Color get salmon300 => AivoBrand.salmon[300]!;
  static Color get salmon400 => AivoBrand.salmon[400]!;
  static Color get salmon500 => AivoBrand.salmon[500]!;
  static Color get salmon600 => AivoBrand.salmon[600]!;
  static Color get salmon700 => AivoBrand.salmon[700]!;
  static Color get salmon800 => AivoBrand.salmon[800]!;
  static Color get salmon900 => AivoBrand.salmon[900]!;
  static Color get salmon => AivoBrand.salmon;

  // ----------------------------------------
  // SUCCESS COLOR (Mint)
  // ----------------------------------------
  static Color get mint50 => AivoBrand.mint[50]!;
  static Color get mint100 => AivoBrand.mint[100]!;
  static Color get mint200 => AivoBrand.mint[200]!;
  static Color get mint300 => AivoBrand.mint[300]!;
  static Color get mint400 => AivoBrand.mint[400]!;
  static Color get mint500 => AivoBrand.mint[500]!;
  static Color get mint600 => AivoBrand.mint[600]!;
  static Color get mint700 => AivoBrand.mint[700]!;
  static Color get mint800 => AivoBrand.mint[800]!;
  static Color get mint900 => AivoBrand.mint[900]!;
  static Color get mint => AivoBrand.mint;
  static Color get success => AivoBrand.success;

  // ----------------------------------------
  // WARNING COLOR (Sunshine)
  // ----------------------------------------
  static Color get sunshine50 => AivoBrand.sunshine[50]!;
  static Color get sunshine100 => AivoBrand.sunshine[100]!;
  static Color get sunshine200 => AivoBrand.sunshine[200]!;
  static Color get sunshine300 => AivoBrand.sunshine[300]!;
  static Color get sunshine400 => AivoBrand.sunshine[400]!;
  static Color get sunshine500 => AivoBrand.sunshine[500]!;
  static Color get sunshine600 => AivoBrand.sunshine[600]!;
  static Color get sunshine700 => AivoBrand.sunshine[700]!;
  static Color get sunshine800 => AivoBrand.sunshine[800]!;
  static Color get sunshine900 => AivoBrand.sunshine[900]!;
  static Color get sunshine => AivoBrand.sunshine;
  static Color get warning => AivoBrand.warning;

  // ----------------------------------------
  // INFO COLOR (Sky)
  // ----------------------------------------
  static Color get sky50 => AivoBrand.sky[50]!;
  static Color get sky100 => AivoBrand.sky[100]!;
  static Color get sky200 => AivoBrand.sky[200]!;
  static Color get sky300 => AivoBrand.sky[300]!;
  static Color get sky400 => AivoBrand.sky[400]!;
  static Color get sky500 => AivoBrand.sky[500]!;
  static Color get sky600 => AivoBrand.sky[600]!;
  static Color get sky700 => AivoBrand.sky[700]!;
  static Color get sky800 => AivoBrand.sky[800]!;
  static Color get sky900 => AivoBrand.sky[900]!;
  static Color get sky => AivoBrand.sky;
  static Color get info => AivoBrand.info;

  // ----------------------------------------
  // ERROR COLOR
  // ----------------------------------------
  static Color get error50 => AivoBrand.error[50]!;
  static Color get error100 => AivoBrand.error[100]!;
  static Color get error200 => AivoBrand.error[200]!;
  static Color get error300 => AivoBrand.error[300]!;
  static Color get error400 => AivoBrand.error[400]!;
  static Color get error500 => AivoBrand.error[500]!;
  static Color get error600 => AivoBrand.error[600]!;
  static Color get error700 => AivoBrand.error[700]!;
  static Color get error800 => AivoBrand.error[800]!;
  static Color get error900 => AivoBrand.error[900]!;
  static Color get error => AivoBrand.error;

  // ----------------------------------------
  // NEUTRAL GRAYS
  // ----------------------------------------
  static Color get gray50 => AivoBrand.gray[50]!;
  static Color get gray100 => AivoBrand.gray[100]!;
  static Color get gray200 => AivoBrand.gray[200]!;
  static Color get gray300 => AivoBrand.gray[300]!;
  static Color get gray400 => AivoBrand.gray[400]!;
  static Color get gray500 => AivoBrand.gray[500]!;
  static Color get gray600 => AivoBrand.gray[600]!;
  static Color get gray700 => AivoBrand.gray[700]!;
  static Color get gray800 => AivoBrand.gray[800]!;
  static Color get gray900 => AivoBrand.gray[900]!;
  static Color get gray950 => AivoBrand.gray[950]!;

  // ----------------------------------------
  // SURFACE & BACKGROUND
  // ----------------------------------------
  static Color get background => AivoBrand.background;
  static Color get backgroundAlt => AivoBrand.backgroundAlt;
  static Color get surface => AivoBrand.surface;
  static Color get surfaceMuted => AivoBrand.surfaceMuted;
  static Color get surfaceVariant => AivoBrand.surfacePrimaryTint;

  // ----------------------------------------
  // TEXT COLORS
  // ----------------------------------------
  static Color get textPrimary => AivoBrand.textPrimary;
  static Color get textSecondary => AivoBrand.textSecondary;
  static Color get textMuted => AivoBrand.textMuted;
  static const Color textOnPrimary = Color(0xFFFFFFFF);
  static const Color textOnCoral = Color(0xFFFFFFFF);

  // ----------------------------------------
  // BORDER & OUTLINE
  // ----------------------------------------
  static Color get border => AivoBrand.border;
  static Color get borderLight => AivoBrand.borderLight;
  static Color get outline => AivoBrand.gray[300]!;
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE BAND THEMES
// Age-appropriate variations while maintaining brand consistency
// ══════════════════════════════════════════════════════════════════════════════

enum AivoGradeBand { k5, g6_8, g9_12 }

class _AivoGradeBandColors {
  const _AivoGradeBandColors({
    required this.primary,
    required this.secondary,
    required this.accent,
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.textPrimary,
    required this.textSecondary,
    required this.error,
  });

  final Color primary;
  final Color secondary;
  final Color accent;
  final Color background;
  final Color surface;
  final Color surfaceMuted;
  final Color textPrimary;
  final Color textSecondary;
  final Color error;
}

/// K-5: Brighter, more playful - higher saturation
const _k5Colors = _AivoGradeBandColors(
  primary: Color(0xFF8B5CF6), // Violet (brand primary)
  secondary: Color(0xFFFF6B6B), // Coral (brand CTA)
  accent: Color(0xFFFBBF24), // Sunshine (playful accent)
  background: Color(0xFFFFFBFE), // Warm white
  surface: Colors.white,
  surfaceMuted: Color(0xFFFAF5FF), // Light violet tint
  textPrimary: Color(0xFF18181B),
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFEF4444),
);

/// G6-8: Balanced - standard brand colors
const _g6_8Colors = _AivoGradeBandColors(
  primary: Color(0xFF8B5CF6), // Violet (brand primary)
  secondary: Color(0xFFFF6B6B), // Coral (brand CTA)
  accent: Color(0xFF10B981), // Mint (balanced accent)
  background: Color(0xFFFFFFFF), // Pure white
  surface: Colors.white,
  surfaceMuted: Color(0xFFF5F3FF), // Light violet tint
  textPrimary: Color(0xFF18181B),
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFEF4444),
);

/// G9-12: More mature - slightly muted, professional
const _g9_12Colors = _AivoGradeBandColors(
  primary: Color(0xFF7C3AED), // Deeper violet
  secondary: Color(0xFFFA5252), // Deeper coral
  accent: Color(0xFF0EA5E9), // Sky (professional accent)
  background: Color(0xFFFAFAFA), // Subtle gray
  surface: Colors.white,
  surfaceMuted: Color(0xFFF4F4F5), // Neutral gray
  textPrimary: Color(0xFF18181B),
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFDC2626),
);

// ══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// Using Inter to match marketing website
// ══════════════════════════════════════════════════════════════════════════════

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
    displayLarge: base.displayLarge?.copyWith(
      fontSize: type.display,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.5,
      color: AivoBrandColors.textPrimary,
    ),
    displayMedium: base.displayMedium?.copyWith(
      fontSize: type.display - 4,
      fontWeight: FontWeight.w700,
      color: AivoBrandColors.textPrimary,
    ),
    headlineLarge: base.headlineLarge?.copyWith(
      fontSize: type.headline,
      fontWeight: FontWeight.w700,
      color: AivoBrandColors.textPrimary,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: type.headline - 2,
      fontWeight: FontWeight.w600,
      color: AivoBrandColors.textPrimary,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontSize: type.title,
      fontWeight: FontWeight.w600,
      color: AivoBrandColors.textPrimary,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: type.title - 2,
      fontWeight: FontWeight.w600,
      color: AivoBrandColors.textPrimary,
    ),
    bodyLarge: base.bodyLarge?.copyWith(
      fontSize: type.body,
      fontWeight: FontWeight.w400,
      height: 1.6,
      color: AivoBrandColors.textPrimary,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: type.body - 1,
      fontWeight: FontWeight.w400,
      height: 1.5,
      color: AivoBrandColors.textSecondary,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontSize: type.label,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      color: AivoBrandColors.textPrimary,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontSize: type.label - 1,
      fontWeight: FontWeight.w500,
      color: AivoBrandColors.textSecondary,
    ),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME BUILDER
// ══════════════════════════════════════════════════════════════════════════════

ThemeData _buildTheme({
  required _AivoGradeBandColors colors,
  required _AivoTypography type,
}) {
  final textTheme = _buildTextTheme(type);

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.light(
      primary: colors.primary,
      onPrimary: Colors.white,
      primaryContainer: colors.primary.withOpacity(0.1),
      onPrimaryContainer: colors.primary,
      secondary: colors.secondary,
      onSecondary: Colors.white,
      secondaryContainer: colors.secondary.withOpacity(0.1),
      onSecondaryContainer: colors.secondary,
      tertiary: colors.accent,
      onTertiary: Colors.white,
      error: colors.error,
      onError: Colors.white,
      errorContainer: colors.error.withOpacity(0.1),
      onErrorContainer: colors.error,
      surface: colors.surface,
      onSurface: colors.textPrimary,
      surfaceContainerHighest: colors.surfaceMuted,
      onSurfaceVariant: colors.textSecondary,
      outline: AivoBrandColors.outline,
    ),
    scaffoldBackgroundColor: colors.background,
    textTheme: textTheme,

    // AppBar
    appBarTheme: AppBarTheme(
      backgroundColor: colors.surface,
      foregroundColor: colors.textPrimary,
      centerTitle: true,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),

    // Cards
    cardTheme: CardThemeData(
      color: colors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AivoBrandColors.border),
      ),
      surfaceTintColor: Colors.transparent,
    ),

    // Elevated Buttons (Primary)
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        elevation: 0,
      ),
    ),

    // Filled Buttons (CTA - Coral)
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: colors.secondary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),

    // Outlined Buttons
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: colors.primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: AivoBrandColors.border, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),

    // Text Buttons
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: colors.primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      ),
    ),

    // Chips
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      backgroundColor: colors.surfaceMuted,
      selectedColor: colors.primary.withOpacity(0.15),
      labelStyle: TextStyle(
        color: colors.textSecondary,
        fontWeight: FontWeight.w600,
      ),
      secondaryLabelStyle: TextStyle(
        color: colors.textPrimary,
        fontWeight: FontWeight.w700,
      ),
    ),

    // Input Decoration
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colors.surfaceMuted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AivoBrandColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.error),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),

    // Bottom Navigation
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: colors.surface,
      selectedItemColor: colors.primary,
      unselectedItemColor: AivoBrandColors.gray400,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),

    // Floating Action Button
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: colors.secondary,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),

    // Divider
    dividerTheme: DividerThemeData(
      color: AivoBrandColors.border,
      thickness: 1,
    ),

    // Progress Indicator
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: colors.primary,
      linearTrackColor: colors.primary.withOpacity(0.1),
    ),

    // Switch
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return colors.primary;
        }
        return AivoBrandColors.gray400;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return colors.primary.withOpacity(0.3);
        }
        return AivoBrandColors.gray200;
      }),
    ),

    // Extensions
    extensions: [
      AivoColors(
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        background: colors.background,
        surface: colors.surface,
        surfaceVariant: colors.surfaceMuted,
        textPrimary: colors.textPrimary,
        textSecondary: colors.textSecondary,
        error: colors.error,
        success: AivoBrandColors.mint,
        warning: AivoBrandColors.sunshine,
        info: AivoBrandColors.sky,
        outline: AivoBrandColors.outline,
        coral: AivoBrandColors.coral,
        mint: AivoBrandColors.mint,
        sunshine: AivoBrandColors.sunshine,
        sky: AivoBrandColors.sky,
      ),
    ],
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTED THEMES
// ══════════════════════════════════════════════════════════════════════════════

final ThemeData aivoThemeK5 = _buildTheme(colors: _k5Colors, type: _k5Type);
final ThemeData aivoThemeG6_8 =
    _buildTheme(colors: _g6_8Colors, type: _g6_8Type);
final ThemeData aivoThemeG9_12 =
    _buildTheme(colors: _g9_12Colors, type: _g9_12Type);

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

// ══════════════════════════════════════════════════════════════════════════════
// THEME EXTENSION
// ══════════════════════════════════════════════════════════════════════════════

/// Theme extension providing AIVO brand color tokens to widgets.
///
/// Access via `Theme.of(context).extension<AivoColors>()`
class AivoColors extends ThemeExtension<AivoColors> {
  const AivoColors({
    required this.primary,
    required this.secondary,
    required this.accent,
    required this.background,
    required this.surface,
    required this.surfaceVariant,
    required this.textPrimary,
    required this.textSecondary,
    required this.error,
    required this.success,
    required this.warning,
    required this.info,
    required this.outline,
    required this.coral,
    required this.mint,
    required this.sunshine,
    required this.sky,
  });

  final Color primary;
  final Color secondary;
  final Color accent;
  final Color background;
  final Color surface;
  final Color surfaceVariant;
  final Color textPrimary;
  final Color textSecondary;
  final Color error;
  final Color success;
  final Color warning;
  final Color info;
  final Color outline;

  // Named brand colors
  final Color coral;
  final Color mint;
  final Color sunshine;
  final Color sky;

  @override
  AivoColors copyWith({
    Color? primary,
    Color? secondary,
    Color? accent,
    Color? background,
    Color? surface,
    Color? surfaceVariant,
    Color? textPrimary,
    Color? textSecondary,
    Color? error,
    Color? success,
    Color? warning,
    Color? info,
    Color? outline,
    Color? coral,
    Color? mint,
    Color? sunshine,
    Color? sky,
  }) {
    return AivoColors(
      primary: primary ?? this.primary,
      secondary: secondary ?? this.secondary,
      accent: accent ?? this.accent,
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceVariant: surfaceVariant ?? this.surfaceVariant,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      error: error ?? this.error,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      info: info ?? this.info,
      outline: outline ?? this.outline,
      coral: coral ?? this.coral,
      mint: mint ?? this.mint,
      sunshine: sunshine ?? this.sunshine,
      sky: sky ?? this.sky,
    );
  }

  @override
  AivoColors lerp(ThemeExtension<AivoColors>? other, double t) {
    if (other is! AivoColors) return this;
    return AivoColors(
      primary: Color.lerp(primary, other.primary, t)!,
      secondary: Color.lerp(secondary, other.secondary, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceVariant: Color.lerp(surfaceVariant, other.surfaceVariant, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      error: Color.lerp(error, other.error, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      info: Color.lerp(info, other.info, t)!,
      outline: Color.lerp(outline, other.outline, t)!,
      coral: Color.lerp(coral, other.coral, t)!,
      mint: Color.lerp(mint, other.mint, t)!,
      sunshine: Color.lerp(sunshine, other.sunshine, t)!,
      sky: Color.lerp(sky, other.sky, t)!,
    );
  }
}
