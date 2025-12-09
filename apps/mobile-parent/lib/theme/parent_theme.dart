import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Accessibility settings state.
@immutable
class AccessibilityState {
  const AccessibilityState({
    this.useDyslexiaFont = false,
    this.useHighContrast = false,
    this.textScaleFactor = 1.0,
    this.isLoaded = false,
  });

  final bool useDyslexiaFont;
  final bool useHighContrast;
  final double textScaleFactor;
  final bool isLoaded;

  AccessibilityState copyWith({
    bool? useDyslexiaFont,
    bool? useHighContrast,
    double? textScaleFactor,
    bool? isLoaded,
  }) {
    return AccessibilityState(
      useDyslexiaFont: useDyslexiaFont ?? this.useDyslexiaFont,
      useHighContrast: useHighContrast ?? this.useHighContrast,
      textScaleFactor: textScaleFactor ?? this.textScaleFactor,
      isLoaded: isLoaded ?? this.isLoaded,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

/// Controller for accessibility settings.
class AccessibilityController extends StateNotifier<AccessibilityState> {
  AccessibilityController() : super(const AccessibilityState()) {
    _loadSettings();
  }

  static const _keyDyslexiaFont = 'a11y_dyslexia_font';
  static const _keyHighContrast = 'a11y_high_contrast';
  static const _keyTextScale = 'a11y_text_scale';

  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      state = AccessibilityState(
        useDyslexiaFont: prefs.getBool(_keyDyslexiaFont) ?? false,
        useHighContrast: prefs.getBool(_keyHighContrast) ?? false,
        textScaleFactor: prefs.getDouble(_keyTextScale) ?? 1.0,
        isLoaded: true,
      );
    } catch (_) {
      state = state.copyWith(isLoaded: true);
    }
  }

  Future<void> setDyslexiaFont(bool enabled) async {
    state = state.copyWith(useDyslexiaFont: enabled);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyDyslexiaFont, enabled);
  }

  Future<void> setHighContrast(bool enabled) async {
    state = state.copyWith(useHighContrast: enabled);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyHighContrast, enabled);
  }

  Future<void> setTextScaleFactor(double scale) async {
    state = state.copyWith(textScaleFactor: scale.clamp(0.8, 1.5));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_keyTextScale, state.textScaleFactor);
  }

  void resetToDefaults() async {
    state = const AccessibilityState(isLoaded: true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyDyslexiaFont);
    await prefs.remove(_keyHighContrast);
    await prefs.remove(_keyTextScale);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

final accessibilityControllerProvider =
    StateNotifierProvider<AccessibilityController, AccessibilityState>(
  (ref) => AccessibilityController(),
);

// ══════════════════════════════════════════════════════════════════════════════
// PARENT THEME
// ══════════════════════════════════════════════════════════════════════════════

/// Parent-specific colors - neutral and professional.
class _ParentColors {
  static const primary = Color(0xFF2563EB); // Blue
  static const secondary = Color(0xFF7C3AED); // Purple
  static const background = Color(0xFFF8FAFC);
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFF1F5F9);
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF475569);
  static const error = Color(0xFFDC2626);
  // ignore: unused_field - part of color palette API
  static const success = Color(0xFF16A34A);
  // ignore: unused_field - part of color palette API
  static const warning = Color(0xFFD97706);
}

/// High contrast variant for accessibility.
class _HighContrastColors {
  static const primary = Color(0xFF1E40AF); // Darker blue
  static const secondary = Color(0xFF5B21B6); // Darker purple
  static const background = Color(0xFFFFFFFF);
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFE2E8F0);
  static const textPrimary = Color(0xFF000000);
  static const textSecondary = Color(0xFF1E293B);
  static const error = Color(0xFFB91C1C);
  // ignore: unused_field - part of color palette API
  static const success = Color(0xFF15803D);
  // ignore: unused_field - part of color palette API
  static const warning = Color(0xFFB45309);
}

/// Build text theme with optional dyslexia-friendly font.
TextTheme _buildParentTextTheme({bool useDyslexiaFont = false}) {
  // OpenDyslexic or similar dyslexia-friendly font
  // Using Lexend as a more readable alternative available in Google Fonts
  final base = useDyslexiaFont
      ? GoogleFonts.lexendTextTheme()
      : GoogleFonts.interTextTheme();

  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      letterSpacing: useDyslexiaFont ? 0.5 : 0,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontSize: 26,
      fontWeight: FontWeight.w700,
      letterSpacing: useDyslexiaFont ? 0.3 : 0,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      letterSpacing: useDyslexiaFont ? 0.2 : 0,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      letterSpacing: useDyslexiaFont ? 0.2 : 0,
    ),
    titleSmall: base.titleSmall?.copyWith(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      letterSpacing: useDyslexiaFont ? 0.1 : 0,
    ),
    bodyLarge: base.bodyLarge?.copyWith(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: useDyslexiaFont ? 1.6 : 1.5,
      letterSpacing: useDyslexiaFont ? 0.2 : 0,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: useDyslexiaFont ? 1.6 : 1.5,
      letterSpacing: useDyslexiaFont ? 0.1 : 0,
    ),
    bodySmall: base.bodySmall?.copyWith(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: useDyslexiaFont ? 1.5 : 1.4,
      letterSpacing: useDyslexiaFont ? 0.1 : 0,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: useDyslexiaFont ? 0.2 : 0.1,
    ),
  );
}

/// Build parent theme with accessibility options.
ThemeData buildParentTheme({
  bool useDyslexiaFont = false,
  bool useHighContrast = false,
}) {
  final textTheme = _buildParentTextTheme(useDyslexiaFont: useDyslexiaFont);

  final colorScheme = ColorScheme.light(
    primary: useHighContrast ? _HighContrastColors.primary : _ParentColors.primary,
    secondary: useHighContrast ? _HighContrastColors.secondary : _ParentColors.secondary,
    surface: useHighContrast ? _HighContrastColors.surface : _ParentColors.surface,
    error: useHighContrast ? _HighContrastColors.error : _ParentColors.error,
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onSurface: useHighContrast ? _HighContrastColors.textPrimary : _ParentColors.textPrimary,
    onError: Colors.white,
    surfaceContainerHighest: useHighContrast ? _HighContrastColors.surfaceMuted : _ParentColors.surfaceMuted,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: useHighContrast ? _HighContrastColors.background : _ParentColors.background,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: useHighContrast ? _HighContrastColors.surface : _ParentColors.surface,
      foregroundColor: useHighContrast ? _HighContrastColors.textPrimary : _ParentColors.textPrimary,
      centerTitle: true,
      elevation: useHighContrast ? 2 : 0,
    ),
    cardTheme: CardThemeData(
      color: useHighContrast ? _HighContrastColors.surface : _ParentColors.surface,
      elevation: useHighContrast ? 2 : 1,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: useHighContrast
            ? const BorderSide(color: Color(0xFFCBD5E1), width: 1)
            : BorderSide.none,
      ),
    ),
    dividerTheme: DividerThemeData(
      color: useHighContrast ? const Color(0xFF94A3B8) : const Color(0xFFE2E8F0),
      thickness: useHighContrast ? 2 : 1,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: useHighContrast ? _HighContrastColors.primary : _ParentColors.primary,
        foregroundColor: Colors.white,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        minimumSize: const Size(48, 48), // Ensure touch target size
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: useHighContrast ? _HighContrastColors.primary : _ParentColors.primary,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(
          color: useHighContrast ? _HighContrastColors.primary : _ParentColors.primary,
          width: useHighContrast ? 2 : 1,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        minimumSize: const Size(48, 48),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: useHighContrast ? _HighContrastColors.primary : _ParentColors.primary,
        textStyle: textTheme.labelLarge?.copyWith(
          decoration: useHighContrast ? TextDecoration.underline : null,
        ),
        minimumSize: const Size(48, 48),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return useHighContrast ? _HighContrastColors.primary : _ParentColors.primary;
        }
        return const Color(0xFF94A3B8);
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return (useHighContrast ? _HighContrastColors.primary : _ParentColors.primary)
              .withOpacity(0.3);
        }
        return const Color(0xFFE2E8F0);
      }),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return useHighContrast ? _HighContrastColors.primary : _ParentColors.primary;
        }
        return Colors.transparent;
      }),
      side: BorderSide(
        color: useHighContrast ? _HighContrastColors.textSecondary : _ParentColors.textSecondary,
        width: useHighContrast ? 2 : 1.5,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
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
        borderSide: BorderSide(
          color: useHighContrast ? _HighContrastColors.primary : _ParentColors.primary,
          width: 2,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: useHighContrast ? _HighContrastColors.error : _ParentColors.error,
          width: 2,
        ),
      ),
      filled: true,
      fillColor: useHighContrast ? Colors.white : _ParentColors.surfaceMuted.withOpacity(0.5),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
}

/// Provider for parent theme with accessibility settings applied.
final parentThemeProvider = Provider<ThemeData>((ref) {
  final a11y = ref.watch(accessibilityControllerProvider);
  return buildParentTheme(
    useDyslexiaFont: a11y.useDyslexiaFont,
    useHighContrast: a11y.useHighContrast,
  );
});
