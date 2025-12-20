 import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

// Import shared brand colors and theme utilities
import 'package:flutter_common/theme/aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER THEME STATE
// ══════════════════════════════════════════════════════════════════════════════

/// State for learner theme configuration.
class LearnerThemeState {
  final AivoGradeBand gradeBand;
  final bool useDyslexiaFont;
  final bool useHighContrast;
  final bool useReducedMotion;

  const LearnerThemeState({
    this.gradeBand = AivoGradeBand.g6_8,
    this.useDyslexiaFont = false,
    this.useHighContrast = false,
    this.useReducedMotion = false,
  });

  LearnerThemeState copyWith({
    AivoGradeBand? gradeBand,
    bool? useDyslexiaFont,
    bool? useHighContrast,
    bool? useReducedMotion,
  }) {
    return LearnerThemeState(
      gradeBand: gradeBand ?? this.gradeBand,
      useDyslexiaFont: useDyslexiaFont ?? this.useDyslexiaFont,
      useHighContrast: useHighContrast ?? this.useHighContrast,
      useReducedMotion: useReducedMotion ?? this.useReducedMotion,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER THEME CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

/// Controller for learner theme settings.
class LearnerThemeController extends StateNotifier<LearnerThemeState> {
  LearnerThemeController() : super(const LearnerThemeState());

  void setGradeBand(AivoGradeBand band) {
    state = state.copyWith(gradeBand: band);
  }

  void setDyslexiaFont(bool value) {
    state = state.copyWith(useDyslexiaFont: value);
  }

  void setHighContrast(bool value) {
    state = state.copyWith(useHighContrast: value);
  }

  void setReducedMotion(bool value) {
    state = state.copyWith(useReducedMotion: value);
  }

  void resetToDefaults() {
    state = const LearnerThemeState();
  }
}

final learnerThemeControllerProvider =
    StateNotifierProvider<LearnerThemeController, LearnerThemeState>(
  (ref) => LearnerThemeController(),
);

// ══════════════════════════════════════════════════════════════════════════════
// GRADE BAND COLORS
// Age-appropriate color variations
// ══════════════════════════════════════════════════════════════════════════════

class _LearnerGradeBandColors {
  const _LearnerGradeBandColors({
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

/// K-5: Playful, vibrant, warm feel
const _k5Colors = _LearnerGradeBandColors(
  primary: Color(0xFF8B5CF6), // Violet-500 (full brightness)
  secondary: Color(0xFFFF6B6B), // Coral-500
  accent: Color(0xFFFBBF24), // Sunshine-400 (warm, playful)
  background: Color(0xFFFFFBFE), // Warm white
  surface: Colors.white,
  surfaceMuted: Color(0xFFFAF5FF), // Light violet tint
  textPrimary: Color(0xFF18181B),
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFEF4444),
);

/// G6-8: Balanced, fresh, approachable
const _g6_8Colors = _LearnerGradeBandColors(
  primary: Color(0xFF8B5CF6), // Violet-500
  secondary: Color(0xFFFF6B6B), // Coral-500
  accent: Color(0xFF10B981), // Mint-500 (balanced, fresh)
  background: Color(0xFFFFFFFF), // Pure white
  surface: Colors.white,
  surfaceMuted: Color(0xFFF5F3FF), // Light violet
  textPrimary: Color(0xFF18181B),
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFEF4444),
);

/// G9-12: Mature, professional, sophisticated
const _g9_12Colors = _LearnerGradeBandColors(
  primary: Color(0xFF7C3AED), // Violet-600 (deeper)
  secondary: Color(0xFFFA5252), // Coral-600 (deeper)
  accent: Color(0xFF0EA5E9), // Sky-500 (professional)
  background: Color(0xFFFAFAFA), // Gray-50
  surface: Colors.white,
  surfaceMuted: Color(0xFFF4F4F5), // Neutral gray
  textPrimary: Color(0xFF18181B),
  textSecondary: Color(0xFF52525B),
  error: Color(0xFFDC2626),
);

/// High contrast colors for accessibility
class _HighContrastColors {
  static const primary = Color(0xFF5B21B6); // Violet-800
  static const secondary = Color(0xFFC92A2A); // Coral-900
  static const accent = Color(0xFF047857); // Mint-700
  static const background = Color(0xFFFFFFFF);
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFE4E4E7); // Gray-200
  static const textPrimary = Color(0xFF000000);
  static const textSecondary = Color(0xFF27272A); // Gray-800
  static const error = Color(0xFFB91C1C); // Red-700
}

_LearnerGradeBandColors _colorsForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return _k5Colors;
    case AivoGradeBand.g6_8:
      return _g6_8Colors;
    case AivoGradeBand.g9_12:
      return _g9_12Colors;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GAMIFICATION COLORS
// Special colors for achievements, XP, streaks, badges
// ══════════════════════════════════════════════════════════════════════════════

/// Gamification-specific colors for learner engagement.
class LearnerGamificationColors {
  const LearnerGamificationColors._();

  // Achievement Badge Colors
  static const Color badgeBackground = Color(0xFFFEF3C7); // Sunshine-100
  static const Color badgeBorder = Color(0xFFFBBF24); // Sunshine-400
  static const Color badgeGold = Color(0xFFF59E0B); // Sunshine-500
  static const Color badgeSilver = Color(0xFFA1A1AA); // Gray-400
  static const Color badgeBronze = Color(0xFFB45309); // Sunshine-700

  // XP Indicator Colors
  static const Color xpPrimary = Color(0xFF10B981); // Mint-500
  static const Color xpSecondary = Color(0xFF059669); // Mint-600
  static const LinearGradient xpGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF10B981), Color(0xFF059669)],
  );

  // Streak Colors
  static const Color streakFire = Color(0xFFFF6B6B); // Coral-500
  static const Color streakFlame = Color(0xFFFBBF24); // Sunshine-400
  static const LinearGradient streakGradient = LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [Color(0xFFFF6B6B), Color(0xFFFBBF24)],
  );

  // Progress Bar Colors
  static const Color progressStart = Color(0xFF8B5CF6); // Primary-500
  static const Color progressEnd = Color(0xFF6D28D9); // Primary-700
  static const LinearGradient progressGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
  );

  // Level Up / Celebration
  static const Color celebrationPrimary = Color(0xFFFF6B6B); // Coral
  static const Color celebrationSecondary = Color(0xFFFBBF24); // Sunshine
  static const Color celebrationTertiary = Color(0xFF8B5CF6); // Violet

  // Coins / Currency
  static const Color coinGold = Color(0xFFFBBF24); // Sunshine-400
  static const Color coinShadow = Color(0xFFB45309); // Sunshine-700

  // Hearts / Lives
  static const Color heartFull = Color(0xFFFF6B6B); // Coral-500
  static const Color heartEmpty = Color(0xFFD4D4D8); // Gray-300
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// Grade-appropriate font sizes
// ══════════════════════════════════════════════════════════════════════════════

class _LearnerTypography {
  const _LearnerTypography({
    required this.display,
    required this.headline,
    required this.title,
    required this.body,
    required this.label,
    required this.letterSpacing,
  });

  final double display;
  final double headline;
  final double title;
  final double body;
  final double label;
  final double letterSpacing;
}

/// K-5: Larger, friendlier, more readable
const _k5Type = _LearnerTypography(
  display: 36,
  headline: 30,
  title: 24,
  body: 18,
  label: 16,
  letterSpacing: 0.3, // Increased for readability
);

/// G6-8: Balanced, standard
const _g6_8Type = _LearnerTypography(
  display: 34,
  headline: 28,
  title: 22,
  body: 17,
  label: 14,
  letterSpacing: 0.1, // Standard
);

/// G9-12: Compact, mature
const _g9_12Type = _LearnerTypography(
  display: 32,
  headline: 26,
  title: 20,
  body: 16,
  label: 13,
  letterSpacing: 0, // Tighter
);

_LearnerTypography _typographyForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return _k5Type;
    case AivoGradeBand.g6_8:
      return _g6_8Type;
    case AivoGradeBand.g9_12:
      return _g9_12Type;
  }
}

TextTheme _buildLearnerTextTheme({
  required _LearnerTypography type,
  required Color textPrimary,
  required Color textSecondary,
  bool useDyslexiaFont = false,
}) {
  // Lexend for dyslexia, Inter as default
  final base = useDyslexiaFont
      ? GoogleFonts.lexendTextTheme()
      : GoogleFonts.interTextTheme();

  final extraSpacing = useDyslexiaFont ? 0.5 : type.letterSpacing;

  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(
      fontSize: type.display,
      fontWeight: FontWeight.w700,
      letterSpacing: extraSpacing,
      color: textPrimary,
    ),
    displayMedium: base.displayMedium?.copyWith(
      fontSize: type.display - 4,
      fontWeight: FontWeight.w700,
      letterSpacing: extraSpacing,
      color: textPrimary,
    ),
    headlineLarge: base.headlineLarge?.copyWith(
      fontSize: type.headline,
      fontWeight: FontWeight.w700,
      letterSpacing: extraSpacing,
      color: textPrimary,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: type.headline - 2,
      fontWeight: FontWeight.w600,
      letterSpacing: extraSpacing,
      color: textPrimary,
    ),
    headlineSmall: base.headlineSmall?.copyWith(
      fontSize: type.headline - 4,
      fontWeight: FontWeight.w600,
      color: textPrimary,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontSize: type.title,
      fontWeight: FontWeight.w600,
      color: textPrimary,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: type.title - 2,
      fontWeight: FontWeight.w600,
      color: textPrimary,
    ),
    bodyLarge: base.bodyLarge?.copyWith(
      fontSize: type.body,
      fontWeight: FontWeight.w400,
      height: 1.6,
      letterSpacing: useDyslexiaFont ? 0.5 : 0,
      color: textPrimary,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: type.body - 1,
      fontWeight: FontWeight.w400,
      height: 1.5,
      letterSpacing: useDyslexiaFont ? 0.3 : 0,
      color: textSecondary,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontSize: type.label,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      color: textPrimary,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontSize: type.label - 1,
      fontWeight: FontWeight.w500,
      color: textSecondary,
    ),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUTTON SIZING BY GRADE
// Age-appropriate touch targets and styling
// ══════════════════════════════════════════════════════════════════════════════

class _ButtonSizing {
  const _ButtonSizing({
    required this.height,
    required this.radius,
    required this.padding,
  });

  final double height;
  final double radius;
  final EdgeInsets padding;
}

/// K-5: Larger touch targets, more rounded
const _k5Buttons = _ButtonSizing(
  height: 56,
  radius: 16,
  padding: EdgeInsets.symmetric(horizontal: 28, vertical: 18),
);

/// G6-8: Standard sizing
const _g6_8Buttons = _ButtonSizing(
  height: 52,
  radius: 12,
  padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
);

/// G9-12: Compact, professional
const _g9_12Buttons = _ButtonSizing(
  height: 48,
  radius: 12,
  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
);

_ButtonSizing _buttonSizingForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return _k5Buttons;
    case AivoGradeBand.g6_8:
      return _g6_8Buttons;
    case AivoGradeBand.g9_12:
      return _g9_12Buttons;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME BUILDER
// ══════════════════════════════════════════════════════════════════════════════

/// Build learner theme with grade-appropriate styling and accessibility.
ThemeData buildLearnerTheme({
  required AivoGradeBand gradeBand,
  bool useDyslexiaFont = false,
  bool useHighContrast = false,
  bool useReducedMotion = false,
}) {
  final bandColors = _colorsForBand(gradeBand);
  final typography = _typographyForBand(gradeBand);
  final buttonSizing = _buttonSizingForBand(gradeBand);

  // Apply high contrast overrides if enabled
  final primary =
      useHighContrast ? _HighContrastColors.primary : bandColors.primary;
  final secondary =
      useHighContrast ? _HighContrastColors.secondary : bandColors.secondary;
  final accent =
      useHighContrast ? _HighContrastColors.accent : bandColors.accent;
  final background =
      useHighContrast ? _HighContrastColors.background : bandColors.background;
  final surface =
      useHighContrast ? _HighContrastColors.surface : bandColors.surface;
  final surfaceMuted = useHighContrast
      ? _HighContrastColors.surfaceMuted
      : bandColors.surfaceMuted;
  final textPrimary = useHighContrast
      ? _HighContrastColors.textPrimary
      : bandColors.textPrimary;
  final textSecondary = useHighContrast
      ? _HighContrastColors.textSecondary
      : bandColors.textSecondary;
  final error = useHighContrast ? _HighContrastColors.error : bandColors.error;

  final textTheme = _buildLearnerTextTheme(
    type: typography,
    textPrimary: textPrimary,
    textSecondary: textSecondary,
    useDyslexiaFont: useDyslexiaFont,
  );

  final colorScheme = ColorScheme.light(
    primary: primary,
    onPrimary: Colors.white,
    primaryContainer: primary.withOpacity(0.1),
    onPrimaryContainer: primary,
    secondary: secondary,
    onSecondary: Colors.white,
    secondaryContainer: secondary.withOpacity(0.1),
    onSecondaryContainer: secondary,
    tertiary: accent,
    onTertiary: Colors.white,
    error: error,
    onError: Colors.white,
    errorContainer: error.withOpacity(0.1),
    onErrorContainer: error,
    surface: surface,
    onSurface: textPrimary,
    surfaceContainerHighest: surfaceMuted,
    onSurfaceVariant: textSecondary,
    outline:
        useHighContrast ? const Color(0xFF71717A) : const Color(0xFFD4D4D8),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: background,
    textTheme: textTheme,

    // AppBar
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: textPrimary,
      centerTitle: true,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w600,
      ),
    ),

    // Cards - slightly more rounded for younger learners
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          gradeBand == AivoGradeBand.k5 ? 20 : 16,
        ),
        side: BorderSide(
          color: useHighContrast
              ? const Color(0xFFA1A1AA)
              : const Color(0xFFE4E4E7),
          width: useHighContrast ? 2 : 1,
        ),
      ),
      surfaceTintColor: Colors.transparent,
    ),

    // Primary Button (Violet)
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(buttonSizing.radius),
        ),
        padding: buttonSizing.padding,
        minimumSize: Size(48, buttonSizing.height),
        elevation: 0,
      ),
    ),

    // CTA Button (Coral)
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: secondary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(buttonSizing.radius),
        ),
        padding: buttonSizing.padding,
        minimumSize: Size(48, buttonSizing.height),
      ),
    ),

    // Outline Button
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(buttonSizing.radius),
        ),
        side: BorderSide(
          color: primary,
          width: useHighContrast ? 2 : 1.5,
        ),
        padding: buttonSizing.padding,
        minimumSize: Size(48, buttonSizing.height),
      ),
    ),

    // Text Button
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(buttonSizing.radius),
        ),
        padding: EdgeInsets.symmetric(
          horizontal: buttonSizing.padding.horizontal / 2,
          vertical: buttonSizing.padding.vertical / 2,
        ),
        minimumSize: Size(48, buttonSizing.height - 8),
      ),
    ),

    // Chips - more rounded for younger learners
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          gradeBand == AivoGradeBand.k5 ? 16 : 12,
        ),
      ),
      backgroundColor: surfaceMuted,
      selectedColor: primary.withOpacity(0.15),
      labelStyle: textTheme.labelMedium?.copyWith(color: textSecondary),
      secondaryLabelStyle: textTheme.labelMedium?.copyWith(
        color: textPrimary,
        fontWeight: FontWeight.w600,
      ),
    ),

    // Input Decoration
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceMuted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(buttonSizing.radius),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(buttonSizing.radius),
        borderSide: BorderSide(
          color: useHighContrast
              ? const Color(0xFF71717A)
              : const Color(0xFFD4D4D8),
          width: useHighContrast ? 2 : 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(buttonSizing.radius),
        borderSide: BorderSide(color: primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(buttonSizing.radius),
        borderSide: BorderSide(color: error, width: useHighContrast ? 2 : 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(buttonSizing.radius),
        borderSide: BorderSide(color: error, width: 2),
      ),
      contentPadding: EdgeInsets.symmetric(
        horizontal: 16,
        vertical: gradeBand == AivoGradeBand.k5 ? 18 : 14,
      ),
      hintStyle: textTheme.bodyMedium?.copyWith(
        color: const Color(0xFFA1A1AA),
      ),
    ),

    // Bottom Navigation
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: surface,
      selectedItemColor: primary,
      unselectedItemColor: const Color(0xFFA1A1AA),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelStyle: textTheme.labelMedium,
      selectedIconTheme: IconThemeData(
        size: gradeBand == AivoGradeBand.k5 ? 28 : 24,
      ),
      unselectedIconTheme: IconThemeData(
        size: gradeBand == AivoGradeBand.k5 ? 28 : 24,
      ),
    ),

    // Floating Action Button (Accent color for fun actions)
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: accent,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          gradeBand == AivoGradeBand.k5 ? 20 : 16,
        ),
      ),
    ),

    // Checkbox
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return primary;
        }
        return Colors.transparent;
      }),
      side: BorderSide(
        color: textSecondary,
        width: useHighContrast ? 2 : 1.5,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          gradeBand == AivoGradeBand.k5 ? 6 : 4,
        ),
      ),
    ),

    // Switch
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return primary;
        }
        return const Color(0xFFA1A1AA);
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return primary.withOpacity(0.3);
        }
        return const Color(0xFFE4E4E7);
      }),
    ),

    // Divider
    dividerTheme: DividerThemeData(
      color:
          useHighContrast ? const Color(0xFFA1A1AA) : const Color(0xFFE4E4E7),
      thickness: 1,
    ),

    // Progress Indicator
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: primary,
      linearTrackColor: primary.withOpacity(0.1),
    ),

    // Snackbar
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF27272A),
      contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(buttonSizing.radius),
      ),
      behavior: SnackBarBehavior.floating,
    ),

    // Dialog
    dialogTheme: DialogThemeData(
      backgroundColor: surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          gradeBand == AivoGradeBand.k5 ? 24 : 20,
        ),
      ),
      titleTextStyle: textTheme.headlineSmall,
      contentTextStyle: textTheme.bodyMedium,
    ),

    // Bottom Sheet
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(gradeBand == AivoGradeBand.k5 ? 24 : 20),
        ),
      ),
    ),

    // Extensions
    extensions: [
      AivoColors(
        primary: primary,
        secondary: secondary,
        accent: accent,
        background: background,
        surface: surface,
        surfaceVariant: surfaceMuted,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        error: error,
        success: AivoBrandColors.mint,
        warning: AivoBrandColors.sunshine,
        info: AivoBrandColors.sky,
        outline:
            useHighContrast ? const Color(0xFF71717A) : const Color(0xFFD4D4D8),
        coral: AivoBrandColors.coral,
        mint: AivoBrandColors.mint,
        sunshine: AivoBrandColors.sunshine,
        sky: AivoBrandColors.sky,
      ),
      LearnerGamificationExtension(
        badgeBackground: LearnerGamificationColors.badgeBackground,
        badgeBorder: LearnerGamificationColors.badgeBorder,
        xpGradient: LearnerGamificationColors.xpGradient,
        streakGradient: LearnerGamificationColors.streakGradient,
        progressGradient: LearnerGamificationColors.progressGradient,
        heartFull: LearnerGamificationColors.heartFull,
        heartEmpty: LearnerGamificationColors.heartEmpty,
        coinGold: LearnerGamificationColors.coinGold,
      ),
    ],
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTED THEMES
// ══════════════════════════════════════════════════════════════════════════════

final ThemeData learnerThemeK5 = buildLearnerTheme(gradeBand: AivoGradeBand.k5);
final ThemeData learnerThemeG6_8 =
    buildLearnerTheme(gradeBand: AivoGradeBand.g6_8);
final ThemeData learnerThemeG9_12 =
    buildLearnerTheme(gradeBand: AivoGradeBand.g9_12);

// ══════════════════════════════════════════════════════════════════════════════
// THEME PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

final learnerThemeProvider = Provider<ThemeData>((ref) {
  final themeState = ref.watch(learnerThemeControllerProvider);
  return buildLearnerTheme(
    gradeBand: themeState.gradeBand,
    useDyslexiaFont: themeState.useDyslexiaFont,
    useHighContrast: themeState.useHighContrast,
    useReducedMotion: themeState.useReducedMotion,
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// GAMIFICATION THEME EXTENSION
// ══════════════════════════════════════════════════════════════════════════════

/// Theme extension for gamification colors.
///
/// Access via `Theme.of(context).extension<LearnerGamificationExtension>()`
class LearnerGamificationExtension
    extends ThemeExtension<LearnerGamificationExtension> {
  const LearnerGamificationExtension({
    required this.badgeBackground,
    required this.badgeBorder,
    required this.xpGradient,
    required this.streakGradient,
    required this.progressGradient,
    required this.heartFull,
    required this.heartEmpty,
    required this.coinGold,
  });

  final Color badgeBackground;
  final Color badgeBorder;
  final LinearGradient xpGradient;
  final LinearGradient streakGradient;
  final LinearGradient progressGradient;
  final Color heartFull;
  final Color heartEmpty;
  final Color coinGold;

  @override
  LearnerGamificationExtension copyWith({
    Color? badgeBackground,
    Color? badgeBorder,
    LinearGradient? xpGradient,
    LinearGradient? streakGradient,
    LinearGradient? progressGradient,
    Color? heartFull,
    Color? heartEmpty,
    Color? coinGold,
  }) {
    return LearnerGamificationExtension(
      badgeBackground: badgeBackground ?? this.badgeBackground,
      badgeBorder: badgeBorder ?? this.badgeBorder,
      xpGradient: xpGradient ?? this.xpGradient,
      streakGradient: streakGradient ?? this.streakGradient,
      progressGradient: progressGradient ?? this.progressGradient,
      heartFull: heartFull ?? this.heartFull,
      heartEmpty: heartEmpty ?? this.heartEmpty,
      coinGold: coinGold ?? this.coinGold,
    );
  }

  @override
  LearnerGamificationExtension lerp(
    ThemeExtension<LearnerGamificationExtension>? other,
    double t,
  ) {
    if (other is! LearnerGamificationExtension) return this;
    return LearnerGamificationExtension(
      badgeBackground: Color.lerp(badgeBackground, other.badgeBackground, t)!,
      badgeBorder: Color.lerp(badgeBorder, other.badgeBorder, t)!,
      xpGradient: LinearGradient.lerp(xpGradient, other.xpGradient, t)!,
      streakGradient:
          LinearGradient.lerp(streakGradient, other.streakGradient, t)!,
      progressGradient:
          LinearGradient.lerp(progressGradient, other.progressGradient, t)!,
      heartFull: Color.lerp(heartFull, other.heartFull, t)!,
      heartEmpty: Color.lerp(heartEmpty, other.heartEmpty, t)!,
      coinGold: Color.lerp(coinGold, other.coinGold, t)!,
    );
  }
}
