/// Accessibility Controller
///
/// Comprehensive accessibility state management matching web implementation.
/// Features: high contrast, dyslexia-friendly, reduced motion, large text.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/aivo_brand.dart';

// ══════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS - Match web implementation
// ══════════════════════════════════════════════════════════════════════════════

/// Storage key for accessibility preferences (matches web 'aivo:a11y-preferences')
const String kAccessibilityStorageKey = 'aivo:a11y-preferences';

/// Individual preference keys
const String kHighContrastKey = 'highContrast';
const String kDyslexiaFontKey = 'dyslexia';
const String kReducedMotionKey = 'reducedMotion';
const String kLargeTextKey = 'largeText';
const String kTextScaleKey = 'textScale';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/// Large text mode scale multiplier (1.2x as specified)
const double kLargeTextScale = 1.2;

/// Maximum text scale factor allowed
const double kMaxTextScale = 2.0;

/// Minimum text scale factor allowed
const double kMinTextScale = 0.8;

/// High contrast border width multiplier (2x as specified)
const double kHighContrastBorderMultiplier = 2.0;

/// Dyslexia-friendly letter spacing (0.05em equivalent)
const double kDyslexiaLetterSpacing = 0.05;

/// Dyslexia-friendly word spacing (0.1em equivalent)
const double kDyslexiaWordSpacing = 0.1;

/// Dyslexia-friendly line height multiplier
const double kDyslexiaLineHeightMultiplier = 1.5;

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Immutable state object for accessibility preferences.
/// 
/// Matches web `AccessibilityPreferences` interface:
/// - highContrast: Enhanced color contrast ratios, 2x border widths
/// - dyslexia: Atkinson Hyperlegible font with increased spacing
/// - reducedMotion: Disables all animations
/// - largeText: 1.2x text scale multiplier
@immutable
class AivoAccessibilityState {
  const AivoAccessibilityState({
    this.highContrast = false,
    this.dyslexia = false,
    this.reducedMotion = false,
    this.largeText = false,
    this.textScale = 1.0,
  });

  /// High contrast mode - increases border widths, enhanced contrast ratios
  final bool highContrast;

  /// Dyslexia-friendly mode - Atkinson Hyperlegible font with spacing
  final bool dyslexia;

  /// Reduced motion mode - disables all animations
  final bool reducedMotion;

  /// Large text mode - 1.2x text scale
  final bool largeText;

  /// Custom text scale factor (independent of largeText toggle)
  final double textScale;

  /// Calculate effective text scale
  double get effectiveTextScale {
    double scale = textScale;
    if (largeText) {
      scale *= kLargeTextScale;
    }
    return scale.clamp(kMinTextScale, kMaxTextScale);
  }

  /// Calculate letter spacing for a given font size
  double letterSpacingFor(double fontSize) {
    return dyslexia ? fontSize * kDyslexiaLetterSpacing : 0;
  }

  /// Calculate word spacing for a given font size
  double wordSpacingFor(double fontSize) {
    return dyslexia ? fontSize * kDyslexiaWordSpacing : 0;
  }

  /// Get border width multiplier
  double get borderWidthMultiplier => highContrast ? kHighContrastBorderMultiplier : 1.0;

  /// Get line height multiplier for dyslexia mode
  double get lineHeightMultiplier => dyslexia ? kDyslexiaLineHeightMultiplier : 1.0;

  /// Get the preferred font family
  String get fontFamily => dyslexia 
      ? AivoBrand.fontFamilyDyslexia 
      : AivoBrand.brandFont;

  /// Check if any accessibility feature is enabled
  bool get hasAnyFeatureEnabled => 
      highContrast || dyslexia || reducedMotion || largeText;

  /// Get animation duration (zero if reduced motion)
  Duration animationDuration(Duration normal) {
    return reducedMotion ? Duration.zero : normal;
  }

  /// Get animation curve (linear/instant if reduced motion)
  Curve animationCurve(Curve normal) {
    return reducedMotion ? Curves.linear : normal;
  }

  AivoAccessibilityState copyWith({
    bool? highContrast,
    bool? dyslexia,
    bool? reducedMotion,
    bool? largeText,
    double? textScale,
  }) {
    return AivoAccessibilityState(
      highContrast: highContrast ?? this.highContrast,
      dyslexia: dyslexia ?? this.dyslexia,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      largeText: largeText ?? this.largeText,
      textScale: textScale ?? this.textScale,
    );
  }

  /// Convert to JSON map for persistence
  Map<String, dynamic> toJson() => {
    kHighContrastKey: highContrast,
    kDyslexiaFontKey: dyslexia,
    kReducedMotionKey: reducedMotion,
    kLargeTextKey: largeText,
    kTextScaleKey: textScale,
  };

  /// Create from JSON map
  factory AivoAccessibilityState.fromJson(Map<String, dynamic> json) {
    return AivoAccessibilityState(
      highContrast: json[kHighContrastKey] as bool? ?? false,
      dyslexia: json[kDyslexiaFontKey] as bool? ?? false,
      reducedMotion: json[kReducedMotionKey] as bool? ?? false,
      largeText: json[kLargeTextKey] as bool? ?? false,
      textScale: (json[kTextScaleKey] as num?)?.toDouble() ?? 1.0,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AivoAccessibilityState &&
        other.highContrast == highContrast &&
        other.dyslexia == dyslexia &&
        other.reducedMotion == reducedMotion &&
        other.largeText == largeText &&
        other.textScale == textScale;
  }

  @override
  int get hashCode => Object.hash(
    highContrast,
    dyslexia,
    reducedMotion,
    largeText,
    textScale,
  );

  @override
  String toString() => 'AivoAccessibilityState('
      'highContrast: $highContrast, '
      'dyslexia: $dyslexia, '
      'reducedMotion: $reducedMotion, '
      'largeText: $largeText, '
      'textScale: $textScale)';
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

/// Controller for managing accessibility preferences.
/// 
/// Matches web `AccessibilityProvider` functionality:
/// - Persists preferences to SharedPreferences
/// - Respects system settings (reduced motion)
/// - Provides toggle methods matching web API
class AivoAccessibilityController extends StateNotifier<AivoAccessibilityState> {
  AivoAccessibilityController({
    this.respectSystemPreferences = true,
  }) : super(const AivoAccessibilityState()) {
    _init();
  }

  /// Whether to automatically sync with system preferences
  final bool respectSystemPreferences;

  bool _initialized = false;

  /// Initialize the controller
  Future<void> _init() async {
    if (_initialized) return;
    _initialized = true;

    // Load persisted preferences first
    await _loadPersistedPreferences();

    // Then check system preferences (can override persisted)
    if (respectSystemPreferences) {
      _syncWithSystemPreferences();
    }
  }

  /// Load preferences from SharedPreferences
  Future<void> _loadPersistedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(kAccessibilityStorageKey);
      
      if (stored != null) {
        try {
          final Map<String, dynamic> json = 
              Map<String, dynamic>.from(_parseJson(stored));
          state = AivoAccessibilityState.fromJson(json);
        } catch (e) {
          debugPrint('Failed to parse accessibility preferences: $e');
        }
      }
    } catch (e) {
      debugPrint('Failed to load accessibility preferences: $e');
    }
  }

  /// Simple JSON parsing without importing dart:convert in the library
  Map<String, dynamic> _parseJson(String source) {
    // Simple manual parsing for our known format
    final result = <String, dynamic>{};
    
    // Remove braces and split by comma
    final content = source.replaceAll('{', '').replaceAll('}', '').trim();
    if (content.isEmpty) return result;
    
    for (final pair in content.split(',')) {
      final parts = pair.split(':');
      if (parts.length == 2) {
        final key = parts[0].trim().replaceAll('"', '');
        final valueStr = parts[1].trim();
        
        if (valueStr == 'true') {
          result[key] = true;
        } else if (valueStr == 'false') {
          result[key] = false;
        } else {
          final numValue = double.tryParse(valueStr);
          if (numValue != null) {
            result[key] = numValue;
          } else {
            result[key] = valueStr.replaceAll('"', '');
          }
        }
      }
    }
    
    return result;
  }

  /// Convert map to JSON string
  String _toJsonString(Map<String, dynamic> map) {
    final entries = map.entries.map((e) {
      final value = e.value;
      if (value is String) {
        return '"${e.key}":"$value"';
      } else {
        return '"${e.key}":$value';
      }
    }).join(',');
    return '{$entries}';
  }

  /// Persist current preferences
  Future<void> _persistPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = _toJsonString(state.toJson());
      await prefs.setString(kAccessibilityStorageKey, json);
    } catch (e) {
      debugPrint('Failed to persist accessibility preferences: $e');
    }
  }

  /// Sync with system preferences
  void _syncWithSystemPreferences() {
    // Check system reduced motion preference
    final binding = WidgetsBinding.instance;
    final accessibilityFeatures = binding.platformDispatcher.accessibilityFeatures;
    
    // Check if system prefers reduced motion
    final systemReducedMotion = accessibilityFeatures.reduceMotion ||
        accessibilityFeatures.disableAnimations;
    
    // Check if system prefers high contrast
    final systemHighContrast = accessibilityFeatures.highContrast;
    
    // Check if system prefers bold text
    final systemBoldText = accessibilityFeatures.boldText;
    
    // Apply system preferences if they're enabled and our setting isn't already
    bool changed = false;
    var newState = state;
    
    if (systemReducedMotion && !state.reducedMotion) {
      newState = newState.copyWith(reducedMotion: true);
      changed = true;
    }
    
    if (systemHighContrast && !state.highContrast) {
      newState = newState.copyWith(highContrast: true);
      changed = true;
    }
    
    // Bold text preference could indicate dyslexia-friendly preference
    if (systemBoldText && !state.dyslexia) {
      // Don't auto-enable dyslexia mode for bold text, just note it
    }
    
    if (changed) {
      state = newState;
      // Don't persist system preferences as user preferences
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC API - Matches web AccessibilityProvider
  // ════════════════════════════════════════════════════════════════════════════

  /// Set multiple preferences at once
  void setPreferences({
    bool? highContrast,
    bool? dyslexia,
    bool? reducedMotion,
    bool? largeText,
    double? textScale,
  }) {
    state = state.copyWith(
      highContrast: highContrast,
      dyslexia: dyslexia,
      reducedMotion: reducedMotion,
      largeText: largeText,
      textScale: textScale?.clamp(kMinTextScale, kMaxTextScale),
    );
    _persistPreferences();
  }

  /// Toggle high contrast mode
  void toggleHighContrast() {
    state = state.copyWith(highContrast: !state.highContrast);
    _persistPreferences();
  }

  /// Set high contrast mode explicitly
  void setHighContrast(bool value) {
    if (state.highContrast == value) return;
    state = state.copyWith(highContrast: value);
    _persistPreferences();
  }

  /// Toggle dyslexia-friendly mode
  void toggleDyslexia() {
    state = state.copyWith(dyslexia: !state.dyslexia);
    _persistPreferences();
  }

  /// Set dyslexia-friendly mode explicitly
  void setDyslexia(bool value) {
    if (state.dyslexia == value) return;
    state = state.copyWith(dyslexia: value);
    _persistPreferences();
  }

  /// Toggle reduced motion mode
  void toggleReducedMotion() {
    state = state.copyWith(reducedMotion: !state.reducedMotion);
    _persistPreferences();
  }

  /// Set reduced motion mode explicitly
  void setReducedMotion(bool value) {
    if (state.reducedMotion == value) return;
    state = state.copyWith(reducedMotion: value);
    _persistPreferences();
  }

  /// Toggle large text mode
  void toggleLargeText() {
    state = state.copyWith(largeText: !state.largeText);
    _persistPreferences();
  }

  /// Set large text mode explicitly
  void setLargeText(bool value) {
    if (state.largeText == value) return;
    state = state.copyWith(largeText: value);
    _persistPreferences();
  }

  /// Set custom text scale factor
  void setTextScale(double scale) {
    final clampedScale = scale.clamp(kMinTextScale, kMaxTextScale);
    if (state.textScale == clampedScale) return;
    state = state.copyWith(textScale: clampedScale);
    _persistPreferences();
  }

  /// Reset all preferences to defaults
  void reset() {
    state = const AivoAccessibilityState();
    _persistPreferences();
  }

  /// Sync with current system preferences
  void syncWithSystem() {
    _syncWithSystemPreferences();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Main accessibility controller provider
final accessibilityControllerProvider =
    StateNotifierProvider<AivoAccessibilityController, AivoAccessibilityState>(
  (ref) => AivoAccessibilityController(),
);

/// Provider for high contrast state
final highContrastProvider = Provider<bool>((ref) {
  return ref.watch(accessibilityControllerProvider).highContrast;
});

/// Provider for dyslexia-friendly state
final dyslexiaFontProvider = Provider<bool>((ref) {
  return ref.watch(accessibilityControllerProvider).dyslexia;
});

/// Provider for reduced motion state
final reducedMotionProvider = Provider<bool>((ref) {
  return ref.watch(accessibilityControllerProvider).reducedMotion;
});

/// Provider for large text state
final largeTextProvider = Provider<bool>((ref) {
  return ref.watch(accessibilityControllerProvider).largeText;
});

/// Provider for effective text scale
final textScaleProvider = Provider<double>((ref) {
  return ref.watch(accessibilityControllerProvider).effectiveTextScale;
});

/// Provider for border width multiplier
final borderWidthMultiplierProvider = Provider<double>((ref) {
  return ref.watch(accessibilityControllerProvider).borderWidthMultiplier;
});

/// Provider for current font family
final accessibilityFontFamilyProvider = Provider<String>((ref) {
  return ref.watch(accessibilityControllerProvider).fontFamily;
});

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PREFERENCES OBSERVER
// ══════════════════════════════════════════════════════════════════════════════

/// Observer widget that syncs accessibility state with system preferences.
/// 
/// Wrap your app with this widget to automatically respond to system
/// accessibility changes (like enabling reduced motion in device settings).
class AivoAccessibilityObserver extends ConsumerStatefulWidget {
  const AivoAccessibilityObserver({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  ConsumerState<AivoAccessibilityObserver> createState() =>
      _AivoAccessibilityObserverState();
}

class _AivoAccessibilityObserverState 
    extends ConsumerState<AivoAccessibilityObserver> 
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAccessibilityFeatures() {
    // System accessibility features changed
    ref.read(accessibilityControllerProvider.notifier).syncWithSystem();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER EXTENSIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Extension for easy access to accessibility state in widgets
extension AivoAccessibilityContext on BuildContext {
  /// Get animation duration respecting reduced motion
  Duration a11yDuration([Duration normal = const Duration(milliseconds: 300)]) {
    final mediaQuery = MediaQuery.maybeOf(this);
    if (mediaQuery?.disableAnimations ?? false) {
      return Duration.zero;
    }
    return normal;
  }

  /// Check if reduced motion is preferred
  bool get prefersReducedMotion {
    return MediaQuery.maybeOf(this)?.disableAnimations ?? false;
  }

  /// Check if high contrast is preferred
  bool get prefersHighContrast {
    return MediaQuery.maybeOf(this)?.highContrast ?? false;
  }

  /// Check if bold text is preferred
  bool get prefersBoldText {
    return MediaQuery.maybeOf(this)?.boldText ?? false;
  }

  /// Get the text scale factor
  double get a11yTextScale {
    return MediaQuery.textScalerOf(this).scale(1.0);
  }
}
