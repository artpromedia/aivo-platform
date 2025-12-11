/// Graceful Degradation Service
///
/// Provides fallback mechanisms when services are unavailable.
/// Essential for maintaining app functionality during network issues
/// or when backend services are down.
///
/// Key features:
/// - Cached response fallbacks
/// - Degraded functionality modes
/// - Feature flags for offline-capable features
/// - User notification of degraded state
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'circuit_breaker.dart';

// ══════════════════════════════════════════════════════════════════════════════
// DEGRADATION LEVELS
// ══════════════════════════════════════════════════════════════════════════════

/// Level of service degradation.
enum DegradationLevel {
  /// Full functionality available
  none,

  /// Minor features unavailable (e.g., analytics)
  minor,

  /// Some features unavailable (e.g., AI responses)
  moderate,

  /// Core features only (e.g., offline content)
  severe,

  /// App is nearly unusable
  critical,
}

/// Status of a specific feature.
enum FeatureStatus {
  /// Feature is fully available
  available,

  /// Feature is available with degraded functionality
  degraded,

  /// Feature is unavailable
  unavailable,
}

// ══════════════════════════════════════════════════════════════════════════════
// DEGRADATION STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Current degradation state of the app.
class DegradationState {
  const DegradationState({
    required this.level,
    required this.featureStatuses,
    required this.reason,
    required this.timestamp,
    this.estimatedRecovery,
  });

  final DegradationLevel level;
  final Map<String, FeatureStatus> featureStatuses;
  final String reason;
  final DateTime timestamp;
  final Duration? estimatedRecovery;

  /// Check if a specific feature is available.
  bool isFeatureAvailable(String feature) {
    return featureStatuses[feature] == FeatureStatus.available;
  }

  /// Check if a specific feature is at least degraded (usable).
  bool isFeatureUsable(String feature) {
    final status = featureStatuses[feature];
    return status == FeatureStatus.available ||
        status == FeatureStatus.degraded;
  }

  /// User-friendly message about degradation.
  String get userMessage {
    switch (level) {
      case DegradationLevel.none:
        return 'All features available';
      case DegradationLevel.minor:
        return 'Some features may be slower than usual';
      case DegradationLevel.moderate:
        return 'Some features are temporarily unavailable. '
            'Your work is saved locally.';
      case DegradationLevel.severe:
        return 'Limited functionality available. '
            'Content will sync when connection is restored.';
      case DegradationLevel.critical:
        return 'Connection issues detected. '
            'Please check your internet connection.';
    }
  }

  Map<String, dynamic> toJson() => {
        'level': level.name,
        'featureStatuses': featureStatuses.map((k, v) => MapEntry(k, v.name)),
        'reason': reason,
        'timestamp': timestamp.toIso8601String(),
        'estimatedRecovery': estimatedRecovery?.inSeconds,
      };

  @override
  String toString() => 'DegradationState($level, reason: $reason)';
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Known features that can be degraded.
class Features {
  const Features._();

  /// AI-powered features (hints, explanations, chat)
  static const String aiAssistant = 'ai_assistant';

  /// Content synchronization
  static const String contentSync = 'content_sync';

  /// Real-time updates
  static const String realtime = 'realtime';

  /// Analytics and telemetry
  static const String analytics = 'analytics';

  /// Progress tracking
  static const String progressTracking = 'progress_tracking';

  /// Lesson content
  static const String lessons = 'lessons';

  /// Assessments
  static const String assessments = 'assessments';

  /// User authentication
  static const String authentication = 'authentication';

  /// All known features
  static const List<String> all = [
    aiAssistant,
    contentSync,
    realtime,
    analytics,
    progressTracking,
    lessons,
    assessments,
    authentication,
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// GRACEFUL DEGRADATION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service for managing graceful degradation.
class GracefulDegradationService {
  GracefulDegradationService._();

  static final GracefulDegradationService instance =
      GracefulDegradationService._();

  final _stateController = StreamController<DegradationState>.broadcast();
  final _circuitRegistry = CircuitBreakerRegistry.instance;

  DegradationState _currentState = DegradationState(
    level: DegradationLevel.none,
    featureStatuses: {
      for (final feature in Features.all) feature: FeatureStatus.available,
    },
    reason: 'Initial state',
    timestamp: DateTime.now(),
  );

  SharedPreferences? _prefs;
  Timer? _healthCheckTimer;

  /// Stream of degradation state changes.
  Stream<DegradationState> get stateStream => _stateController.stream;

  /// Current degradation state.
  DegradationState get currentState => _currentState;

  /// Current degradation level.
  DegradationLevel get level => _currentState.level;

  /// Initialize the service.
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();

    // Listen to circuit breaker changes
    _circuitRegistry.addStateListener(_onCircuitStateChange);

    // Start health check timer
    _healthCheckTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _updateDegradationState(),
    );

    _updateDegradationState();
  }

  /// Handle circuit breaker state changes.
  void _onCircuitStateChange(
    String name,
    CircuitState oldState,
    CircuitState newState,
  ) {
    _updateDegradationState();
  }

  /// Update degradation state based on circuit breakers and other factors.
  void _updateDegradationState() {
    final featureStatuses = <String, FeatureStatus>{};
    var maxLevel = DegradationLevel.none;
    var reason = 'All services operational';

    // Check AI service
    final aiBreaker = _circuitRegistry.aiService;
    featureStatuses[Features.aiAssistant] = _mapCircuitToFeatureStatus(
      aiBreaker.state,
    );
    if (aiBreaker.state == CircuitState.open) {
      maxLevel = _maxLevel(maxLevel, DegradationLevel.moderate);
      reason = 'AI service temporarily unavailable';
    }

    // Check content service
    final contentBreaker = _circuitRegistry.contentService;
    featureStatuses[Features.contentSync] = _mapCircuitToFeatureStatus(
      contentBreaker.state,
    );
    featureStatuses[Features.lessons] = _mapCircuitToFeatureStatus(
      contentBreaker.state,
    );
    if (contentBreaker.state == CircuitState.open) {
      maxLevel = _maxLevel(maxLevel, DegradationLevel.severe);
      reason = 'Content service temporarily unavailable';
    }

    // Check sync service
    final syncBreaker = _circuitRegistry.syncService;
    featureStatuses[Features.progressTracking] = _mapCircuitToFeatureStatus(
      syncBreaker.state,
    );
    if (syncBreaker.state == CircuitState.open) {
      maxLevel = _maxLevel(maxLevel, DegradationLevel.moderate);
      reason = 'Sync service temporarily unavailable';
    }

    // Default other features to available
    for (final feature in Features.all) {
      featureStatuses.putIfAbsent(feature, () => FeatureStatus.available);
    }

    // Create new state
    final newState = DegradationState(
      level: maxLevel,
      featureStatuses: featureStatuses,
      reason: reason,
      timestamp: DateTime.now(),
    );

    // Only emit if state changed
    if (newState.level != _currentState.level) {
      _currentState = newState;
      _stateController.add(newState);
      _log('Degradation level changed: ${newState.level.name} - $reason');
    }
  }

  /// Map circuit state to feature status.
  FeatureStatus _mapCircuitToFeatureStatus(CircuitState circuitState) {
    switch (circuitState) {
      case CircuitState.closed:
        return FeatureStatus.available;
      case CircuitState.halfOpen:
        return FeatureStatus.degraded;
      case CircuitState.open:
        return FeatureStatus.unavailable;
    }
  }

  /// Get the maximum degradation level.
  DegradationLevel _maxLevel(DegradationLevel a, DegradationLevel b) {
    return a.index > b.index ? a : b;
  }

  /// Check if a feature is available.
  bool isFeatureAvailable(String feature) {
    return _currentState.isFeatureAvailable(feature);
  }

  /// Check if a feature is usable (available or degraded).
  bool isFeatureUsable(String feature) {
    return _currentState.isFeatureUsable(feature);
  }

  /// Execute with fallback.
  ///
  /// Attempts to execute the primary function, falling back to the
  /// fallback function if the primary fails or the feature is unavailable.
  Future<T> executeWithFallback<T>({
    required String feature,
    required Future<T> Function() primary,
    required T Function() fallback,
  }) async {
    // Check if feature is available
    if (!isFeatureUsable(feature)) {
      _log('Feature $feature unavailable, using fallback');
      return fallback();
    }

    try {
      return await primary();
    } catch (e) {
      _log('Primary failed for $feature, using fallback: $e');
      return fallback();
    }
  }

  /// Mark a feature as degraded manually.
  void markFeatureDegraded(String feature, {String? reason}) {
    final newStatuses = Map<String, FeatureStatus>.from(
      _currentState.featureStatuses,
    );
    newStatuses[feature] = FeatureStatus.degraded;

    _currentState = DegradationState(
      level: _calculateLevelFromStatuses(newStatuses),
      featureStatuses: newStatuses,
      reason: reason ?? 'Feature manually marked as degraded',
      timestamp: DateTime.now(),
    );

    _stateController.add(_currentState);
  }

  /// Mark a feature as unavailable manually.
  void markFeatureUnavailable(String feature, {String? reason}) {
    final newStatuses = Map<String, FeatureStatus>.from(
      _currentState.featureStatuses,
    );
    newStatuses[feature] = FeatureStatus.unavailable;

    _currentState = DegradationState(
      level: _calculateLevelFromStatuses(newStatuses),
      featureStatuses: newStatuses,
      reason: reason ?? 'Feature manually marked as unavailable',
      timestamp: DateTime.now(),
    );

    _stateController.add(_currentState);
  }

  /// Mark a feature as available manually.
  void markFeatureAvailable(String feature) {
    final newStatuses = Map<String, FeatureStatus>.from(
      _currentState.featureStatuses,
    );
    newStatuses[feature] = FeatureStatus.available;

    _currentState = DegradationState(
      level: _calculateLevelFromStatuses(newStatuses),
      featureStatuses: newStatuses,
      reason: 'Feature manually marked as available',
      timestamp: DateTime.now(),
    );

    _stateController.add(_currentState);
  }

  /// Calculate degradation level from feature statuses.
  DegradationLevel _calculateLevelFromStatuses(
    Map<String, FeatureStatus> statuses,
  ) {
    final unavailableCount =
        statuses.values.where((s) => s == FeatureStatus.unavailable).length;
    final degradedCount =
        statuses.values.where((s) => s == FeatureStatus.degraded).length;

    // Critical features that indicate severe degradation if unavailable
    final criticalFeatures = [
      Features.lessons,
      Features.authentication,
    ];

    final criticalUnavailable = criticalFeatures
        .where((f) => statuses[f] == FeatureStatus.unavailable)
        .length;

    if (criticalUnavailable > 0) {
      return DegradationLevel.critical;
    }

    if (unavailableCount >= 3) {
      return DegradationLevel.severe;
    }

    if (unavailableCount >= 1 || degradedCount >= 3) {
      return DegradationLevel.moderate;
    }

    if (degradedCount >= 1) {
      return DegradationLevel.minor;
    }

    return DegradationLevel.none;
  }

  void _log(String message) {
    debugPrint('[GracefulDegradation] $message');
  }

  /// Dispose resources.
  void dispose() {
    _healthCheckTimer?.cancel();
    _stateController.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHED RESPONSE FALLBACK
// ══════════════════════════════════════════════════════════════════════════════

/// Manages cached responses for fallback during degradation.
class CachedResponseFallback {
  CachedResponseFallback({
    required this.cacheKey,
    this.maxAge = const Duration(hours: 24),
  });

  final String cacheKey;
  final Duration maxAge;

  SharedPreferences? _prefs;

  /// Initialize with shared preferences.
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Cache a response.
  Future<void> cacheResponse<T>(T response) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    _prefs = prefs;

    final cacheEntry = {
      'data': response,
      'timestamp': DateTime.now().toIso8601String(),
    };

    await prefs.setString(cacheKey, jsonEncode(cacheEntry));
  }

  /// Get cached response if available and not expired.
  Future<T?> getCachedResponse<T>() async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    _prefs = prefs;

    final cached = prefs.getString(cacheKey);
    if (cached == null) return null;

    try {
      final cacheEntry = jsonDecode(cached) as Map<String, dynamic>;
      final timestamp = DateTime.parse(cacheEntry['timestamp'] as String);

      // Check if cache is expired
      if (DateTime.now().difference(timestamp) > maxAge) {
        return null;
      }

      return cacheEntry['data'] as T;
    } catch (e) {
      return null;
    }
  }

  /// Clear cached response.
  Future<void> clearCache() async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    await prefs.remove(cacheKey);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AI FALLBACK RESPONSES
// ══════════════════════════════════════════════════════════════════════════════

/// Predefined fallback responses when AI service is unavailable.
class AIFallbackResponses {
  const AIFallbackResponses._();

  /// Fallback when AI hints are unavailable.
  static const String hint =
      "I'm having trouble connecting right now. "
      "Here's a tip: re-read the question carefully and "
      "think about what you already know about this topic.";

  /// Fallback when AI explanations are unavailable.
  static const String explanation =
      "I can't provide a detailed explanation right now. "
      "Try reviewing your notes or asking your teacher for help.";

  /// Fallback for general AI assistant queries.
  static const String generalAssistant =
      "I'm temporarily unavailable. "
      "Please try again in a few moments, or continue working on your own.";

  /// Fallback for homework help.
  static const String homeworkHelp =
      "I can't help with this question right now. "
      "Consider breaking down the problem into smaller parts, "
      "or check your textbook for similar examples.";

  /// Get appropriate fallback based on request type.
  static String getFallback(String requestType) {
    switch (requestType.toLowerCase()) {
      case 'hint':
        return hint;
      case 'explanation':
        return explanation;
      case 'homework':
        return homeworkHelp;
      default:
        return generalAssistant;
    }
  }
}
