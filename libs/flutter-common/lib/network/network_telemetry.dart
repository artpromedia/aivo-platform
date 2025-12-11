/// Network Telemetry Service
///
/// Collects and reports network-related metrics for monitoring
/// and alerting. Designed to help identify and diagnose network
/// issues in school environments.
///
/// Metrics collected:
/// - client_http_errors_total: Count of HTTP errors by type
/// - sync_failures_total: Count of sync operation failures
/// - avg_sync_duration_ms: Average sync duration
/// - circuit_breaker_state_changes: Circuit breaker transitions
/// - request_latency_p50/p95/p99: Request latency percentiles
library;

import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'circuit_breaker.dart';
import 'resilient_http_client.dart';

// ══════════════════════════════════════════════════════════════════════════════
// METRIC TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// A counter metric that only increases.
class CounterMetric {
  CounterMetric(this.name, {Map<String, String>? labels})
      : labels = labels ?? {};

  final String name;
  final Map<String, String> labels;
  int _value = 0;

  int get value => _value;

  void increment([int amount = 1]) {
    _value += amount;
  }

  void reset() {
    _value = 0;
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': 'counter',
        'value': _value,
        'labels': labels,
      };
}

/// A gauge metric that can go up or down.
class GaugeMetric {
  GaugeMetric(this.name, {Map<String, String>? labels}) : labels = labels ?? {};

  final String name;
  final Map<String, String> labels;
  double _value = 0;

  double get value => _value;

  void set(double value) {
    _value = value;
  }

  void increment([double amount = 1]) {
    _value += amount;
  }

  void decrement([double amount = 1]) {
    _value -= amount;
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': 'gauge',
        'value': _value,
        'labels': labels,
      };
}

/// A histogram metric for measuring distributions.
class HistogramMetric {
  HistogramMetric(
    this.name, {
    this.buckets = const [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    Map<String, String>? labels,
    this.maxSamples = 1000,
  }) : labels = labels ?? {};

  final String name;
  final List<int> buckets;
  final Map<String, String> labels;
  final int maxSamples;

  final _samples = <double>[];
  final _bucketCounts = <int, int>{};
  int _count = 0;
  double _sum = 0;

  int get count => _count;
  double get sum => _sum;

  void observe(double value) {
    _count++;
    _sum += value;

    _samples.add(value);
    if (_samples.length > maxSamples) {
      _samples.removeAt(0);
    }

    // Update bucket counts
    for (final bucket in buckets) {
      if (value <= bucket) {
        _bucketCounts[bucket] = (_bucketCounts[bucket] ?? 0) + 1;
      }
    }
  }

  double get mean => _count > 0 ? _sum / _count : 0;

  double percentile(double p) {
    if (_samples.isEmpty) return 0;

    final sorted = List<double>.from(_samples)..sort();
    final index = ((p / 100) * (sorted.length - 1)).round();
    return sorted[index];
  }

  double get p50 => percentile(50);
  double get p95 => percentile(95);
  double get p99 => percentile(99);

  void reset() {
    _samples.clear();
    _bucketCounts.clear();
    _count = 0;
    _sum = 0;
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': 'histogram',
        'count': _count,
        'sum': _sum,
        'mean': mean,
        'p50': p50,
        'p95': p95,
        'p99': p99,
        'buckets': _bucketCounts,
        'labels': labels,
      };
}

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK TELEMETRY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service for collecting and reporting network telemetry.
class NetworkTelemetryService {
  NetworkTelemetryService._();

  static final NetworkTelemetryService instance = NetworkTelemetryService._();

  // Counters
  final _httpErrorsTotal = <NetworkErrorType, CounterMetric>{};
  final _syncFailuresTotal = CounterMetric('sync_failures_total');
  final _syncSuccessTotal = CounterMetric('sync_success_total');
  final _circuitBreakerOpenTotal = CounterMetric('circuit_breaker_open_total');
  final _retryAttempts = CounterMetric('retry_attempts_total');
  final _fallbacksUsed = CounterMetric('fallbacks_used_total');

  // Gauges
  final _activeRequests = GaugeMetric('active_requests');
  final _pendingSyncItems = GaugeMetric('pending_sync_items');
  final _offlineDuration = GaugeMetric('offline_duration_seconds');
  final _openCircuits = GaugeMetric('open_circuits');

  // Histograms
  final _requestLatency = HistogramMetric('request_latency_ms');
  final _syncDuration = HistogramMetric('sync_duration_ms');
  final _connectionTime = HistogramMetric('connection_time_ms');

  // Endpoint-specific histograms
  final _endpointLatencies = <String, HistogramMetric>{};

  Timer? _reportingTimer;
  final _listeners = <void Function(TelemetryReport)>[];

  DateTime? _offlineStartTime;
  SharedPreferences? _prefs;

  /// Initialize the telemetry service.
  Future<void> initialize({
    Duration reportingInterval = const Duration(minutes: 1),
  }) async {
    _prefs = await SharedPreferences.getInstance();

    // Load persisted metrics
    await _loadPersistedMetrics();

    // Initialize error counters
    for (final errorType in NetworkErrorType.values) {
      _httpErrorsTotal[errorType] = CounterMetric(
        'client_http_errors_total',
        labels: {'error_type': errorType.name},
      );
    }

    // Listen to network telemetry from resilient client
    NetworkTelemetry.instance.addErrorListener(_onNetworkError);
    NetworkTelemetry.instance.addMetricsListener(_onNetworkMetrics);

    // Listen to circuit breaker state changes
    CircuitBreakerRegistry.instance.addStateListener(_onCircuitStateChange);

    // Start periodic reporting
    _reportingTimer = Timer.periodic(
      reportingInterval,
      (_) => _generateAndSendReport(),
    );
  }

  /// Record an HTTP error.
  void recordHttpError(NetworkErrorType type, {String? endpoint}) {
    _httpErrorsTotal[type]?.increment();
    _log('HTTP error recorded: ${type.name} for $endpoint');
  }

  /// Record a sync failure.
  void recordSyncFailure({String? reason}) {
    _syncFailuresTotal.increment();
    _log('Sync failure recorded: $reason');
  }

  /// Record a sync success.
  void recordSyncSuccess({int? itemCount}) {
    _syncSuccessTotal.increment();
    _log('Sync success recorded: $itemCount items');
  }

  /// Record sync duration.
  void recordSyncDuration(int durationMs) {
    _syncDuration.observe(durationMs.toDouble());
  }

  /// Record request latency.
  void recordRequestLatency(String endpoint, int latencyMs) {
    _requestLatency.observe(latencyMs.toDouble());

    // Track per-endpoint latency
    final normalized = _normalizeEndpoint(endpoint);
    _endpointLatencies.putIfAbsent(
      normalized,
      () => HistogramMetric(
        'endpoint_latency_ms',
        labels: {'endpoint': normalized},
      ),
    );
    _endpointLatencies[normalized]!.observe(latencyMs.toDouble());
  }

  /// Record connection establishment time.
  void recordConnectionTime(int connectionMs) {
    _connectionTime.observe(connectionMs.toDouble());
  }

  /// Record a retry attempt.
  void recordRetryAttempt({String? endpoint}) {
    _retryAttempts.increment();
  }

  /// Record fallback usage.
  void recordFallbackUsed(String feature) {
    _fallbacksUsed.increment();
    _log('Fallback used for feature: $feature');
  }

  /// Update active request count.
  void setActiveRequests(int count) {
    _activeRequests.set(count.toDouble());
  }

  /// Update pending sync items count.
  void setPendingSyncItems(int count) {
    _pendingSyncItems.set(count.toDouble());
  }

  /// Mark device as offline.
  void markOffline() {
    _offlineStartTime ??= DateTime.now();
  }

  /// Mark device as online.
  void markOnline() {
    if (_offlineStartTime != null) {
      final duration = DateTime.now().difference(_offlineStartTime!);
      _offlineDuration.set(duration.inSeconds.toDouble());
      _offlineStartTime = null;
    }
  }

  /// Handle network error from resilient client.
  void _onNetworkError(NetworkErrorType type, String? endpoint) {
    recordHttpError(type, endpoint: endpoint);
  }

  /// Handle metrics update from resilient client.
  void _onNetworkMetrics(NetworkMetrics metrics) {
    // Sync metrics are handled separately
  }

  /// Handle circuit breaker state change.
  void _onCircuitStateChange(
    String name,
    CircuitState oldState,
    CircuitState newState,
  ) {
    if (newState == CircuitState.open) {
      _circuitBreakerOpenTotal.increment();
    }

    _openCircuits.set(
      CircuitBreakerRegistry.instance.openCircuits.length.toDouble(),
    );

    _log('Circuit breaker $name: ${oldState.name} -> ${newState.name}');
  }

  /// Normalize endpoint for grouping similar paths.
  String _normalizeEndpoint(String endpoint) {
    // Remove query parameters
    final withoutQuery = endpoint.split('?').first;

    // Replace UUIDs and IDs with placeholders
    final normalized = withoutQuery
        .replaceAll(
          RegExp(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
              caseSensitive: false),
          ':id',
        )
        .replaceAll(RegExp(r'/\d+'), '/:id');

    return normalized;
  }

  /// Generate a telemetry report.
  TelemetryReport generateReport() {
    final errorCounts = <String, int>{};
    for (final entry in _httpErrorsTotal.entries) {
      errorCounts[entry.key.name] = entry.value.value;
    }

    final endpointStats = <String, Map<String, double>>{};
    for (final entry in _endpointLatencies.entries) {
      endpointStats[entry.key] = {
        'mean': entry.value.mean,
        'p50': entry.value.p50,
        'p95': entry.value.p95,
        'p99': entry.value.p99,
        'count': entry.value.count.toDouble(),
      };
    }

    return TelemetryReport(
      timestamp: DateTime.now(),
      httpErrorCounts: errorCounts,
      syncFailures: _syncFailuresTotal.value,
      syncSuccesses: _syncSuccessTotal.value,
      avgSyncDurationMs: _syncDuration.mean,
      syncDurationP95: _syncDuration.p95,
      avgRequestLatencyMs: _requestLatency.mean,
      requestLatencyP95: _requestLatency.p95,
      requestLatencyP99: _requestLatency.p99,
      avgConnectionTimeMs: _connectionTime.mean,
      circuitBreakerOpens: _circuitBreakerOpenTotal.value,
      retryAttempts: _retryAttempts.value,
      fallbacksUsed: _fallbacksUsed.value,
      activeRequests: _activeRequests.value.toInt(),
      pendingSyncItems: _pendingSyncItems.value.toInt(),
      offlineDurationSeconds: _offlineDuration.value.toInt(),
      openCircuits: CircuitBreakerRegistry.instance.openCircuits,
      endpointStats: endpointStats,
    );
  }

  /// Generate and send a report.
  Future<void> _generateAndSendReport() async {
    final report = generateReport();

    // Notify listeners
    for (final listener in _listeners) {
      listener(report);
    }

    // Persist critical metrics
    await _persistMetrics();

    _log('Telemetry report generated: ${report.totalHttpErrors} errors, '
        '${report.syncFailures} sync failures');
  }

  /// Add a report listener.
  void addReportListener(void Function(TelemetryReport) listener) {
    _listeners.add(listener);
  }

  /// Remove a report listener.
  void removeReportListener(void Function(TelemetryReport) listener) {
    _listeners.remove(listener);
  }

  /// Persist metrics to storage.
  Future<void> _persistMetrics() async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    final report = generateReport();
    await prefs.setString(
      'network_telemetry_last_report',
      jsonEncode(report.toJson()),
    );
  }

  /// Load persisted metrics.
  Future<void> _loadPersistedMetrics() async {
    // We don't restore counters - they reset on app start
    // This is intentional to avoid double-counting
  }

  /// Reset all metrics.
  void reset() {
    for (final counter in _httpErrorsTotal.values) {
      counter.reset();
    }
    _syncFailuresTotal.reset();
    _syncSuccessTotal.reset();
    _circuitBreakerOpenTotal.reset();
    _retryAttempts.reset();
    _fallbacksUsed.reset();
    _requestLatency.reset();
    _syncDuration.reset();
    _connectionTime.reset();
    _endpointLatencies.clear();
  }

  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[NetworkTelemetry] $message');
    }
  }

  /// Dispose resources.
  void dispose() {
    _reportingTimer?.cancel();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TELEMETRY REPORT
// ══════════════════════════════════════════════════════════════════════════════

/// Snapshot of network telemetry.
class TelemetryReport {
  const TelemetryReport({
    required this.timestamp,
    required this.httpErrorCounts,
    required this.syncFailures,
    required this.syncSuccesses,
    required this.avgSyncDurationMs,
    required this.syncDurationP95,
    required this.avgRequestLatencyMs,
    required this.requestLatencyP95,
    required this.requestLatencyP99,
    required this.avgConnectionTimeMs,
    required this.circuitBreakerOpens,
    required this.retryAttempts,
    required this.fallbacksUsed,
    required this.activeRequests,
    required this.pendingSyncItems,
    required this.offlineDurationSeconds,
    required this.openCircuits,
    required this.endpointStats,
  });

  final DateTime timestamp;
  final Map<String, int> httpErrorCounts;
  final int syncFailures;
  final int syncSuccesses;
  final double avgSyncDurationMs;
  final double syncDurationP95;
  final double avgRequestLatencyMs;
  final double requestLatencyP95;
  final double requestLatencyP99;
  final double avgConnectionTimeMs;
  final int circuitBreakerOpens;
  final int retryAttempts;
  final int fallbacksUsed;
  final int activeRequests;
  final int pendingSyncItems;
  final int offlineDurationSeconds;
  final List<String> openCircuits;
  final Map<String, Map<String, double>> endpointStats;

  /// Total HTTP errors across all types.
  int get totalHttpErrors => httpErrorCounts.values.fold(0, (a, b) => a + b);

  /// Sync success rate (0-100).
  double get syncSuccessRate {
    final total = syncSuccesses + syncFailures;
    if (total == 0) return 100;
    return (syncSuccesses / total) * 100;
  }

  /// Check if metrics indicate healthy network.
  bool get isHealthy {
    return totalHttpErrors < 10 &&
        syncSuccessRate > 90 &&
        avgRequestLatencyMs < 1000 &&
        openCircuits.isEmpty;
  }

  /// Get health status.
  NetworkHealthStatus get healthStatus {
    if (openCircuits.isNotEmpty) {
      return NetworkHealthStatus.critical;
    }
    if (syncSuccessRate < 50 || avgRequestLatencyMs > 5000) {
      return NetworkHealthStatus.unhealthy;
    }
    if (syncSuccessRate < 90 || avgRequestLatencyMs > 2000) {
      return NetworkHealthStatus.degraded;
    }
    return NetworkHealthStatus.healthy;
  }

  Map<String, dynamic> toJson() => {
        'timestamp': timestamp.toIso8601String(),
        'httpErrorCounts': httpErrorCounts,
        'syncFailures': syncFailures,
        'syncSuccesses': syncSuccesses,
        'avgSyncDurationMs': avgSyncDurationMs,
        'syncDurationP95': syncDurationP95,
        'avgRequestLatencyMs': avgRequestLatencyMs,
        'requestLatencyP95': requestLatencyP95,
        'requestLatencyP99': requestLatencyP99,
        'avgConnectionTimeMs': avgConnectionTimeMs,
        'circuitBreakerOpens': circuitBreakerOpens,
        'retryAttempts': retryAttempts,
        'fallbacksUsed': fallbacksUsed,
        'activeRequests': activeRequests,
        'pendingSyncItems': pendingSyncItems,
        'offlineDurationSeconds': offlineDurationSeconds,
        'openCircuits': openCircuits,
        'endpointStats': endpointStats,
        'totalHttpErrors': totalHttpErrors,
        'syncSuccessRate': syncSuccessRate,
        'healthStatus': healthStatus.name,
      };
}

/// Network health status.
enum NetworkHealthStatus {
  healthy,
  degraded,
  unhealthy,
  critical,
}
