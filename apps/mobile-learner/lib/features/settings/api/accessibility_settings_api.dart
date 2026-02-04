/// Accessibility Settings API
///
/// API client for persisting accessibility settings to profile-svc.
/// Syncs learner UI accessibility preferences across devices.
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const _profileSvcBaseUrl = String.fromEnvironment(
  'PROFILE_SVC_BASE_URL',
  defaultValue: 'https://api.aivo.app/profile',
);

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// Color blind mode options
enum ColorBlindMode {
  none('None', 'Default colors'),
  protanopia('Protanopia', 'Red-blind'),
  deuteranopia('Deuteranopia', 'Green-blind'),
  tritanopia('Tritanopia', 'Blue-blind'),
  achromatopsia('Achromatopsia', 'Total color blindness');

  const ColorBlindMode(this.label, this.description);
  final String label;
  final String description;

  static ColorBlindMode fromString(String? value) {
    if (value == null) return ColorBlindMode.none;
    return ColorBlindMode.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ColorBlindMode.none,
    );
  }
}

/// Accessibility settings model for API
class AccessibilitySettings {
  const AccessibilitySettings({
    this.textScaleFactor = 1.0,
    this.highContrast = false,
    this.reduceMotion = false,
    this.reduceTransparency = false,
    this.boldText = false,
    this.screenReaderOptimized = false,
    this.hapticFeedbackEnabled = true,
    this.soundEffectsEnabled = true,
    this.soundVolume = 0.7,
    this.readAloudEnabled = false,
    this.readAloudSpeed = 1.0,
    this.colorBlindMode = ColorBlindMode.none,
  });

  final double textScaleFactor;
  final bool highContrast;
  final bool reduceMotion;
  final bool reduceTransparency;
  final bool boldText;
  final bool screenReaderOptimized;
  final bool hapticFeedbackEnabled;
  final bool soundEffectsEnabled;
  final double soundVolume;
  final bool readAloudEnabled;
  final double readAloudSpeed;
  final ColorBlindMode colorBlindMode;

  /// Create from API JSON response
  factory AccessibilitySettings.fromJson(Map<String, dynamic> json) {
    // Map from profile-svc uiAccessibilityJson format
    return AccessibilitySettings(
      textScaleFactor: _parseTextSize(json['textSize'] as String?),
      highContrast: json['highContrast'] as bool? ?? false,
      reduceMotion: json['reduceMotion'] as bool? ?? false,
      reduceTransparency: json['reduceTransparency'] as bool? ?? false,
      boldText: json['boldText'] as bool? ?? false,
      screenReaderOptimized: json['screenReaderOptimized'] as bool? ?? false,
      hapticFeedbackEnabled: json['hapticFeedbackEnabled'] as bool? ?? true,
      soundEffectsEnabled: json['soundEffectsEnabled'] as bool? ?? true,
      soundVolume: (json['soundVolume'] as num?)?.toDouble() ?? 0.7,
      readAloudEnabled: json['showReadAloudButton'] as bool? ?? json['autoReadAloud'] as bool? ?? false,
      readAloudSpeed: (json['readAloudSpeed'] as num?)?.toDouble() ?? 1.0,
      colorBlindMode: ColorBlindMode.fromString(json['colorBlindMode'] as String?),
    );
  }

  /// Convert to API JSON format for profile-svc
  Map<String, dynamic> toJson() {
    return {
      'textSize': _textSizeToString(textScaleFactor),
      'highContrast': highContrast,
      'reduceMotion': reduceMotion,
      'reduceTransparency': reduceTransparency,
      'boldText': boldText,
      'screenReaderOptimized': screenReaderOptimized,
      'hapticFeedbackEnabled': hapticFeedbackEnabled,
      'soundEffectsEnabled': soundEffectsEnabled,
      'soundVolume': soundVolume,
      'showReadAloudButton': readAloudEnabled,
      'autoReadAloud': readAloudEnabled,
      'readAloudSpeed': readAloudSpeed,
      'colorBlindMode': colorBlindMode.name,
    };
  }

  /// Parse text size from API enum to scale factor
  static double _parseTextSize(String? textSize) {
    switch (textSize) {
      case 'SMALL':
        return 0.85;
      case 'MEDIUM':
        return 1.0;
      case 'LARGE':
        return 1.25;
      case 'EXTRA_LARGE':
        return 1.5;
      default:
        return 1.0;
    }
  }

  /// Convert scale factor to API text size enum
  static String _textSizeToString(double scaleFactor) {
    if (scaleFactor <= 0.9) return 'SMALL';
    if (scaleFactor <= 1.1) return 'MEDIUM';
    if (scaleFactor <= 1.35) return 'LARGE';
    return 'EXTRA_LARGE';
  }

  AccessibilitySettings copyWith({
    double? textScaleFactor,
    bool? highContrast,
    bool? reduceMotion,
    bool? reduceTransparency,
    bool? boldText,
    bool? screenReaderOptimized,
    bool? hapticFeedbackEnabled,
    bool? soundEffectsEnabled,
    double? soundVolume,
    bool? readAloudEnabled,
    double? readAloudSpeed,
    ColorBlindMode? colorBlindMode,
  }) {
    return AccessibilitySettings(
      textScaleFactor: textScaleFactor ?? this.textScaleFactor,
      highContrast: highContrast ?? this.highContrast,
      reduceMotion: reduceMotion ?? this.reduceMotion,
      reduceTransparency: reduceTransparency ?? this.reduceTransparency,
      boldText: boldText ?? this.boldText,
      screenReaderOptimized: screenReaderOptimized ?? this.screenReaderOptimized,
      hapticFeedbackEnabled: hapticFeedbackEnabled ?? this.hapticFeedbackEnabled,
      soundEffectsEnabled: soundEffectsEnabled ?? this.soundEffectsEnabled,
      soundVolume: soundVolume ?? this.soundVolume,
      readAloudEnabled: readAloudEnabled ?? this.readAloudEnabled,
      readAloudSpeed: readAloudSpeed ?? this.readAloudSpeed,
      colorBlindMode: colorBlindMode ?? this.colorBlindMode,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// API client for accessibility settings persistence
class AccessibilitySettingsApi {
  AccessibilitySettingsApi({
    required this.getAccessToken,
    required this.getTenantId,
    Dio? dio,
  }) : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: _profileSvcBaseUrl,
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
            ));

  final Future<String?> Function() getAccessToken;
  final String Function() getTenantId;
  final Dio _dio;

  /// Get accessibility settings for a learner
  Future<AccessibilitySettings> getSettings(String learnerId) async {
    final token = await getAccessToken();
    final tenantId = getTenantId();

    final response = await _dio.get<Map<String, dynamic>>(
      '/learners/$learnerId/profile',
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'X-Tenant-Id': tenantId,
          'X-User-Id': learnerId,
          'X-User-Role': 'learner',
        },
      ),
    );

    final profile = response.data?['profile'];
    if (profile == null) {
      return const AccessibilitySettings();
    }

    final uiAccessibility = profile['uiAccessibilityJson'] as Map<String, dynamic>?;
    if (uiAccessibility == null) {
      return const AccessibilitySettings();
    }

    return AccessibilitySettings.fromJson(uiAccessibility);
  }

  /// Update accessibility settings for a learner
  Future<void> updateSettings(String learnerId, AccessibilitySettings settings) async {
    final token = await getAccessToken();
    final tenantId = getTenantId();

    await _dio.patch<void>(
      '/learners/$learnerId/profile',
      data: {
        'uiAccessibilityJson': settings.toJson(),
      },
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'X-Tenant-Id': tenantId,
          'X-User-Id': learnerId,
          'X-User-Role': 'learner',
        },
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the current learner's ID
/// This should be overridden with the actual learner ID when the app initializes
final currentLearnerIdProvider = StateProvider<String?>((ref) => null);

/// Provider for the current tenant ID
/// This should be overridden with the actual tenant ID when the app initializes
final currentTenantIdProvider = StateProvider<String>((ref) => 'default');

/// Provider for the auth token getter
/// This should be overridden with the actual token getter when the app initializes
final authTokenGetterProvider = Provider<Future<String?> Function()>((ref) {
  return () async => null;
});

/// Provider for AccessibilitySettingsApi
final accessibilitySettingsApiProvider = Provider<AccessibilitySettingsApi>((ref) {
  return AccessibilitySettingsApi(
    getAccessToken: ref.watch(authTokenGetterProvider),
    getTenantId: () => ref.read(currentTenantIdProvider),
  );
});

/// Provider for loading accessibility settings from API
final accessibilitySettingsFromApiProvider = FutureProvider.autoDispose<AccessibilitySettings>((ref) async {
  final learnerId = ref.watch(currentLearnerIdProvider);
  if (learnerId == null) {
    return const AccessibilitySettings();
  }

  final api = ref.watch(accessibilitySettingsApiProvider);
  try {
    return await api.getSettings(learnerId);
  } catch (e) {
    // On error, return defaults
    return const AccessibilitySettings();
  }
});

/// Provider for saving accessibility settings
final saveAccessibilitySettingsProvider = FutureProvider.family.autoDispose<void, AccessibilitySettings>((ref, settings) async {
  final learnerId = ref.read(currentLearnerIdProvider);
  if (learnerId == null) {
    throw Exception('No learner ID available');
  }

  final api = ref.read(accessibilitySettingsApiProvider);
  await api.updateSettings(learnerId, settings);
});
