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

/// K-5: Explorer - Playful, larger elements, more rounded
/// Primary: Purple #7C3AED
const _k5Colors = _AivoGradeBandColors(
  primary: Color(0xFF7C3AED), // Brand Purple
  secondary: Color(0xFFA78BFA), // Light Purple
  accent: Color(0xFFF59E0B), // Amber (playful accent)
  background: Color(0xFFFAFBFF), // Light purple tint
  surface: Colors.white,
  surfaceMuted: Color(0xFFF5F3FF), // Light violet tint
  textPrimary: Color(0xFF1A1A2E), // Navy
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFEF4444),
);

/// G6-8: Navigator - Balanced, modern, teal primary
/// Primary: Teal #0891B2
const _g6_8Colors = _AivoGradeBandColors(
  primary: Color(0xFF0891B2), // Teal
  secondary: Color(0xFF22D3EE), // Light Teal
  accent: Color(0xFF10B981), // Mint (balanced accent)
  background: Color(0xFFF8FAFB), // Light teal tint
  surface: Colors.white,
  surfaceMuted: Color(0xFFECFEFF), // Light teal tint
  textPrimary: Color(0xFF1A1A2E), // Navy
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFEF4444),
);

/// G9-12: Scholar - Professional, focused, navy primary
/// Primary: Navy #1A1A2E
const _g9_12Colors = _AivoGradeBandColors(
  primary: Color(0xFF1A1A2E), // Navy
  secondary: Color(0xFF47476F), // Medium Navy
  accent: Color(0xFF7C3AED), // Purple (professional accent)
  background: Color(0xFFFAFAFA), // Subtle gray
  surface: Colors.white,
  surfaceMuted: Color(0xFFF4F4F5), // Neutral gray
  textPrimary: Color(0xFF1A1A2E), // Navy
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFDC2626),
);

// ══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY (Matches web tokens.json exactly)
// Primary Font: Nunito (weights 400-800)
// Dyslexia-Friendly Font: Atkinson Hyperlegible
// ══════════════════════════════════════════════════════════════════════════════

/// Typography specifications per grade band matching web tokens.json exactly.
/// Each size includes both fontSize and lineHeight for precise alignment.
class AivoTypographySpec {
  const AivoTypographySpec({
    required this.displaySize,
    required this.displayLineHeight,
    required this.headlineSize,
    required this.headlineLineHeight,
    required this.titleSize,
    required this.titleLineHeight,
    required this.bodySize,
    required this.bodyLineHeight,
    required this.labelSize,
    required this.labelLineHeight,
    required this.captionSize,
    required this.captionLineHeight,
  });

  final double displaySize;
  final double displayLineHeight;
  final double headlineSize;
  final double headlineLineHeight;
  final double titleSize;
  final double titleLineHeight;
  final double bodySize;
  final double bodyLineHeight;
  final double labelSize;
  final double labelLineHeight;
  final double captionSize;
  final double captionLineHeight;

  /// Create a scaled version of this typography spec.
  AivoTypographySpec scaled(double factor) {
    return AivoTypographySpec(
      displaySize: displaySize * factor,
      displayLineHeight: displayLineHeight * factor,
      headlineSize: headlineSize * factor,
      headlineLineHeight: headlineLineHeight * factor,
      titleSize: titleSize * factor,
      titleLineHeight: titleLineHeight * factor,
      bodySize: bodySize * factor,
      bodyLineHeight: bodyLineHeight * factor,
      labelSize: labelSize * factor,
      labelLineHeight: labelLineHeight * factor,
      captionSize: captionSize * factor,
      captionLineHeight: captionLineHeight * factor,
    );
  }
}

/// Explorer (Pre-K–5): Larger, playful typography - matches web tokens.json
/// Display: 42px/52px, Headline: 34px/42px, Title: 26px/34px
/// Body: 18px/28px, Label: 16px/24px, Caption: 14px/20px
const explorerTypography = AivoTypographySpec(
  displaySize: 42,
  displayLineHeight: 52,
  headlineSize: 34,
  headlineLineHeight: 42,
  titleSize: 26,
  titleLineHeight: 34,
  bodySize: 18,
  bodyLineHeight: 28,
  labelSize: 16,
  labelLineHeight: 24,
  captionSize: 14,
  captionLineHeight: 20,
);

/// Navigator (6-8): Balanced typography - matches web tokens.json
/// Display: 36px/44px, Headline: 28px/36px, Title: 22px/30px
/// Body: 16px/24px, Label: 14px/20px, Caption: 12px/18px
const navigatorTypography = AivoTypographySpec(
  displaySize: 36,
  displayLineHeight: 44,
  headlineSize: 28,
  headlineLineHeight: 36,
  titleSize: 22,
  titleLineHeight: 30,
  bodySize: 16,
  bodyLineHeight: 24,
  labelSize: 14,
  labelLineHeight: 20,
  captionSize: 12,
  captionLineHeight: 18,
);

/// Scholar (9-12): Professional, compact typography - matches web tokens.json
/// Display: 32px/40px, Headline: 24px/32px, Title: 20px/28px
/// Body: 15px/24px, Label: 13px/18px, Caption: 11px/16px
const scholarTypography = AivoTypographySpec(
  displaySize: 32,
  displayLineHeight: 40,
  headlineSize: 24,
  headlineLineHeight: 32,
  titleSize: 20,
  titleLineHeight: 28,
  bodySize: 15,
  bodyLineHeight: 24,
  labelSize: 13,
  labelLineHeight: 18,
  captionSize: 11,
  captionLineHeight: 16,
);

/// Large text mode scale multiplier for accessibility.
const double largeTextScaleFactor = 1.2;

/// Dyslexia-friendly typography settings.
/// Letter spacing: 0.05em, Word spacing: 0.1em
/// Font: Atkinson Hyperlegible (fallback to Nunito)
class DyslexiaTypographySettings {
  const DyslexiaTypographySettings._();

  /// Letter spacing in em units (0.05em)
  static const double letterSpacingEm = 0.05;

  /// Word spacing in em units (0.1em)
  static const double wordSpacingEm = 0.1;

  /// Get letter spacing for a given font size.
  static double letterSpacing(double fontSize) => fontSize * letterSpacingEm;

  /// Get word spacing for a given font size.
  static double wordSpacing(double fontSize) => fontSize * wordSpacingEm;
}

/// Typography mode for accessibility features.
enum AivoTypographyMode {
  /// Standard Nunito typography.
  standard,

  /// Dyslexia-friendly typography with Atkinson Hyperlegible font
  /// and increased letter/word spacing.
  dyslexiaFriendly,

  /// Large text mode with 1.2x scale multiplier.
  largeText,

  /// Combined dyslexia-friendly + large text.
  dyslexiaFriendlyLarge,
}

// Legacy constants for backwards compatibility
const _k5Type = explorerTypography;
const _g6_8Type = navigatorTypography;
const _g9_12Type = scholarTypography;

/// Build TextTheme from typography spec with optional accessibility modes.
TextTheme _buildTextTheme(
  AivoTypographySpec spec, {
  AivoTypographyMode mode = AivoTypographyMode.standard,
}) {
  // Apply large text scaling if needed
  final effectiveSpec = (mode == AivoTypographyMode.largeText ||
          mode == AivoTypographyMode.dyslexiaFriendlyLarge)
      ? spec.scaled(largeTextScaleFactor)
      : spec;

  // Determine font family based on mode
  final useDyslexiaFont = mode == AivoTypographyMode.dyslexiaFriendly ||
      mode == AivoTypographyMode.dyslexiaFriendlyLarge;

  final base = useDyslexiaFont
      ? GoogleFonts.atkinsonHyperlegibleTextTheme()
      : GoogleFonts.nunitoTextTheme();

  // Calculate line heights as ratios (Flutter uses height as multiplier)
  double heightRatio(double lineHeight, double fontSize) => lineHeight / fontSize;

  // Dyslexia-friendly spacing
  double? letterSpacing(double fontSize) =>
      useDyslexiaFont ? DyslexiaTypographySettings.letterSpacing(fontSize) : null;
  double? wordSpacing(double fontSize) =>
      useDyslexiaFont ? DyslexiaTypographySettings.wordSpacing(fontSize) : null;

  return base.copyWith(
    // Display styles (for hero text, marketing)
    displayLarge: base.displayLarge?.copyWith(
      fontSize: effectiveSpec.displaySize,
      fontWeight: FontWeight.w800,
      height: heightRatio(effectiveSpec.displayLineHeight, effectiveSpec.displaySize),
      letterSpacing: letterSpacing(effectiveSpec.displaySize) ?? -0.5,
      wordSpacing: wordSpacing(effectiveSpec.displaySize),
      color: AivoBrandColors.textPrimary,
    ),
    displayMedium: base.displayMedium?.copyWith(
      fontSize: effectiveSpec.displaySize - 4,
      fontWeight: FontWeight.w800,
      height: heightRatio(effectiveSpec.displayLineHeight, effectiveSpec.displaySize),
      letterSpacing: letterSpacing(effectiveSpec.displaySize - 4),
      wordSpacing: wordSpacing(effectiveSpec.displaySize - 4),
      color: AivoBrandColors.textPrimary,
    ),
    displaySmall: base.displaySmall?.copyWith(
      fontSize: effectiveSpec.displaySize - 6,
      fontWeight: FontWeight.w700,
      height: heightRatio(effectiveSpec.displayLineHeight, effectiveSpec.displaySize),
      letterSpacing: letterSpacing(effectiveSpec.displaySize - 6),
      wordSpacing: wordSpacing(effectiveSpec.displaySize - 6),
      color: AivoBrandColors.textPrimary,
    ),

    // Headline styles (for section headers)
    headlineLarge: base.headlineLarge?.copyWith(
      fontSize: effectiveSpec.headlineSize,
      fontWeight: FontWeight.w800,
      height: heightRatio(effectiveSpec.headlineLineHeight, effectiveSpec.headlineSize),
      letterSpacing: letterSpacing(effectiveSpec.headlineSize),
      wordSpacing: wordSpacing(effectiveSpec.headlineSize),
      color: AivoBrandColors.textPrimary,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: effectiveSpec.headlineSize - 2,
      fontWeight: FontWeight.w700,
      height: heightRatio(effectiveSpec.headlineLineHeight, effectiveSpec.headlineSize),
      letterSpacing: letterSpacing(effectiveSpec.headlineSize - 2),
      wordSpacing: wordSpacing(effectiveSpec.headlineSize - 2),
      color: AivoBrandColors.textPrimary,
    ),
    headlineSmall: base.headlineSmall?.copyWith(
      fontSize: effectiveSpec.headlineSize - 4,
      fontWeight: FontWeight.w600,
      height: heightRatio(effectiveSpec.headlineLineHeight, effectiveSpec.headlineSize),
      letterSpacing: letterSpacing(effectiveSpec.headlineSize - 4),
      wordSpacing: wordSpacing(effectiveSpec.headlineSize - 4),
      color: AivoBrandColors.textPrimary,
    ),

    // Title styles (for card headers, list items)
    titleLarge: base.titleLarge?.copyWith(
      fontSize: effectiveSpec.titleSize,
      fontWeight: FontWeight.w700,
      height: heightRatio(effectiveSpec.titleLineHeight, effectiveSpec.titleSize),
      letterSpacing: letterSpacing(effectiveSpec.titleSize),
      wordSpacing: wordSpacing(effectiveSpec.titleSize),
      color: AivoBrandColors.textPrimary,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: effectiveSpec.titleSize - 2,
      fontWeight: FontWeight.w600,
      height: heightRatio(effectiveSpec.titleLineHeight, effectiveSpec.titleSize),
      letterSpacing: letterSpacing(effectiveSpec.titleSize - 2),
      wordSpacing: wordSpacing(effectiveSpec.titleSize - 2),
      color: AivoBrandColors.textPrimary,
    ),
    titleSmall: base.titleSmall?.copyWith(
      fontSize: effectiveSpec.titleSize - 4,
      fontWeight: FontWeight.w600,
      height: heightRatio(effectiveSpec.titleLineHeight, effectiveSpec.titleSize),
      letterSpacing: letterSpacing(effectiveSpec.titleSize - 4),
      wordSpacing: wordSpacing(effectiveSpec.titleSize - 4),
      color: AivoBrandColors.textPrimary,
    ),

    // Body styles (for paragraphs, descriptions)
    bodyLarge: base.bodyLarge?.copyWith(
      fontSize: effectiveSpec.bodySize,
      fontWeight: FontWeight.w400,
      height: heightRatio(effectiveSpec.bodyLineHeight, effectiveSpec.bodySize),
      letterSpacing: letterSpacing(effectiveSpec.bodySize),
      wordSpacing: wordSpacing(effectiveSpec.bodySize),
      color: AivoBrandColors.textPrimary,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: effectiveSpec.bodySize - 1,
      fontWeight: FontWeight.w400,
      height: heightRatio(effectiveSpec.bodyLineHeight, effectiveSpec.bodySize),
      letterSpacing: letterSpacing(effectiveSpec.bodySize - 1),
      wordSpacing: wordSpacing(effectiveSpec.bodySize - 1),
      color: AivoBrandColors.textSecondary,
    ),
    bodySmall: base.bodySmall?.copyWith(
      fontSize: effectiveSpec.bodySize - 2,
      fontWeight: FontWeight.w400,
      height: heightRatio(effectiveSpec.bodyLineHeight, effectiveSpec.bodySize),
      letterSpacing: letterSpacing(effectiveSpec.bodySize - 2),
      wordSpacing: wordSpacing(effectiveSpec.bodySize - 2),
      color: AivoBrandColors.textSecondary,
    ),

    // Label styles (for buttons, chips, form labels)
    labelLarge: base.labelLarge?.copyWith(
      fontSize: effectiveSpec.labelSize,
      fontWeight: FontWeight.w600,
      height: heightRatio(effectiveSpec.labelLineHeight, effectiveSpec.labelSize),
      letterSpacing: letterSpacing(effectiveSpec.labelSize) ?? 0.1,
      wordSpacing: wordSpacing(effectiveSpec.labelSize),
      color: AivoBrandColors.textPrimary,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontSize: effectiveSpec.labelSize - 1,
      fontWeight: FontWeight.w500,
      height: heightRatio(effectiveSpec.labelLineHeight, effectiveSpec.labelSize),
      letterSpacing: letterSpacing(effectiveSpec.labelSize - 1),
      wordSpacing: wordSpacing(effectiveSpec.labelSize - 1),
      color: AivoBrandColors.textSecondary,
    ),
    labelSmall: base.labelSmall?.copyWith(
      fontSize: effectiveSpec.captionSize,
      fontWeight: FontWeight.w500,
      height: heightRatio(effectiveSpec.captionLineHeight, effectiveSpec.captionSize),
      letterSpacing: letterSpacing(effectiveSpec.captionSize),
      wordSpacing: wordSpacing(effectiveSpec.captionSize),
      color: AivoBrandColors.textMuted,
    ),
  );
}

/// Get typography spec for a grade band.
AivoTypographySpec typographyForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return explorerTypography;
    case AivoGradeBand.g6_8:
      return navigatorTypography;
    case AivoGradeBand.g9_12:
      return scholarTypography;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME BUILDER
// ══════════════════════════════════════════════════════════════════════════════

ThemeData _buildTheme({
  required _AivoGradeBandColors colors,
  required AivoTypographySpec type,
  AivoTypographyMode typographyMode = AivoTypographyMode.standard,
}) {
  final textTheme = _buildTextTheme(type, mode: typographyMode);

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

/// Build a theme with specific accessibility options.
///
/// [band] - The grade band for age-appropriate styling
/// [mode] - Typography accessibility mode (standard, dyslexia-friendly, large text)
/// [isDark] - Whether to use dark theme colors
ThemeData buildAccessibleTheme({
  required AivoGradeBand band,
  AivoTypographyMode mode = AivoTypographyMode.standard,
  bool isDark = false,
}) {
  final type = typographyForBand(band);

  if (isDark) {
    switch (band) {
      case AivoGradeBand.k5:
        return _buildDarkTheme(colors: _k5DarkColors, type: type, typographyMode: mode);
      case AivoGradeBand.g6_8:
        return _buildDarkTheme(colors: _g6_8DarkColors, type: type, typographyMode: mode);
      case AivoGradeBand.g9_12:
        return _buildDarkTheme(colors: _g9_12DarkColors, type: type, typographyMode: mode);
    }
  }

  switch (band) {
    case AivoGradeBand.k5:
      return _buildTheme(colors: _k5Colors, type: type, typographyMode: mode);
    case AivoGradeBand.g6_8:
      return _buildTheme(colors: _g6_8Colors, type: type, typographyMode: mode);
    case AivoGradeBand.g9_12:
      return _buildTheme(colors: _g9_12Colors, type: type, typographyMode: mode);
  }
}

// Future codegen: map token JSON -> Dart so this stays in sync with design tokens.
// A build_runner step could read libs/design-tokens/aivo-tokens.json and emit a Dart map
// consumed here to avoid manual duplication.

// ══════════════════════════════════════════════════════════════════════════════
// DARK THEME COLORS
// Addresses P1 Issue: Dark theme support for mobile
// ══════════════════════════════════════════════════════════════════════════════

/// Dark theme color palette for all grade bands.
/// Extended with additional semantic colors to match web tokens.
class _AivoDarkColors {
  const _AivoDarkColors({
    required this.primary,
    required this.secondary,
    required this.accent,
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.textPrimary,
    required this.textSecondary,
    required this.error,
    this.textMuted,
    this.border,
    this.borderMuted,
    this.info,
    this.success,
    this.warning,
    this.focus,
    this.focusRing,
    this.backdrop,
    this.textOnPrimary,
    this.textOnAccent,
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

  // Extended colors (with defaults for backwards compatibility)
  final Color? textMuted;
  final Color? border;
  final Color? borderMuted;
  final Color? info;
  final Color? success;
  final Color? warning;
  final Color? focus;
  final Color? focusRing;
  final Color? backdrop;
  final Color? textOnPrimary;
  final Color? textOnAccent;

  // Helper getters with defaults
  Color get effectiveBorder => border ?? surfaceMuted;
  Color get effectiveBorderMuted => borderMuted ?? surfaceMuted;
  Color get effectiveTextMuted => textMuted ?? textSecondary.withOpacity(0.7);
  Color get effectiveInfo => info ?? const Color(0xFF60A5FA);
  Color get effectiveSuccess => success ?? const Color(0xFF34D399);
  Color get effectiveWarning => warning ?? const Color(0xFFFBBF24);
  Color get effectiveFocus => focus ?? primary;
  Color get effectiveFocusRing => focusRing ?? primary.withOpacity(0.5);
  Color get effectiveBackdrop => backdrop ?? const Color(0x99000000);
  Color get effectiveTextOnPrimary => textOnPrimary ?? background;
  Color get effectiveTextOnAccent => textOnAccent ?? const Color(0xFFFFFFFF);
}

/// K-5 Dark: Playful purple tones
const _k5DarkColors = _AivoDarkColors(
  primary: Color(0xFFA78BFA), // Lighter purple for dark mode
  secondary: Color(0xFFC4B5FD),
  accent: Color(0xFFFBBF24), // Amber
  background: Color(0xFF0F0D15), // Deep purple-black
  surface: Color(0xFF1A1625), // Dark purple surface
  surfaceMuted: Color(0xFF251F33), // Lighter purple surface
  textPrimary: Color(0xFFF8F7FC), // Off-white with purple tint
  textSecondary: Color(0xFFA1A1AA),
  error: Color(0xFFF87171),
);

/// G6-8 Dark: Modern teal tones
const _g6_8DarkColors = _AivoDarkColors(
  primary: Color(0xFF22D3EE), // Light teal
  secondary: Color(0xFF67E8F9),
  accent: Color(0xFF34D399), // Mint
  background: Color(0xFF0A1014), // Deep teal-black
  surface: Color(0xFF111A1F), // Dark teal surface
  surfaceMuted: Color(0xFF1A262D), // Lighter teal surface
  textPrimary: Color(0xFFF0FDFA), // Off-white with teal tint
  textSecondary: Color(0xFF9CA3AF),
  error: Color(0xFFF87171),
);

/// G9-12 Dark: Professional navy tones - EXACTLY matches web scholarDark tokens
/// Web reference: libs/ui-web/src/tokens.json -> gradeThemes.scholarDark
const _g9_12DarkColors = _AivoDarkColors(
  primary: Color(0xFFA78BFA), // Web: #A78BFA - Lighter purple for dark mode
  secondary: Color(0xFF757593), // Web: #757593
  accent: Color(0xFF7C3AED), // Web: #7C3AED - Purple accent
  background: Color(0xFF09090B), // Web: #09090B - Near black
  surface: Color(0xFF18181B), // Web: #18181B - Dark gray
  surfaceMuted: Color(0xFF27272A), // Web: #27272A - Medium gray / surfaceElevated
  textPrimary: Color(0xFFFAFAFA), // Web: #FAFAFA
  textSecondary: Color(0xFFA1A1AA), // Web: #A1A1AA
  textMuted: Color(0xFF71717A), // Web: #71717A
  border: Color(0xFF3F3F46), // Web: #3F3F46
  borderMuted: Color(0xFF27272A), // Web: #27272A
  info: Color(0xFF60A5FA), // Web: #60A5FA
  success: Color(0xFF34D399), // Web: #34D399
  warning: Color(0xFFFBBF24), // Web: #FBBF24
  error: Color(0xFFF87171), // Web: #F87171
  focus: Color(0xFF60A5FA), // Web: #60A5FA
  focusRing: Color(0x8060A5FA), // Web: rgba(96, 165, 250, 0.5)
  backdrop: Color(0x99000000), // Web: rgba(0, 0, 0, 0.6)
  textOnPrimary: Color(0xFF09090B), // Web: #09090B
  textOnAccent: Color(0xFFFFFFFF), // Web: #FFFFFF
);

ThemeData _buildDarkTheme({
  required _AivoDarkColors colors,
  required AivoTypographySpec type,
  AivoTypographyMode typographyMode = AivoTypographyMode.standard,
}) {
  final textTheme = _buildTextTheme(type, mode: typographyMode).apply(
    bodyColor: colors.textPrimary,
    displayColor: colors.textPrimary,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: colors.primary,
      onPrimary: Colors.black,
      primaryContainer: colors.primary.withOpacity(0.15),
      onPrimaryContainer: colors.primary,
      secondary: colors.secondary,
      onSecondary: Colors.black,
      secondaryContainer: colors.secondary.withOpacity(0.15),
      onSecondaryContainer: colors.secondary,
      tertiary: colors.accent,
      onTertiary: Colors.black,
      error: colors.error,
      onError: Colors.black,
      errorContainer: colors.error.withOpacity(0.15),
      onErrorContainer: colors.error,
      surface: colors.surface,
      onSurface: colors.textPrimary,
      surfaceContainerHighest: colors.surfaceMuted,
      onSurfaceVariant: colors.textSecondary,
      outline: colors.textSecondary.withOpacity(0.5),
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

    // Cards - Use border instead of shadow in dark mode
    cardTheme: CardThemeData(
      color: colors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colors.effectiveBorder),
      ),
      surfaceTintColor: Colors.transparent,
    ),

    // Elevated Buttons (Primary) - Use textOnPrimary for proper contrast
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: colors.primary,
        foregroundColor: colors.effectiveTextOnPrimary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        elevation: 0,
      ),
    ),

    // Filled Buttons (CTA) - Use proper text color
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: colors.accent,
        foregroundColor: colors.effectiveTextOnAccent,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),

    // Outlined Buttons - Use border color
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: colors.primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: colors.effectiveBorder, width: 1.5),
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
      selectedColor: colors.primary.withOpacity(0.2),
      labelStyle: TextStyle(
        color: colors.textSecondary,
        fontWeight: FontWeight.w600,
      ),
      secondaryLabelStyle: TextStyle(
        color: colors.textPrimary,
        fontWeight: FontWeight.w700,
      ),
    ),

    // Input Decoration - Visible borders for dark mode
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colors.surfaceMuted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.effectiveBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.effectiveBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.effectiveFocus, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colors.error, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      labelStyle: TextStyle(color: colors.textSecondary),
      hintStyle: TextStyle(color: colors.effectiveTextMuted),
    ),

    // Bottom Navigation
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: colors.surface,
      selectedItemColor: colors.primary,
      unselectedItemColor: colors.textSecondary,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),

    // Floating Action Button
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: colors.secondary,
      foregroundColor: Colors.black,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),

    // Divider
    dividerTheme: DividerThemeData(
      color: colors.surfaceMuted,
      thickness: 1,
    ),

    // Progress Indicator
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: colors.primary,
      linearTrackColor: colors.primary.withOpacity(0.2),
    ),

    // Switch
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return colors.primary;
        }
        return colors.textSecondary;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return colors.primary.withOpacity(0.5);
        }
        return colors.surfaceMuted;
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
        success: const Color(0xFF34D399), // Mint for dark mode
        warning: const Color(0xFFFBBF24), // Amber for dark mode
        info: const Color(0xFF38BDF8), // Sky for dark mode
        outline: colors.surfaceMuted,
        coral: const Color(0xFFFF8585),
        mint: const Color(0xFF34D399),
        sunshine: const Color(0xFFFBBF24),
        sky: const Color(0xFF38BDF8),
      ),
    ],
  );
}

// Dark themes for each grade band
final ThemeData aivoThemeK5Dark = _buildDarkTheme(colors: _k5DarkColors, type: _k5Type);
final ThemeData aivoThemeG6_8Dark = _buildDarkTheme(colors: _g6_8DarkColors, type: _g6_8Type);
final ThemeData aivoThemeG9_12Dark = _buildDarkTheme(colors: _g9_12DarkColors, type: _g9_12Type);

ThemeData darkThemeForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return aivoThemeK5Dark;
    case AivoGradeBand.g6_8:
      return aivoThemeG6_8Dark;
    case AivoGradeBand.g9_12:
      return aivoThemeG9_12Dark;
  }
}

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
    Color? primaryContainer,
    Color? onPrimaryContainer,
  })  : _primaryContainer = primaryContainer,
        _onPrimaryContainer = onPrimaryContainer;

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

  // Container colors (computed if not provided)
  final Color? _primaryContainer;
  final Color? _onPrimaryContainer;

  /// Primary container color (12% opacity of primary if not set).
  Color get primaryContainer =>
      _primaryContainer ?? primary.withOpacity(0.12);

  /// On-primary-container color (primary color if not set).
  Color get onPrimaryContainer => _onPrimaryContainer ?? primary;

  /// Error container color (12% opacity of error).
  Color get errorContainer => error.withOpacity(0.12);

  /// On-error-container color (error color).
  Color get onErrorContainer => error;

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
    Color? primaryContainer,
    Color? onPrimaryContainer,
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
      primaryContainer: primaryContainer ?? _primaryContainer,
      onPrimaryContainer: onPrimaryContainer ?? _onPrimaryContainer,
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
      primaryContainer:
          Color.lerp(primaryContainer, other.primaryContainer, t),
      onPrimaryContainer:
          Color.lerp(onPrimaryContainer, other.onPrimaryContainer, t),
    );
  }

  /// Default light theme colors using brand tokens.
  static AivoColors get light => AivoColors(
        primary: AivoBrandColors.primary,
        secondary: AivoBrandColors.coral,
        accent: AivoBrandColors.sunshine,
        background: AivoBrandColors.background,
        surface: AivoBrandColors.surface,
        surfaceVariant: AivoBrandColors.surfaceMuted,
        textPrimary: AivoBrandColors.textPrimary,
        textSecondary: AivoBrandColors.textSecondary,
        error: AivoBrandColors.error,
        success: AivoBrandColors.success,
        warning: AivoBrandColors.warning,
        info: AivoBrandColors.info,
        outline: AivoBrandColors.border,
        coral: AivoBrandColors.coral,
        mint: AivoBrandColors.mint,
        sunshine: AivoBrandColors.sunshine,
        sky: AivoBrandColors.sky,
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// AIVO THEME UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/// Utility class for theme-related context lookups.
///
/// Provides static methods to retrieve theme information from the widget tree.
abstract class AivoTheme {
  /// Gets the current [AivoGradeBand] from the nearest ancestor.
  ///
  /// This looks for an [AivoThemeScope] in the widget tree.
  /// If not found, returns [AivoGradeBand.g9_12] as the default.
  ///
  /// Usage:
  /// ```dart
  /// final gradeBand = AivoTheme.gradeBandOf(context);
  /// ```
  static AivoGradeBand gradeBandOf(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AivoThemeScope>();
    return scope?.gradeBand ?? AivoGradeBand.g9_12;
  }

  /// Checks if dark mode is currently active.
  ///
  /// Returns true if the theme brightness is dark.
  static bool isDarkMode(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark;
  }

  /// Gets the current [AivoColors] from the theme.
  ///
  /// Returns null if [AivoColors] extension is not present in the theme.
  static AivoColors? colorsOf(BuildContext context) {
    return Theme.of(context).extension<AivoColors>();
  }
}

/// Inherited widget that provides [AivoGradeBand] to descendants.
///
/// Wrap your app or a subtree with this widget to make the grade band
/// available via [AivoTheme.gradeBandOf].
///
/// Usage:
/// ```dart
/// AivoThemeScope(
///   gradeBand: AivoGradeBand.k5,
///   child: MyApp(),
/// )
/// ```
class AivoThemeScope extends InheritedWidget {
  const AivoThemeScope({
    super.key,
    required this.gradeBand,
    required super.child,
  });

  /// The grade band to provide to descendants.
  final AivoGradeBand gradeBand;

  @override
  bool updateShouldNotify(AivoThemeScope oldWidget) {
    return gradeBand != oldWidget.gradeBand;
  }

  /// Gets the [AivoThemeScope] from the given context.
  static AivoThemeScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AivoThemeScope>();
  }

  /// Gets the [AivoThemeScope] from the given context, throwing if not found.
  static AivoThemeScope of(BuildContext context) {
    final scope = maybeOf(context);
    assert(scope != null, 'No AivoThemeScope found in context');
    return scope!;
  }
}
