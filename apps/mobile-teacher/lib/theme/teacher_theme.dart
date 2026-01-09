/// Teacher App Theme
///
/// WCAG 2.1 Level AA compliant theme with accessibility options.
/// Addresses RE-AUDIT-004: Mobile Accessibility Compliance
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:flutter_common/theme/aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY STATE
// ══════════════════════════════════════════════════════════════════════════════

class TeacherAccessibilityState {
  final bool useDyslexiaFont;
  final bool useHighContrast;
  final bool reduceMotion;
  final double textScaleFactor;

  const TeacherAccessibilityState({
    this.useDyslexiaFont = false,
    this.useHighContrast = false,
    this.reduceMotion = false,
    this.textScaleFactor = 1.0,
  });

  TeacherAccessibilityState copyWith({
    bool? useDyslexiaFont,
    bool? useHighContrast,
    bool? reduceMotion,
    double? textScaleFactor,
  }) {
    return TeacherAccessibilityState(
      useDyslexiaFont: useDyslexiaFont ?? this.useDyslexiaFont,
      useHighContrast: useHighContrast ?? this.useHighContrast,
      reduceMotion: reduceMotion ?? this.reduceMotion,
      textScaleFactor: textScaleFactor ?? this.textScaleFactor,
    );
  }
}

class TeacherAccessibilityController extends StateNotifier<TeacherAccessibilityState> {
  TeacherAccessibilityController() : super(const TeacherAccessibilityState());

  void setDyslexiaFont(bool value) {
    state = state.copyWith(useDyslexiaFont: value);
  }

  void setHighContrast(bool value) {
    state = state.copyWith(useHighContrast: value);
  }

  void setReduceMotion(bool value) {
    state = state.copyWith(reduceMotion: value);
  }

  void setTextScaleFactor(double value) {
    state = state.copyWith(textScaleFactor: value.clamp(0.8, 2.0));
  }

  void resetToDefaults() {
    state = const TeacherAccessibilityState();
  }
}

final teacherAccessibilityProvider =
    StateNotifierProvider<TeacherAccessibilityController, TeacherAccessibilityState>(
  (ref) => TeacherAccessibilityController(),
);

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER THEME COLORS
// ══════════════════════════════════════════════════════════════════════════════

/// Teacher-specific colors - professional blue/teal variant.
class _TeacherColors {
  // Primary - Teal for professional educator context
  static const primary = Color(0xFF0D9488); // teal-600

  // Secondary - Lighter teal for secondary actions
  static const secondary = Color(0xFF14B8A6); // teal-500

  // CTA - Coral for important actions
  static const cta = Color(0xFFFF6B6B); // coral-500

  // Backgrounds
  static const background = Color(0xFFF8FAFC); // slate-50
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFF1F5F9); // slate-100

  // Text
  static const textPrimary = Color(0xFF0F172A); // slate-900
  static const textSecondary = Color(0xFF475569); // slate-600

  // Semantic
  static const error = Color(0xFFDC2626); // red-600
  static const success = Color(0xFF16A34A); // green-600
  static const warning = Color(0xFFD97706); // amber-600
  static const info = Color(0xFF0284C7); // sky-600
}

/// High contrast colors for accessibility.
class _HighContrastColors {
  static const primary = Color(0xFF0F766E); // teal-700
  static const secondary = Color(0xFF0D9488); // teal-600
  static const cta = Color(0xFFC92A2A); // darker coral
  static const background = Colors.white;
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFE2E8F0); // slate-200
  static const textPrimary = Color(0xFF000000);
  static const textSecondary = Color(0xFF1E293B); // slate-800
  static const error = Color(0xFFB91C1C); // red-700
  static const success = Color(0xFF15803D); // green-700
  // ignore: unused_field
  static const warning = Color(0xFFB45309); // amber-700
}

// ══════════════════════════════════════════════════════════════════════════════
// TEXT THEME
// ══════════════════════════════════════════════════════════════════════════════

TextTheme _buildTeacherTextTheme({bool useDyslexiaFont = false}) {
  final base = useDyslexiaFont
      ? GoogleFonts.lexendTextTheme()
      : GoogleFonts.interTextTheme();

  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      letterSpacing: useDyslexiaFont ? 0.5 : -0.5,
      color: _TeacherColors.textPrimary,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: 26,
      fontWeight: FontWeight.w700,
      color: _TeacherColors.textPrimary,
    ),
    headlineSmall: base.headlineSmall?.copyWith(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: _TeacherColors.textPrimary,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: _TeacherColors.textPrimary,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: _TeacherColors.textPrimary,
    ),
    bodyLarge: base.bodyLarge?.copyWith(
      fontSize: 17,
      fontWeight: FontWeight.w400,
      height: 1.6,
      letterSpacing: useDyslexiaFont ? 0.5 : 0,
      color: _TeacherColors.textPrimary,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      height: 1.5,
      letterSpacing: useDyslexiaFont ? 0.3 : 0,
      color: _TeacherColors.textSecondary,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      color: _TeacherColors.textPrimary,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      color: _TeacherColors.textSecondary,
    ),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME BUILDER
// ══════════════════════════════════════════════════════════════════════════════

ThemeData buildTeacherTheme({
  bool useDyslexiaFont = false,
  bool useHighContrast = false,
}) {
  final textTheme = _buildTeacherTextTheme(useDyslexiaFont: useDyslexiaFont);

  final primary = useHighContrast ? _HighContrastColors.primary : _TeacherColors.primary;
  final secondary = useHighContrast ? _HighContrastColors.secondary : _TeacherColors.secondary;
  final cta = useHighContrast ? _HighContrastColors.cta : _TeacherColors.cta;
  final background = useHighContrast ? _HighContrastColors.background : _TeacherColors.background;
  final surface = useHighContrast ? _HighContrastColors.surface : _TeacherColors.surface;
  final surfaceMuted = useHighContrast ? _HighContrastColors.surfaceMuted : _TeacherColors.surfaceMuted;
  final textPrimary = useHighContrast ? _HighContrastColors.textPrimary : _TeacherColors.textPrimary;
  final textSecondary = useHighContrast ? _HighContrastColors.textSecondary : _TeacherColors.textSecondary;
  final error = useHighContrast ? _HighContrastColors.error : _TeacherColors.error;
  final success = useHighContrast ? _HighContrastColors.success : _TeacherColors.success;

  final colorScheme = ColorScheme.light(
    primary: primary,
    onPrimary: Colors.white,
    primaryContainer: primary.withOpacity(0.1),
    onPrimaryContainer: primary,
    secondary: secondary,
    onSecondary: Colors.white,
    secondaryContainer: secondary.withOpacity(0.1),
    onSecondaryContainer: secondary,
    tertiary: cta,
    onTertiary: Colors.white,
    error: error,
    onError: Colors.white,
    errorContainer: error.withOpacity(0.1),
    onErrorContainer: error,
    surface: surface,
    onSurface: textPrimary,
    surfaceContainerHighest: surfaceMuted,
    onSurfaceVariant: textSecondary,
    outline: useHighContrast ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
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
      titleTextStyle: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
    ),

    // Cards
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: useHighContrast ? const Color(0xFF94A3B8) : const Color(0xFFE2E8F0),
          width: useHighContrast ? 2 : 1,
        ),
      ),
      surfaceTintColor: Colors.transparent,
    ),

    // Primary Button
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        minimumSize: const Size(48, 52), // WCAG touch target
        elevation: 0,
      ),
    ),

    // CTA Button
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: cta,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        minimumSize: const Size(48, 52),
      ),
    ),

    // Outline Button
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: primary, width: useHighContrast ? 2 : 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        minimumSize: const Size(48, 52),
      ),
    ),

    // Text Button
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        minimumSize: const Size(48, 44),
      ),
    ),

    // Input Fields
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceMuted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: useHighContrast ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
          width: useHighContrast ? 2 : 1,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: useHighContrast ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
          width: useHighContrast ? 2 : 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: error, width: useHighContrast ? 2 : 1),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: error, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),

    // Bottom Navigation
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: surface,
      selectedItemColor: primary,
      unselectedItemColor: const Color(0xFF94A3B8),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),

    // FAB
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: cta,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),

    // Checkbox with WCAG compliant focus
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return primary;
        return Colors.transparent;
      }),
      side: BorderSide(color: textSecondary, width: useHighContrast ? 2 : 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),

    // Switch
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return primary;
        return const Color(0xFF94A3B8);
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return primary.withOpacity(0.3);
        return const Color(0xFFE2E8F0);
      }),
    ),

    // Dialog
    dialogTheme: DialogThemeData(
      backgroundColor: surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titleTextStyle: textTheme.headlineSmall,
      contentTextStyle: textTheme.bodyMedium,
    ),

    // Snackbar
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF1E293B),
      contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),

    // Extensions
    extensions: [
      AivoColors(
        primary: primary,
        secondary: secondary,
        accent: cta,
        background: background,
        surface: surface,
        surfaceVariant: surfaceMuted,
        textPrimary: textPrimary,
        textSecondary: textSecondary,
        error: error,
        success: success,
        warning: _TeacherColors.warning,
        info: _TeacherColors.info,
        outline: useHighContrast ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
        coral: AivoBrandColors.coral,
        mint: AivoBrandColors.mint,
        sunshine: AivoBrandColors.sunshine,
        sky: AivoBrandColors.sky,
      ),
    ],
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

final teacherThemeProvider = Provider<ThemeData>((ref) {
  final accessibility = ref.watch(teacherAccessibilityProvider);
  return buildTeacherTheme(
    useDyslexiaFont: accessibility.useDyslexiaFont,
    useHighContrast: accessibility.useHighContrast,
  );
});
