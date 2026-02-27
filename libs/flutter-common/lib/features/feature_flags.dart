/// Feature Flags for AIVO Platform
///
/// Centralized feature flag management for gradual rollout of parity features.
/// Supports local configuration, remote config, and environment-based flags.
library;

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Feature flag identifiers for web-mobile parity features
enum ParityFeature {
  // Sprint 2: SEL + Social Stories
  selMobile,
  socialStoriesWeb,

  // Sprint 3: Executive Function + Motor Skills
  executiveFunctionMobileEnhanced,
  motorSkillsWeb,

  // Sprint 4: Study Skills + Visual Learning
  studySkillsMobile,
  visualLearningMobile,

  // Sprint 5: Teams + Offline
  teamsWebFull,
  offlineWebPwa,

  // General feature flags
  newOnboarding,
  aiTutor,
  teamChallenges,
  adaptiveAssessments,

  // Tutor-specific feature flags (Sprint 10 gradual rollout)
  tutorEnabled,
  tutorVoiceEnabled,
  tutorSubjectsMath,
  tutorSubjectsEla,
  tutorSubjectsScience,
  tutorSubjectsHistory,
  tutorSubjectsCoding,
  tutorMarketplaceVisible,
}

/// Feature flag configuration
class FeatureFlagConfig {
  final bool enabled;
  final double rolloutPercentage;
  final List<String>? allowedUserIds;
  final List<String>? allowedSchoolIds;
  final Map<String, dynamic>? metadata;

  const FeatureFlagConfig({
    this.enabled = false,
    this.rolloutPercentage = 0.0,
    this.allowedUserIds,
    this.allowedSchoolIds,
    this.metadata,
  });

  factory FeatureFlagConfig.fromJson(Map<String, dynamic> json) {
    return FeatureFlagConfig(
      enabled: json['enabled'] as bool? ?? false,
      rolloutPercentage: (json['rolloutPercentage'] as num?)?.toDouble() ?? 0.0,
      allowedUserIds: (json['allowedUserIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      allowedSchoolIds: (json['allowedSchoolIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'rolloutPercentage': rolloutPercentage,
    if (allowedUserIds != null) 'allowedUserIds': allowedUserIds,
    if (allowedSchoolIds != null) 'allowedSchoolIds': allowedSchoolIds,
    if (metadata != null) 'metadata': metadata,
  };

  FeatureFlagConfig copyWith({
    bool? enabled,
    double? rolloutPercentage,
    List<String>? allowedUserIds,
    List<String>? allowedSchoolIds,
    Map<String, dynamic>? metadata,
  }) {
    return FeatureFlagConfig(
      enabled: enabled ?? this.enabled,
      rolloutPercentage: rolloutPercentage ?? this.rolloutPercentage,
      allowedUserIds: allowedUserIds ?? this.allowedUserIds,
      allowedSchoolIds: allowedSchoolIds ?? this.allowedSchoolIds,
      metadata: metadata ?? this.metadata,
    );
  }
}

/// Feature flags service for managing feature availability
class FeatureFlagsService {
  static FeatureFlagsService? _instance;
  static FeatureFlagsService get instance => _instance ??= FeatureFlagsService._();

  FeatureFlagsService._();

  /// Factory constructor for testing
  factory FeatureFlagsService.forTesting() => FeatureFlagsService._();

  final Map<ParityFeature, FeatureFlagConfig> _flags = {};
  final List<VoidCallback> _listeners = [];

  String? _currentUserId;
  String? _currentSchoolId;
  bool _initialized = false;

  /// Default feature flag configurations
  static final Map<ParityFeature, FeatureFlagConfig> _defaultFlags = {
    // Sprint 2 features - enabled for gradual rollout
    ParityFeature.selMobile: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),
    ParityFeature.socialStoriesWeb: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),

    // Sprint 3 features
    ParityFeature.executiveFunctionMobileEnhanced: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),
    ParityFeature.motorSkillsWeb: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),

    // Sprint 4 features
    ParityFeature.studySkillsMobile: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),
    ParityFeature.visualLearningMobile: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),

    // Sprint 5 features
    ParityFeature.teamsWebFull: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),
    ParityFeature.offlineWebPwa: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),

    // General features
    ParityFeature.newOnboarding: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 50.0,
    ),
    ParityFeature.aiTutor: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),
    ParityFeature.teamChallenges: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 100.0,
    ),
    ParityFeature.adaptiveAssessments: const FeatureFlagConfig(
      enabled: true,
      rolloutPercentage: 75.0,
    ),

    // Tutor-specific flags — disabled by default for gradual rollout
    ParityFeature.tutorEnabled: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorVoiceEnabled: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorSubjectsMath: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorSubjectsEla: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorSubjectsScience: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorSubjectsHistory: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorSubjectsCoding: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
    ParityFeature.tutorMarketplaceVisible: const FeatureFlagConfig(
      enabled: false,
      rolloutPercentage: 0.0,
    ),
  };

  /// Initialize the feature flags service
  Future<void> initialize({
    String? userId,
    String? schoolId,
    Map<ParityFeature, FeatureFlagConfig>? overrides,
  }) async {
    _currentUserId = userId;
    _currentSchoolId = schoolId;

    // Load defaults
    _flags.addAll(_defaultFlags);

    // Apply any overrides
    if (overrides != null) {
      _flags.addAll(overrides);
    }

    // Load from local storage
    await _loadFromStorage();

    _initialized = true;
    _notifyListeners();
  }

  /// Update user context
  void setUserContext({String? userId, String? schoolId}) {
    _currentUserId = userId;
    _currentSchoolId = schoolId;
    _notifyListeners();
  }

  /// Check if a feature is enabled for the current user
  bool isEnabled(ParityFeature feature) {
    if (!_initialized) {
      debugPrint('FeatureFlagsService not initialized, using defaults');
    }

    final config = _flags[feature] ?? _defaultFlags[feature];
    if (config == null) return false;

    // Feature must be enabled
    if (!config.enabled) return false;

    // Check user allowlist
    if (config.allowedUserIds != null && config.allowedUserIds!.isNotEmpty) {
      if (_currentUserId != null && config.allowedUserIds!.contains(_currentUserId)) {
        return true;
      }
    }

    // Check school allowlist
    if (config.allowedSchoolIds != null && config.allowedSchoolIds!.isNotEmpty) {
      if (_currentSchoolId != null && config.allowedSchoolIds!.contains(_currentSchoolId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (config.rolloutPercentage >= 100.0) return true;
    if (config.rolloutPercentage <= 0.0) return false;

    // Deterministic rollout based on user ID
    if (_currentUserId != null) {
      final hash = _currentUserId.hashCode.abs() % 100;
      return hash < config.rolloutPercentage;
    }

    // Random rollout for anonymous users
    return (DateTime.now().millisecondsSinceEpoch % 100) < config.rolloutPercentage;
  }

  /// Get the configuration for a feature
  FeatureFlagConfig? getConfig(ParityFeature feature) {
    return _flags[feature] ?? _defaultFlags[feature];
  }

  /// Update a feature flag configuration (for remote config updates)
  void updateFlag(ParityFeature feature, FeatureFlagConfig config) {
    _flags[feature] = config;
    _saveToStorage();
    _notifyListeners();
  }

  /// Update multiple flags at once
  void updateFlags(Map<ParityFeature, FeatureFlagConfig> flags) {
    _flags.addAll(flags);
    _saveToStorage();
    _notifyListeners();
  }

  /// Add a listener for flag changes
  void addListener(VoidCallback listener) {
    _listeners.add(listener);
  }

  /// Remove a listener
  void removeListener(VoidCallback listener) {
    _listeners.remove(listener);
  }

  void _notifyListeners() {
    for (final listener in _listeners) {
      listener();
    }
  }

  /// Load flags from local storage
  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString('feature_flags');
      if (stored != null) {
        final data = json.decode(stored) as Map<String, dynamic>;
        for (final entry in data.entries) {
          try {
            final feature = ParityFeature.values.byName(entry.key);
            _flags[feature] = FeatureFlagConfig.fromJson(
              entry.value as Map<String, dynamic>,
            );
          } catch (_) {
            // Ignore unknown features
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to load feature flags from storage: $e');
    }
  }

  /// Save flags to local storage
  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = <String, dynamic>{};
      for (final entry in _flags.entries) {
        data[entry.key.name] = entry.value.toJson();
      }
      await prefs.setString('feature_flags', json.encode(data));
    } catch (e) {
      debugPrint('Failed to save feature flags to storage: $e');
    }
  }

  /// Fetch remote configuration (stub - implement with your remote config service)
  Future<void> fetchRemoteConfig() async {
    // TODO: Implement remote config fetch
    // This would typically call a remote config service like Firebase Remote Config
    // or a custom endpoint to get the latest flag configurations
    debugPrint('Remote config fetch not implemented');
  }

  /// Clear all stored flags and reset to defaults
  Future<void> reset() async {
    _flags.clear();
    _flags.addAll(_defaultFlags);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('feature_flags');
    _notifyListeners();
  }

  /// Get all enabled features for debugging
  List<ParityFeature> getEnabledFeatures() {
    return ParityFeature.values.where((f) => isEnabled(f)).toList();
  }

  /// Get all features and their status for debugging
  Map<String, bool> getAllFeaturesStatus() {
    return {
      for (final feature in ParityFeature.values)
        feature.name: isEnabled(feature),
    };
  }
}

/// Extension methods for easy feature checking
extension FeatureFlagExtension on ParityFeature {
  /// Check if this feature is enabled
  bool get isEnabled => FeatureFlagsService.instance.isEnabled(this);

  /// Get the configuration for this feature
  FeatureFlagConfig? get config => FeatureFlagsService.instance.getConfig(this);
}

/// Helper class for feature-gated widgets
class FeatureGate {
  /// Returns the child if the feature is enabled, otherwise returns the fallback
  static T when<T>({
    required ParityFeature feature,
    required T enabled,
    required T disabled,
  }) {
    return FeatureFlagsService.instance.isEnabled(feature) ? enabled : disabled;
  }
}
