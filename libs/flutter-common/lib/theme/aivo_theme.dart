import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ══════════════════════════════════════════════════════════════════════════════
// AIVO BRAND COLORS - Aligned with Marketing Website
// Source: apps/web-marketing/tailwind.config.cjs
// ══════════════════════════════════════════════════════════════════════════════

/// Brand color palette aligned with AIVO marketing website.
///
/// These colors are the single source of truth for the AIVO brand.
/// See: apps/web-marketing/tailwind.config.cjs for web equivalents.
abstract class AivoBrandColors {
  // ----------------------------------------
  // PRIMARY BRAND COLOR (Violet/Purple)
  // Marketing: theme-primary
  // ----------------------------------------
  static const Color primary50 = Color(0xFFF5F3FF);
  static const Color primary100 = Color(0xFFEDE9FE);
  static const Color primary200 = Color(0xFFDDD6FE);
  static const Color primary300 = Color(0xFFC4B5FD);
  static const Color primary400 = Color(0xFFA78BFA);
  static const Color primary500 = Color(0xFF8B5CF6); // Main brand color
  static const Color primary600 = Color(0xFF7C3AED);
  static const Color primary700 = Color(0xFF6D28D9);
  static const Color primary800 = Color(0xFF5B21B6);
  static const Color primary900 = Color(0xFF4C1D95);
  static const Color primary = primary500;

  // ----------------------------------------
  // SECONDARY/CTA COLOR (Coral)
  // Marketing: coral
  // ----------------------------------------
  static const Color coral50 = Color(0xFFFFF5F5);
  static const Color coral100 = Color(0xFFFFE3E3);
  static const Color coral200 = Color(0xFFFFC9C9);
  static const Color coral300 = Color(0xFFFFA8A8);
  static const Color coral400 = Color(0xFFFF8787);
  static const Color coral500 = Color(0xFFFF6B6B); // Main CTA color
  static const Color coral600 = Color(0xFFFA5252);
  static const Color coral700 = Color(0xFFF03E3E);
  static const Color coral800 = Color(0xFFE03131);
  static const Color coral900 = Color(0xFFC92A2A);
  static const Color coral = coral500;

  // ----------------------------------------
  // ACCENT COLOR (Salmon)
  // Marketing: salmon
  // ----------------------------------------
  static const Color salmon50 = Color(0xFFFFF5F3);
  static const Color salmon100 = Color(0xFFFFE8E4);
  static const Color salmon200 = Color(0xFFFFD4CC);
  static const Color salmon300 = Color(0xFFFFB8AA);
  static const Color salmon400 = Color(0xFFFF9A88);
  static const Color salmon500 = Color(0xFFFA8072); // Main salmon
  static const Color salmon600 = Color(0xFFF56565);
  static const Color salmon700 = Color(0xFFE53E3E);
  static const Color salmon800 = Color(0xFFC53030);
  static const Color salmon900 = Color(0xFF9B2C2C);
  static const Color salmon = salmon500;

  // ----------------------------------------
  // SUCCESS COLOR (Mint)
  // Marketing: mint
  // ----------------------------------------
  static const Color mint50 = Color(0xFFECFDF5);
  static const Color mint100 = Color(0xFFD1FAE5);
  static const Color mint200 = Color(0xFFA7F3D0);
  static const Color mint300 = Color(0xFF6EE7B7);
  static const Color mint400 = Color(0xFF34D399);
  static const Color mint500 = Color(0xFF10B981); // Main success
  static const Color mint600 = Color(0xFF059669);
  static const Color mint700 = Color(0xFF047857);
  static const Color mint800 = Color(0xFF065F46);
  static const Color mint900 = Color(0xFF064E3B);
  static const Color mint = mint500;
  static const Color success = mint500;

  // ----------------------------------------
  // WARNING COLOR (Sunshine)
  // Marketing: sunshine
  // ----------------------------------------
  static const Color sunshine50 = Color(0xFFFFFBEB);
  static const Color sunshine100 = Color(0xFFFEF3C7);
  static const Color sunshine200 = Color(0xFFFDE68A);
  static const Color sunshine300 = Color(0xFFFCD34D);
  static const Color sunshine400 = Color(0xFFFBBF24); // Main warning
  static const Color sunshine500 = Color(0xFFF59E0B);
  static const Color sunshine600 = Color(0xFFD97706);
  static const Color sunshine700 = Color(0xFFB45309);
  static const Color sunshine800 = Color(0xFF92400E);
  static const Color sunshine900 = Color(0xFF78350F);
  static const Color sunshine = sunshine400;
  static const Color warning = sunshine400;

  // ----------------------------------------
  // INFO COLOR (Sky)
  // Marketing: sky
  // ----------------------------------------
  static const Color sky50 = Color(0xFFF0F9FF);
  static const Color sky100 = Color(0xFFE0F2FE);
  static const Color sky200 = Color(0xFFBAE6FD);
  static const Color sky300 = Color(0xFF7DD3FC);
  static const Color sky400 = Color(0xFF38BDF8);
  static const Color sky500 = Color(0xFF0EA5E9); // Main info
  static const Color sky600 = Color(0xFF0284C7);
  static const Color sky700 = Color(0xFF0369A1);
  static const Color sky800 = Color(0xFF075985);
  static const Color sky900 = Color(0xFF0C4A6E);
  static const Color sky = sky500;
  static const Color info = sky500;

  // ----------------------------------------
  // ERROR COLOR
  // Marketing: red-500
  // ----------------------------------------
  static const Color error50 = Color(0xFFFEF2F2);
  static const Color error100 = Color(0xFFFEE2E2);
  static const Color error200 = Color(0xFFFECACA);
  static const Color error300 = Color(0xFFFCA5A5);
  static const Color error400 = Color(0xFFF87171);
  static const Color error500 = Color(0xFFEF4444); // Main error
  static const Color error600 = Color(0xFFDC2626);
  static const Color error700 = Color(0xFFB91C1C);
  static const Color error800 = Color(0xFF991B1B);
  static const Color error900 = Color(0xFF7F1D1D);
  static const Color error = error500;

  // ----------------------------------------
  // NEUTRAL GRAYS
  // Marketing: aivo-gray / zinc
  // ----------------------------------------
  static const Color gray50 = Color(0xFFFAFAFA);
  static const Color gray100 = Color(0xFFF4F4F5);
  static const Color gray200 = Color(0xFFE4E4E7);
  static const Color gray300 = Color(0xFFD4D4D8);
  static const Color gray400 = Color(0xFFA1A1AA);
  static const Color gray500 = Color(0xFF71717A);
  static const Color gray600 = Color(0xFF52525B); // Text secondary
  static const Color gray700 = Color(0xFF3F3F46);
  static const Color gray800 = Color(0xFF27272A);
  static const Color gray900 = Color(0xFF18181B); // Text primary
  static const Color gray950 = Color(0xFF09090B);

  // ----------------------------------------
  // SURFACE & BACKGROUND
  // ----------------------------------------
  static const Color background = Color(0xFFFFFFFF);
  static const Color backgroundAlt = Color(0xFFFAFAFA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF4F4F5);
  static const Color surfaceVariant = Color(0xFFEDE9FE); // Primary tinted

  // ----------------------------------------
  // TEXT COLORS
  // ----------------------------------------
  static const Color textPrimary = gray900;
  static const Color textSecondary = gray600;
  static const Color textMuted = gray500;
  static const Color textOnPrimary = Color(0xFFFFFFFF);
  static const Color textOnCoral = Color(0xFFFFFFFF);

  // ----------------------------------------
  // BORDER & OUTLINE
  // ----------------------------------------
  static const Color border = gray200;
  static const Color borderLight = gray100;
  static const Color outline = gray300;
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
