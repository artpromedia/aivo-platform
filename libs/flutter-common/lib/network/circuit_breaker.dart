/// Circuit Breaker Pattern for Network Resilience
///
/// Implements the circuit breaker pattern to prevent cascading failures
/// when backend services are experiencing issues. This is particularly
/// important for AI service calls that may have high latency or fail
/// during peak usage.
///
/// States:
/// - Closed: Normal operation, requests pass through
/// - Open: Service is failing, requests are blocked
/// - Half-Open: Testing if service has recovered
library;

import 'dart:async';

import 'package:flutter/foundation.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Circuit breaker state.
enum CircuitState {
  /// Normal operation - requests pass through
  closed,

  /// Service is failing - requests are blocked
  open,

  /// Testing if service recovered - limited requests pass
  halfOpen,
}

/// Statistics for the circuit breaker.
class CircuitBreakerStats {
  const CircuitBreakerStats({
    required this.state,
    required this.failureCount,
    required this.successCount,
    required this.consecutiveFailures,
    required this.lastFailureTime,
    required this.lastSuccessTime,
    required this.totalRequests,
    required this.totalBlocked,
  });

  final CircuitState state;
  final int failureCount;
  final int successCount;
  final int consecutiveFailures;
  final DateTime? lastFailureTime;
  final DateTime? lastSuccessTime;
  final int totalRequests;
  final int totalBlocked;

  /// Failure rate as a percentage (0-100)
  double get failureRate {
    final total = failureCount + successCount;
    if (total == 0) return 0;
    return (failureCount / total) * 100;
  }

  Map<String, dynamic> toJson() => {
        'state': state.name,
        'failureCount': failureCount,
        'successCount': successCount,
        'consecutiveFailures': consecutiveFailures,
        'failureRate': failureRate.toStringAsFixed(1),
        'lastFailureTime': lastFailureTime?.toIso8601String(),
        'lastSuccessTime': lastSuccessTime?.toIso8601String(),
        'totalRequests': totalRequests,
        'totalBlocked': totalBlocked,
      };
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/// Configuration for circuit breaker behavior.
class CircuitBreakerConfig {
  const CircuitBreakerConfig({
    this.failureThreshold = 5,
    this.successThreshold = 2,
    this.resetTimeout = const Duration(seconds: 30),
    this.halfOpenMaxConcurrent = 1,
    this.rollingWindowSize = const Duration(minutes: 1),
    this.failureRateThreshold = 50.0,
  });

  /// Number of consecutive failures before opening circuit
  final int failureThreshold;

  /// Number of consecutive successes in half-open to close circuit
  final int successThreshold;

  /// Time to wait before transitioning from open to half-open
  final Duration resetTimeout;

  /// Max concurrent requests in half-open state
  final int halfOpenMaxConcurrent;

  /// Window size for calculating failure rate
  final Duration rollingWindowSize;

  /// Failure rate percentage that triggers opening (used with rolling window)
  final double failureRateThreshold;

  /// Default config for standard services
  static const CircuitBreakerConfig standard = CircuitBreakerConfig();

  /// Config for AI services (more tolerant of failures due to latency)
  static const CircuitBreakerConfig aiService = CircuitBreakerConfig(
    failureThreshold: 3,
    successThreshold: 1,
    resetTimeout: Duration(seconds: 60),
    failureRateThreshold: 40.0,
  );

  /// Config for critical services (less tolerant)
  static const CircuitBreakerConfig critical = CircuitBreakerConfig(
    failureThreshold: 3,
    successThreshold: 3,
    resetTimeout: Duration(seconds: 15),
    failureRateThreshold: 30.0,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER EXCEPTION
// ══════════════════════════════════════════════════════════════════════════════

/// Exception thrown when circuit is open.
class CircuitBreakerOpenException implements Exception {
  const CircuitBreakerOpenException({
    required this.serviceName,
    required this.remainingTime,
    this.lastError,
  });

  final String serviceName;
  final Duration remainingTime;
  final Object? lastError;

  @override
  String toString() =>
      'CircuitBreakerOpenException: $serviceName circuit is open, '
      'retry in ${remainingTime.inSeconds}s';
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ══════════════════════════════════════════════════════════════════════════════

/// Circuit breaker for protecting against cascading failures.
///
/// Usage:
/// ```dart
/// final aiBreaker = CircuitBreaker(
///   name: 'ai-service',
///   config: CircuitBreakerConfig.aiService,
/// );
///
/// try {
///   final result = await aiBreaker.execute(() async {
///     return await aiClient.generateResponse(prompt);
///   });
/// } on CircuitBreakerOpenException catch (e) {
///   // Use fallback/cached response
///   return fallbackResponse;
/// }
/// ```
class CircuitBreaker {
  CircuitBreaker({
    required this.name,
    this.config = const CircuitBreakerConfig(),
    this.onStateChange,
  });

  final String name;
  final CircuitBreakerConfig config;
  final void Function(CircuitState oldState, CircuitState newState)?
      onStateChange;

  CircuitState _state = CircuitState.closed;
  int _failureCount = 0;
  int _successCount = 0;
  int _consecutiveFailures = 0;
  int _consecutiveSuccesses = 0;
  int _halfOpenConcurrent = 0;
  int _totalRequests = 0;
  int _totalBlocked = 0;
  DateTime? _lastFailureTime;
  DateTime? _lastSuccessTime;
  DateTime? _openedAt;
  Object? _lastError;

  // Rolling window for failure rate calculation
  final _recentResults = <({DateTime time, bool success})>[];

  /// Current circuit state.
  CircuitState get state => _state;

  /// Get current statistics.
  CircuitBreakerStats get stats => CircuitBreakerStats(
        state: _state,
        failureCount: _failureCount,
        successCount: _successCount,
        consecutiveFailures: _consecutiveFailures,
        lastFailureTime: _lastFailureTime,
        lastSuccessTime: _lastSuccessTime,
        totalRequests: _totalRequests,
        totalBlocked: _totalBlocked,
      );

  /// Execute a function with circuit breaker protection.
  Future<T> execute<T>(Future<T> Function() action) async {
    _totalRequests++;

    // Check if we should allow this request
    if (!_allowRequest()) {
      _totalBlocked++;
      final remaining = _remainingOpenTime();
      throw CircuitBreakerOpenException(
        serviceName: name,
        remainingTime: remaining,
        lastError: _lastError,
      );
    }

    if (_state == CircuitState.halfOpen) {
      _halfOpenConcurrent++;
    }

    try {
      final result = await action();
      _recordSuccess();
      return result;
    } catch (e) {
      _recordFailure(e);
      rethrow;
    } finally {
      if (_state == CircuitState.halfOpen) {
        _halfOpenConcurrent--;
      }
    }
  }

  /// Check if request should be allowed.
  bool _allowRequest() {
    switch (_state) {
      case CircuitState.closed:
        return true;

      case CircuitState.open:
        // Check if reset timeout has elapsed
        if (_openedAt != null) {
          final elapsed = DateTime.now().difference(_openedAt!);
          if (elapsed >= config.resetTimeout) {
            _transitionTo(CircuitState.halfOpen);
            return true;
          }
        }
        return false;

      case CircuitState.halfOpen:
        // Allow limited concurrent requests
        return _halfOpenConcurrent < config.halfOpenMaxConcurrent;
    }
  }

  /// Calculate remaining time until circuit transitions from open to half-open.
  Duration _remainingOpenTime() {
    if (_openedAt == null) return Duration.zero;
    final elapsed = DateTime.now().difference(_openedAt!);
    final remaining = config.resetTimeout - elapsed;
    return remaining.isNegative ? Duration.zero : remaining;
  }

  /// Record a successful request.
  void _recordSuccess() {
    _successCount++;
    _consecutiveSuccesses++;
    _consecutiveFailures = 0;
    _lastSuccessTime = DateTime.now();

    _addToRollingWindow(true);

    switch (_state) {
      case CircuitState.closed:
        // Stay closed
        break;

      case CircuitState.halfOpen:
        // Check if we should close
        if (_consecutiveSuccesses >= config.successThreshold) {
          _transitionTo(CircuitState.closed);
        }
        break;

      case CircuitState.open:
        // Shouldn't happen, but reset just in case
        _transitionTo(CircuitState.halfOpen);
        break;
    }
  }

  /// Record a failed request.
  void _recordFailure(Object error) {
    _failureCount++;
    _consecutiveFailures++;
    _consecutiveSuccesses = 0;
    _lastFailureTime = DateTime.now();
    _lastError = error;

    _addToRollingWindow(false);

    switch (_state) {
      case CircuitState.closed:
        // Check if we should open
        if (_consecutiveFailures >= config.failureThreshold ||
            _getFailureRate() >= config.failureRateThreshold) {
          _transitionTo(CircuitState.open);
        }
        break;

      case CircuitState.halfOpen:
        // Any failure in half-open goes back to open
        _transitionTo(CircuitState.open);
        break;

      case CircuitState.open:
        // Stay open
        break;
    }
  }

  /// Add result to rolling window.
  void _addToRollingWindow(bool success) {
    final now = DateTime.now();
    final cutoff = now.subtract(config.rollingWindowSize);

    // Remove old entries
    _recentResults.removeWhere((r) => r.time.isBefore(cutoff));

    // Add new entry
    _recentResults.add((time: now, success: success));
  }

  /// Calculate failure rate from rolling window.
  double _getFailureRate() {
    if (_recentResults.isEmpty) return 0;

    final failures = _recentResults.where((r) => !r.success).length;
    return (failures / _recentResults.length) * 100;
  }

  /// Transition to a new state.
  void _transitionTo(CircuitState newState) {
    if (_state == newState) return;

    final oldState = _state;
    _state = newState;

    if (newState == CircuitState.open) {
      _openedAt = DateTime.now();
      _log('Circuit OPENED - too many failures');
    } else if (newState == CircuitState.halfOpen) {
      _log('Circuit HALF-OPEN - testing recovery');
      _consecutiveSuccesses = 0;
    } else if (newState == CircuitState.closed) {
      _log('Circuit CLOSED - service recovered');
      _consecutiveFailures = 0;
      _openedAt = null;
    }

    onStateChange?.call(oldState, newState);
  }

  /// Manually reset the circuit breaker.
  void reset() {
    _state = CircuitState.closed;
    _failureCount = 0;
    _successCount = 0;
    _consecutiveFailures = 0;
    _consecutiveSuccesses = 0;
    _halfOpenConcurrent = 0;
    _lastFailureTime = null;
    _lastSuccessTime = null;
    _openedAt = null;
    _lastError = null;
    _recentResults.clear();
    _log('Circuit manually reset');
  }

  /// Force the circuit to open.
  void forceOpen() {
    _transitionTo(CircuitState.open);
  }

  /// Force the circuit to close.
  void forceClose() {
    _transitionTo(CircuitState.closed);
  }

  void _log(String message) {
    debugPrint('[CircuitBreaker:$name] $message');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

/// Registry for managing multiple circuit breakers.
class CircuitBreakerRegistry {
  CircuitBreakerRegistry._();

  static final CircuitBreakerRegistry instance = CircuitBreakerRegistry._();

  final _breakers = <String, CircuitBreaker>{};
  final _stateListeners = <void Function(String, CircuitState, CircuitState)>[];

  /// Get or create a circuit breaker by name.
  CircuitBreaker get(String name, {CircuitBreakerConfig? config}) {
    return _breakers.putIfAbsent(
      name,
      () => CircuitBreaker(
        name: name,
        config: config ?? const CircuitBreakerConfig(),
        onStateChange: (oldState, newState) {
          for (final listener in _stateListeners) {
            listener(name, oldState, newState);
          }
        },
      ),
    );
  }

  /// Get circuit breaker for AI service.
  CircuitBreaker get aiService => get(
        'ai-service',
        config: CircuitBreakerConfig.aiService,
      );

  /// Get circuit breaker for content service.
  CircuitBreaker get contentService => get(
        'content-service',
        config: CircuitBreakerConfig.standard,
      );

  /// Get circuit breaker for sync service.
  CircuitBreaker get syncService => get(
        'sync-service',
        config: CircuitBreakerConfig.standard,
      );

  /// Add a listener for state changes across all breakers.
  void addStateListener(
    void Function(String name, CircuitState oldState, CircuitState newState)
        listener,
  ) {
    _stateListeners.add(listener);
  }

  /// Remove a state listener.
  void removeStateListener(
    void Function(String name, CircuitState oldState, CircuitState newState)
        listener,
  ) {
    _stateListeners.remove(listener);
  }

  /// Get statistics for all breakers.
  Map<String, CircuitBreakerStats> getAllStats() {
    return {
      for (final entry in _breakers.entries) entry.key: entry.value.stats,
    };
  }

  /// Reset all circuit breakers.
  void resetAll() {
    for (final breaker in _breakers.values) {
      breaker.reset();
    }
  }

  /// Check if any circuit is open.
  bool get anyCircuitOpen {
    return _breakers.values.any((b) => b.state == CircuitState.open);
  }

  /// Get list of open circuits.
  List<String> get openCircuits {
    return _breakers.entries
        .where((e) => e.value.state == CircuitState.open)
        .map((e) => e.key)
        .toList();
  }
}
