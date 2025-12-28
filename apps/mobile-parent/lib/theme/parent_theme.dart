import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

// Import shared brand colors
import 'package:flutter_common/theme/aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY STATE
// ══════════════════════════════════════════════════════════════════════════════

class AccessibilityState {
  final bool useDyslexiaFont;
  final bool useHighContrast;
  final double textScaleFactor;

  const AccessibilityState({
    this.useDyslexiaFont = false,
    this.useHighContrast = false,
    this.textScaleFactor = 1.0,
  });

  AccessibilityState copyWith({
    bool? useDyslexiaFont,
    bool? useHighContrast,
    double? textScaleFactor,
  }) {
    return AccessibilityState(
      useDyslexiaFont: useDyslexiaFont ?? this.useDyslexiaFont,
      useHighContrast: useHighContrast ?? this.useHighContrast,
      textScaleFactor: textScaleFactor ?? this.textScaleFactor,
    );
  }
}

class AccessibilityController extends StateNotifier<AccessibilityState> {
  AccessibilityController() : super(const AccessibilityState());

  void setDyslexiaFont(bool value) {
    state = state.copyWith(useDyslexiaFont: value);
  }

  void setHighContrast(bool value) {
    state = state.copyWith(useHighContrast: value);
  }

  void setTextScaleFactor(double value) {
    state = state.copyWith(textScaleFactor: value.clamp(0.8, 2.0));
  }

  void resetToDefaults() {
    state = const AccessibilityState();
  }
}

final accessibilityControllerProvider =
    StateNotifierProvider<AccessibilityController, AccessibilityState>(
  (ref) => AccessibilityController(),
);

// ══════════════════════════════════════════════════════════════════════════════
// PARENT THEME COLORS
// Aligned with Marketing Website - Professional variant
// ══════════════════════════════════════════════════════════════════════════════

/// Parent-specific colors using the AIVO brand palette.
/// Slightly more subdued for professional/parent context.
class _ParentColors {
  // Primary - AIVO Violet (slightly deeper for professionalism)
  static const primary = Color(0xFF7C3AED); // primary-600 for more gravitas

  // Secondary - Using violet-400 for softer secondary actions
  static const secondary = Color(0xFFA78BFA); // primary-400

  // CTA - Coral (same as marketing for consistency)
  static const cta = Color(0xFFFF6B6B); // coral-500

  // Backgrounds - Clean, professional
  static const background = Color(0xFFFAFAFA); // gray-50
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFF4F4F5); // gray-100

  // Text
  static const textPrimary = Color(0xFF18181B); // gray-900
  static const textSecondary = Color(0xFF52525B); // gray-600

  // Semantic
  static const error = Color(0xFFEF4444); // red-500
  static const success = Color(0xFF10B981); // mint-500
  static const warning = Color(0xFFFBBF24); // sunshine-400
  static const info = Color(0xFF0EA5E9); // sky-500
}

/// High contrast variant for accessibility.
class _HighContrastColors {
  static const primary = Color(0xFF5B21B6); // primary-800
  static const secondary = Color(0xFF6D28D9); // primary-700
  static const cta = Color(0xFFC92A2A); // coral-900
  static const background = Color(0xFFFFFFFF);
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFE4E4E7); // gray-200
  static const textPrimary = Color(0xFF000000);
  static const textSecondary = Color(0xFF27272A); // gray-800
  static const error = Color(0xFFB91C1C); // red-700
  static const success = Color(0xFF047857); // mint-700
  // ignore: unused_field - part of color palette API
  static const warning = Color(0xFFB45309); // sunshine-700
}

// ══════════════════════════════════════════════════════════════════════════════
// TEXT THEME
// ══════════════════════════════════════════════════════════════════════════════

/// Build text theme with optional dyslexia-friendly font.
TextTheme _buildParentTextTheme({bool useDyslexiaFont = false}) {
  // Lexend is a more readable alternative available in Google Fonts
  final base = useDyslexiaFont
      ? GoogleFonts.lexendTextTheme()
      : GoogleFonts.interTextTheme();

  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      letterSpacing: useDyslexiaFont ? 0.5 : -0.5,
      color: _ParentColors.textPrimary,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: 26,
      fontWeight: FontWeight.w700,
      color: _ParentColors.textPrimary,
    ),
    headlineSmall: base.headlineSmall?.copyWith(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: _ParentColors.textPrimary,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: _ParentColors.textPrimary,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: _ParentColors.textPrimary,
    ),
    bodyLarge: base.bodyLarge?.copyWith(
      fontSize: 17,
      fontWeight: FontWeight.w400,
      height: 1.6,
      letterSpacing: useDyslexiaFont ? 0.5 : 0,
      color: _ParentColors.textPrimary,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      height: 1.5,
      letterSpacing: useDyslexiaFont ? 0.3 : 0,
      color: _ParentColors.textSecondary,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
      color: _ParentColors.textPrimary,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      color: _ParentColors.textSecondary,
    ),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME BUILDER
// ══════════════════════════════════════════════════════════════════════════════

/// Build the parent app theme with accessibility options.
ThemeData buildParentTheme({
  bool useDyslexiaFont = false,
  bool useHighContrast = false,
}) {
  final textTheme = _buildParentTextTheme(useDyslexiaFont: useDyslexiaFont);

  // Select color palette based on contrast mode
  final primary =
      useHighContrast ? _HighContrastColors.primary : _ParentColors.primary;
  final secondary =
      useHighContrast ? _HighContrastColors.secondary : _ParentColors.secondary;
  final cta = useHighContrast ? _HighContrastColors.cta : _ParentColors.cta;
  final background = useHighContrast
      ? _HighContrastColors.background
      : _ParentColors.background;
  final surface =
      useHighContrast ? _HighContrastColors.surface : _ParentColors.surface;
  final surfaceMuted = useHighContrast
      ? _HighContrastColors.surfaceMuted
      : _ParentColors.surfaceMuted;
  final textPrimary = useHighContrast
      ? _HighContrastColors.textPrimary
      : _ParentColors.textPrimary;
  final textSecondary = useHighContrast
      ? _HighContrastColors.textSecondary
      : _ParentColors.textSecondary;
  final error =
      useHighContrast ? _HighContrastColors.error : _ParentColors.error;
  final success =
      useHighContrast ? _HighContrastColors.success : _ParentColors.success;

  final colorScheme = ColorScheme.light(
    primary: primary,
    onPrimary: Colors.white,
    primaryContainer: primary.withOpacity(0.1),
    onPrimaryContainer: primary,
    secondary: secondary,
    onSecondary: Colors.white,
    secondaryContainer: secondary.withOpacity(0.1),
    onSecondaryContainer: secondary,
    tertiary: cta, // Coral for CTAs
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

    // Cards
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        minimumSize: const Size(48, 52),
        elevation: 0,
      ),
    ),

    // CTA Button (Coral)
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
        side: BorderSide(
          color: primary,
          width: useHighContrast ? 2 : 1.5,
        ),
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
          color: useHighContrast
              ? const Color(0xFF71717A)
              : const Color(0xFFD4D4D8),
          width: useHighContrast ? 2 : 1,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: useHighContrast
              ? const Color(0xFF71717A)
              : const Color(0xFFD4D4D8),
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
      selectedLabelStyle:
          textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
      unselectedLabelStyle: textTheme.labelMedium,
    ),

    // Floating Action Button (Coral CTA)
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: cta,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),

    // Chips
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      backgroundColor: surfaceMuted,
      selectedColor: primary.withOpacity(0.15),
      labelStyle: textTheme.labelMedium?.copyWith(color: textSecondary),
      secondaryLabelStyle: textTheme.labelMedium?.copyWith(
        color: textPrimary,
        fontWeight: FontWeight.w600,
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),

    // Dialog
    dialogTheme: DialogThemeData(
      backgroundColor: surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titleTextStyle: textTheme.headlineSmall,
      contentTextStyle: textTheme.bodyMedium,
    ),

    // Bottom Sheet
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
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
        warning: _ParentColors.warning,
        info: _ParentColors.info,
        outline:
            useHighContrast ? const Color(0xFF71717A) : const Color(0xFFD4D4D8),
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

final parentThemeProvider = Provider<ThemeData>((ref) {
  final accessibility = ref.watch(accessibilityControllerProvider);
  return buildParentTheme(
    useDyslexiaFont: accessibility.useDyslexiaFont,
    useHighContrast: accessibility.useHighContrast,
  );
});
