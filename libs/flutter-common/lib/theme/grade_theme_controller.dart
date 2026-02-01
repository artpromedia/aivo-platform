import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ══════════════════════════════════════════════════════════════════════════════

/// Storage key for persisted theme preference
const String kThemeStorageKey = 'aivo:grade-theme';

/// Storage key for persisted dark mode preference
const String kDarkModeStorageKey = 'aivo:dark-mode';

// ══════════════════════════════════════════════════════════════════════════════
// THEME STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Immutable state object for theme configuration.
@immutable
class AivoThemeState {
  const AivoThemeState({
    required this.gradeBand,
    this.isDarkMode = false,
  });

  /// The current grade band (Explorer, Navigator, Scholar)
  final AivoGradeBand gradeBand;

  /// Whether dark mode is enabled (only applies to Scholar)
  final bool isDarkMode;

  /// Whether dark mode is available for the current grade band.
  /// Dark mode is ONLY available for Scholar (G9-12) to match web behavior.
  bool get canToggleDarkMode => gradeBand == AivoGradeBand.g9_12;

  /// Effective dark mode state (only true if Scholar AND dark mode enabled)
  bool get effectiveIsDark => canToggleDarkMode && isDarkMode;

  /// Get the appropriate ThemeData for current state
  ThemeData get theme {
    if (effectiveIsDark) {
      return darkThemeForBand(gradeBand);
    }
    return themeForBand(gradeBand);
  }

  /// Get the theme brightness
  Brightness get brightness => effectiveIsDark ? Brightness.dark : Brightness.light;

  /// Get the theme label
  String get themeLabel {
    final baseLabel = themeLabelForBand(gradeBand);
    if (effectiveIsDark) {
      return '$baseLabel Dark';
    }
    return baseLabel;
  }

  AivoThemeState copyWith({
    AivoGradeBand? gradeBand,
    bool? isDarkMode,
  }) {
    return AivoThemeState(
      gradeBand: gradeBand ?? this.gradeBand,
      isDarkMode: isDarkMode ?? this.isDarkMode,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AivoThemeState &&
        other.gradeBand == gradeBand &&
        other.isDarkMode == isDarkMode;
  }

  @override
  int get hashCode => Object.hash(gradeBand, isDarkMode);

  @override
  String toString() => 'AivoThemeState(gradeBand: $gradeBand, isDarkMode: $isDarkMode)';
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

/// Controller for managing the active grade-based theme and dark mode.
/// 
/// AIVO uses three age-based themes:
/// - Explorer (k5): Pre-K through 5th grade
/// - Navigator (g6_8): 6th through 8th grade  
/// - Scholar (g9_12): 9th through 12th grade
/// 
/// Dark mode is ONLY available for Scholar (G9-12) to match web behavior.
/// This is intentional as younger users benefit from brighter, more colorful themes.
class GradeThemeController extends StateNotifier<AivoThemeState> {
  GradeThemeController({
    AivoGradeBand initialBand = AivoGradeBand.g6_8,
    bool initialDarkMode = false,
    this.respectSystemPreferences = true,
  }) : super(AivoThemeState(
          gradeBand: initialBand,
          isDarkMode: initialDarkMode,
        )) {
    _init();
  }

  /// Whether to respect system dark mode preference
  final bool respectSystemPreferences;

  bool _initialized = false;

  /// Initialize the controller, loading persisted preferences
  Future<void> _init() async {
    if (_initialized) return;
    _initialized = true;

    // Load persisted preferences
    await _loadPersistedPreferences();

    // If respecting system preferences and no persisted dark mode, check system
    if (respectSystemPreferences && state.gradeBand == AivoGradeBand.g9_12) {
      final systemDark = _getSystemDarkModePreference();
      if (systemDark && !state.isDarkMode) {
        state = state.copyWith(isDarkMode: true);
      }
    }
  }

  /// Load preferences from SharedPreferences
  Future<void> _loadPersistedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Load grade band
      final storedBand = prefs.getString(kThemeStorageKey);
      if (storedBand != null) {
        final band = AivoGradeBand.values.firstWhere(
          (b) => b.name == storedBand,
          orElse: () => state.gradeBand,
        );
        state = state.copyWith(gradeBand: band);
      }

      // Load dark mode preference
      final storedDark = prefs.getBool(kDarkModeStorageKey);
      if (storedDark != null) {
        state = state.copyWith(isDarkMode: storedDark);
      }
    } catch (e) {
      // SharedPreferences might not be available in some test environments
      debugPrint('Failed to load theme preferences: $e');
    }
  }

  /// Persist current preferences
  Future<void> _persistPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(kThemeStorageKey, state.gradeBand.name);
      await prefs.setBool(kDarkModeStorageKey, state.isDarkMode);
    } catch (e) {
      debugPrint('Failed to persist theme preferences: $e');
    }
  }

  /// Get system dark mode preference
  bool _getSystemDarkModePreference() {
    final brightness = SchedulerBinding.instance.platformDispatcher.platformBrightness;
    return brightness == Brightness.dark;
  }

  /// Set the grade band
  void setGradeBand(AivoGradeBand band) {
    if (state.gradeBand == band) return;
    
    // When switching away from Scholar, disable dark mode
    final newDarkMode = band == AivoGradeBand.g9_12 ? state.isDarkMode : false;
    
    state = state.copyWith(gradeBand: band, isDarkMode: newDarkMode);
    _persistPreferences();
  }

  /// Set grade band from grade number
  void fromGrade(int? grade) {
    setGradeBand(bandFromGrade(grade));
  }

  /// Toggle dark mode (only works for Scholar)
  void toggleDarkMode() {
    if (!state.canToggleDarkMode) return;
    state = state.copyWith(isDarkMode: !state.isDarkMode);
    _persistPreferences();
  }

  /// Set dark mode explicitly
  void setDarkMode(bool isDark) {
    if (!state.canToggleDarkMode) return;
    if (state.isDarkMode == isDark) return;
    state = state.copyWith(isDarkMode: isDark);
    _persistPreferences();
  }

  /// Reset to defaults
  void reset() {
    state = const AivoThemeState(
      gradeBand: AivoGradeBand.g6_8,
      isDarkMode: false,
    );
    _persistPreferences();
  }

  /// Get the theme label for the current grade band
  String get themeLabel => state.themeLabel;
}

// ══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the theme controller
final gradeThemeControllerProvider =
    StateNotifierProvider<GradeThemeController, AivoThemeState>(
  (ref) => GradeThemeController(),
);

/// Provider for just the grade band (backwards compatibility)
final gradeBandProvider = Provider<AivoGradeBand>((ref) {
  return ref.watch(gradeThemeControllerProvider).gradeBand;
});

/// Provider for the theme data
final gradeThemeProvider = Provider<ThemeData>((ref) {
  return ref.watch(gradeThemeControllerProvider).theme;
});

/// Provider for dark mode state
final isDarkModeProvider = Provider<bool>((ref) {
  return ref.watch(gradeThemeControllerProvider).effectiveIsDark;
});

/// Provider for whether dark mode can be toggled
final canToggleDarkModeProvider = Provider<bool>((ref) {
  return ref.watch(gradeThemeControllerProvider).canToggleDarkMode;
});

/// Provider for theme brightness
final themeBrightnessProvider = Provider<Brightness>((ref) {
  return ref.watch(gradeThemeControllerProvider).brightness;
});

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Maps a grade number to the appropriate theme band.
/// 
/// - Grades 0-5: Explorer (k5)
/// - Grades 6-8: Navigator (g6_8)
/// - Grades 9+: Scholar (g9_12)
AivoGradeBand bandFromGrade(int? grade, {AivoGradeBand fallback = AivoGradeBand.g6_8}) {
  if (grade == null || grade <= 0) return fallback;
  if (grade <= 5) return AivoGradeBand.k5;
  if (grade <= 8) return AivoGradeBand.g6_8;
  return AivoGradeBand.g9_12;
}

/// Get the theme label for a grade band
String themeLabelForBand(AivoGradeBand band) {
  switch (band) {
    case AivoGradeBand.k5:
      return 'Explorer';
    case AivoGradeBand.g6_8:
      return 'Navigator';
    case AivoGradeBand.g9_12:
      return 'Scholar';
  }
}

/// Get the theme labels map matching web format
Map<String, String> get themeLabels => {
  'k5': 'Explorer (K-5)',
  'g6_8': 'Navigator (6-8)',
  'g9_12': 'Scholar (9-12)',
  'g9_12_dark': 'Scholar Dark',
};
