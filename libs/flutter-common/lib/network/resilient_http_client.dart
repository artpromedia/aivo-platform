/// Resilient HTTP Client for School Networks
///
/// This module provides a robust HTTP client designed for challenging
/// network conditions common in school environments:
/// - Captive portals
/// - High latency / intermittent connectivity
/// - Content filters and proxies
/// - Shared bandwidth with many devices
///
/// Features:
/// - Configurable timeouts per request type
/// - Automatic retry with exponential backoff
/// - Correlation ID tracking for distributed tracing
/// - Request/response logging for debugging
/// - Error aggregation (no toast spam)
/// - Network telemetry collection
library;

import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/// Default timeout configuration for different request types.
class NetworkTimeouts {
  const NetworkTimeouts._();

  /// Quick operations: health checks, simple GETs
  static const Duration quick = Duration(seconds: 5);

  /// Standard operations: most API calls
  static const Duration standard = Duration(seconds: 10);

  /// Heavy operations: content downloads, bulk uploads
  static const Duration heavy = Duration(seconds: 30);

  /// AI operations: LLM calls that may take longer
  static const Duration aiOperation = Duration(seconds: 45);

  /// Connection establishment timeout
  static const Duration connect = Duration(seconds: 5);

  /// Default receive timeout for streaming responses
  static const Duration receive = Duration(seconds: 20);
}

/// Retry configuration
class RetryConfig {
  const RetryConfig({
    this.maxAttempts = 3,
    this.initialDelay = const Duration(milliseconds: 500),
    this.maxDelay = const Duration(seconds: 30),
    this.backoffMultiplier = 2.0,
    this.jitterFactor = 0.2,
  });

  final int maxAttempts;
  final Duration initialDelay;
  final Duration maxDelay;
  final double backoffMultiplier;
  final double jitterFactor;

  /// No retries
  static const RetryConfig none = RetryConfig(maxAttempts: 1);

  /// Default retry config for standard requests
  static const RetryConfig standard = RetryConfig();

  /// More aggressive retries for critical operations
  static const RetryConfig aggressive = RetryConfig(
    maxAttempts: 5,
    initialDelay: Duration(milliseconds: 250),
  );

  /// Calculate delay for attempt number (1-indexed)
  Duration delayForAttempt(int attempt) {
    if (attempt <= 1) return Duration.zero;

    final baseDelay = initialDelay.inMilliseconds *
        math.pow(backoffMultiplier, attempt - 2);
    final cappedDelay = math.min(baseDelay, maxDelay.inMilliseconds);

    // Add jitter to prevent thundering herd
    final jitter = (math.Random().nextDouble() * 2 - 1) * jitterFactor;
    final finalDelay = cappedDelay * (1 + jitter);

    return Duration(milliseconds: finalDelay.toInt());
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/// Configuration for a single HTTP request.
class RequestConfig {
  const RequestConfig({
    this.timeout = NetworkTimeouts.standard,
    this.retryConfig = RetryConfig.standard,
    this.priority = RequestPriority.normal,
    this.allowRetryOn4xx = false,
    this.correlationId,
    this.tags = const {},
  });

  final Duration timeout;
  final RetryConfig retryConfig;
  final RequestPriority priority;
  final bool allowRetryOn4xx;
  final String? correlationId;
  final Map<String, String> tags;

  /// Quick request (no retries, short timeout)
  static const RequestConfig quick = RequestConfig(
    timeout: NetworkTimeouts.quick,
    retryConfig: RetryConfig.none,
  );

  /// Standard request with retries
  static const RequestConfig standard = RequestConfig();

  /// Heavy content request (longer timeout)
  static const RequestConfig heavy = RequestConfig(
    timeout: NetworkTimeouts.heavy,
    retryConfig: RetryConfig.aggressive,
  );

  /// AI operation request
  static const RequestConfig aiOperation = RequestConfig(
    timeout: NetworkTimeouts.aiOperation,
    retryConfig: RetryConfig.standard,
  );

  /// Bulk/sync operation
  static const RequestConfig bulk = RequestConfig(
    timeout: NetworkTimeouts.heavy,
    retryConfig: RetryConfig.aggressive,
    priority: RequestPriority.low,
  );
}

/// Request priority levels.
enum RequestPriority {
  /// Critical requests (auth, core data)
  critical,

  /// Normal priority
  normal,

  /// Low priority (background sync, analytics)
  low,
}

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK ERROR TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// Categorized network error for telemetry and handling.
enum NetworkErrorType {
  /// Connection timeout
  connectionTimeout,

  /// Receive/read timeout
  receiveTimeout,

  /// DNS resolution failed
  dnsError,

  /// Connection refused/reset
  connectionError,

  /// SSL/TLS error
  sslError,

  /// HTTP 4xx client error
  clientError,

  /// HTTP 5xx server error
  serverError,

  /// Rate limited (429)
  rateLimited,

  /// Unknown/other error
  unknown,
}

/// Exception with categorized error type.
class NetworkException implements Exception {
  const NetworkException({
    required this.type,
    required this.message,
    this.statusCode,
    this.url,
    this.correlationId,
    this.originalError,
    this.retryable = true,
  });

  final NetworkErrorType type;
  final String message;
  final int? statusCode;
  final String? url;
  final String? correlationId;
  final Object? originalError;
  final bool retryable;

  /// User-friendly error message.
  String get userMessage {
    switch (type) {
      case NetworkErrorType.connectionTimeout:
      case NetworkErrorType.receiveTimeout:
        return 'Network is slow or unavailable. We\'ll try again automatically.';
      case NetworkErrorType.dnsError:
      case NetworkErrorType.connectionError:
        return 'Unable to connect. Please check your internet connection.';
      case NetworkErrorType.sslError:
        return 'Secure connection failed. Please try again.';
      case NetworkErrorType.rateLimited:
        return 'Too many requests. Please wait a moment.';
      case NetworkErrorType.serverError:
        return 'Server is temporarily unavailable. We\'ll retry automatically.';
      case NetworkErrorType.clientError:
        return 'Request failed. Please try again.';
      case NetworkErrorType.unknown:
        return 'Something went wrong. Please try again.';
    }
  }

  @override
  String toString() =>
      'NetworkException: $type - $message (status: $statusCode, url: $url)';
}

// ══════════════════════════════════════════════════════════════════════════════
// TELEMETRY
// ══════════════════════════════════════════════════════════════════════════════

/// Network telemetry collector.
class NetworkTelemetry {
  NetworkTelemetry._();

  static final NetworkTelemetry instance = NetworkTelemetry._();

  final _errorCounts = <NetworkErrorType, int>{};
  final _requestDurations = <String, List<int>>{};
  final _errorListeners = <void Function(NetworkErrorType, String?)>[];
  final _metricsListeners = <void Function(NetworkMetrics)>[];

  DateTime? _lastErrorNotification;
  int _aggregatedErrorCount = 0;

  /// Add a listener for network errors.
  void addErrorListener(void Function(NetworkErrorType, String?) listener) {
    _errorListeners.add(listener);
  }

  /// Add a listener for metrics updates.
  void addMetricsListener(void Function(NetworkMetrics) listener) {
    _metricsListeners.add(listener);
  }

  /// Record a network error.
  void recordError(NetworkErrorType type, {String? endpoint}) {
    _errorCounts[type] = (_errorCounts[type] ?? 0) + 1;
    _aggregatedErrorCount++;

    // Debounce error notifications (don't spam user with toasts)
    final now = DateTime.now();
    if (_lastErrorNotification == null ||
        now.difference(_lastErrorNotification!) > const Duration(seconds: 10)) {
      _lastErrorNotification = now;
      for (final listener in _errorListeners) {
        listener(type, endpoint);
      }
    }

    _notifyMetricsListeners();
  }

  /// Record a successful request duration.
  void recordRequestDuration(String endpoint, int durationMs) {
    _requestDurations.putIfAbsent(endpoint, () => []);
    final list = _requestDurations[endpoint]!;
    list.add(durationMs);
    // Keep only last 100 samples
    if (list.length > 100) list.removeAt(0);

    _notifyMetricsListeners();
  }

  /// Get current metrics snapshot.
  NetworkMetrics getMetrics() {
    final avgDurations = <String, double>{};
    for (final entry in _requestDurations.entries) {
      if (entry.value.isNotEmpty) {
        avgDurations[entry.key] =
            entry.value.reduce((a, b) => a + b) / entry.value.length;
      }
    }

    return NetworkMetrics(
      errorCounts: Map.unmodifiable(_errorCounts),
      averageDurations: avgDurations,
      totalErrors: _errorCounts.values.fold(0, (a, b) => a + b),
      aggregatedErrorCount: _aggregatedErrorCount,
    );
  }

  /// Reset all metrics.
  void reset() {
    _errorCounts.clear();
    _requestDurations.clear();
    _aggregatedErrorCount = 0;
    _lastErrorNotification = null;
  }

  void _notifyMetricsListeners() {
    final metrics = getMetrics();
    for (final listener in _metricsListeners) {
      listener(metrics);
    }
  }
}

/// Snapshot of network metrics.
class NetworkMetrics {
  const NetworkMetrics({
    required this.errorCounts,
    required this.averageDurations,
    required this.totalErrors,
    required this.aggregatedErrorCount,
  });

  final Map<NetworkErrorType, int> errorCounts;
  final Map<String, double> averageDurations;
  final int totalErrors;
  final int aggregatedErrorCount;

  Map<String, dynamic> toJson() => {
        'errorCounts': errorCounts.map((k, v) => MapEntry(k.name, v)),
        'averageDurations': averageDurations,
        'totalErrors': totalErrors,
        'aggregatedErrorCount': aggregatedErrorCount,
      };
}

// ══════════════════════════════════════════════════════════════════════════════
// RESILIENT HTTP CLIENT
// ══════════════════════════════════════════════════════════════════════════════

/// HTTP client with built-in resilience for school networks.
///
/// Features:
/// - Configurable timeouts per request
/// - Automatic retry with exponential backoff
/// - Correlation ID tracking
/// - Request/response logging
/// - Telemetry collection
///
/// Usage:
/// ```dart
/// final client = ResilientHttpClient(
///   baseUrl: 'https://api.aivo.app',
///   tenantId: 'tenant-uuid',
/// );
///
/// final response = await client.get(
///   '/lessons/123',
///   config: RequestConfig.standard,
/// );
/// ```
class ResilientHttpClient {
  ResilientHttpClient({
    required this.baseUrl,
    this.tenantId,
    this.defaultHeaders = const {},
    http.Client? innerClient,
    this.enableLogging = kDebugMode,
  }) : _innerClient = innerClient ?? http.Client();

  final String baseUrl;
  final String? tenantId;
  final Map<String, String> defaultHeaders;
  final http.Client _innerClient;
  final bool enableLogging;

  final _uuid = const Uuid();
  final _telemetry = NetworkTelemetry.instance;

  /// GET request with resilience.
  Future<http.Response> get(
    String path, {
    Map<String, String>? headers,
    Map<String, String>? queryParams,
    RequestConfig config = RequestConfig.standard,
  }) async {
    return _executeWithRetry(
      method: 'GET',
      path: path,
      headers: headers,
      queryParams: queryParams,
      config: config,
    );
  }

  /// POST request with resilience.
  Future<http.Response> post(
    String path, {
    Map<String, String>? headers,
    Object? body,
    RequestConfig config = RequestConfig.standard,
  }) async {
    return _executeWithRetry(
      method: 'POST',
      path: path,
      headers: headers,
      body: body,
      config: config,
    );
  }

  /// PUT request with resilience.
  Future<http.Response> put(
    String path, {
    Map<String, String>? headers,
    Object? body,
    RequestConfig config = RequestConfig.standard,
  }) async {
    return _executeWithRetry(
      method: 'PUT',
      path: path,
      headers: headers,
      body: body,
      config: config,
    );
  }

  /// PATCH request with resilience.
  Future<http.Response> patch(
    String path, {
    Map<String, String>? headers,
    Object? body,
    RequestConfig config = RequestConfig.standard,
  }) async {
    return _executeWithRetry(
      method: 'PATCH',
      path: path,
      headers: headers,
      body: body,
      config: config,
    );
  }

  /// DELETE request with resilience.
  Future<http.Response> delete(
    String path, {
    Map<String, String>? headers,
    RequestConfig config = RequestConfig.standard,
  }) async {
    return _executeWithRetry(
      method: 'DELETE',
      path: path,
      headers: headers,
      config: config,
    );
  }

  /// Execute request with retry logic.
  Future<http.Response> _executeWithRetry({
    required String method,
    required String path,
    Map<String, String>? headers,
    Map<String, String>? queryParams,
    Object? body,
    required RequestConfig config,
  }) async {
    final correlationId = config.correlationId ?? _uuid.v4();
    final uri = _buildUri(path, queryParams);
    final mergedHeaders = _buildHeaders(headers, correlationId);

    NetworkException? lastError;

    for (var attempt = 1; attempt <= config.retryConfig.maxAttempts; attempt++) {
      // Wait before retry (except first attempt)
      if (attempt > 1) {
        final delay = config.retryConfig.delayForAttempt(attempt);
        _log('Retry $attempt after ${delay.inMilliseconds}ms for $method $path');
        await Future.delayed(delay);
      }

      final stopwatch = Stopwatch()..start();

      try {
        final response = await _executeRequest(
          method: method,
          uri: uri,
          headers: mergedHeaders,
          body: body,
          timeout: config.timeout,
        );

        stopwatch.stop();
        _telemetry.recordRequestDuration(path, stopwatch.elapsedMilliseconds);

        // Check for retryable status codes
        if (_isRetryableStatus(response.statusCode, config)) {
          lastError = _createNetworkException(
            statusCode: response.statusCode,
            url: uri.toString(),
            correlationId: correlationId,
          );

          if (attempt < config.retryConfig.maxAttempts) {
            _log('Retryable status ${response.statusCode} for $method $path');
            continue;
          }
        }

        // Check for non-retryable errors
        if (response.statusCode >= 400) {
          throw _createNetworkException(
            statusCode: response.statusCode,
            url: uri.toString(),
            correlationId: correlationId,
            body: response.body,
          );
        }

        _log('Success $method $path (${stopwatch.elapsedMilliseconds}ms)');
        return response;
      } on NetworkException {
        rethrow;
      } on TimeoutException catch (e) {
        stopwatch.stop();
        lastError = NetworkException(
          type: NetworkErrorType.receiveTimeout,
          message: 'Request timed out after ${config.timeout.inSeconds}s',
          url: uri.toString(),
          correlationId: correlationId,
          originalError: e,
        );
        _telemetry.recordError(NetworkErrorType.receiveTimeout, endpoint: path);
        _log('Timeout $method $path: $e');
      } on http.ClientException catch (e) {
        stopwatch.stop();
        lastError = _classifyClientException(e, uri.toString(), correlationId);
        _telemetry.recordError(lastError.type, endpoint: path);
        _log('Client error $method $path: $e');
      } catch (e) {
        stopwatch.stop();
        lastError = NetworkException(
          type: NetworkErrorType.unknown,
          message: e.toString(),
          url: uri.toString(),
          correlationId: correlationId,
          originalError: e,
        );
        _telemetry.recordError(NetworkErrorType.unknown, endpoint: path);
        _log('Unknown error $method $path: $e');
      }
    }

    throw lastError!;
  }

  /// Execute a single HTTP request.
  Future<http.Response> _executeRequest({
    required String method,
    required Uri uri,
    required Map<String, String> headers,
    Object? body,
    required Duration timeout,
  }) async {
    final request = http.Request(method, uri);
    request.headers.addAll(headers);

    if (body != null) {
      if (body is String) {
        request.body = body;
      } else if (body is Map || body is List) {
        request.body = jsonEncode(body);
        request.headers['Content-Type'] = 'application/json';
      } else if (body is List<int>) {
        request.bodyBytes = body;
      }
    }

    final streamedResponse = await _innerClient
        .send(request)
        .timeout(timeout);

    return http.Response.fromStream(streamedResponse);
  }

  /// Build full URI with query parameters.
  Uri _buildUri(String path, Map<String, String>? queryParams) {
    final fullPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$baseUrl$fullPath');

    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  /// Build merged headers with defaults.
  Map<String, String> _buildHeaders(
    Map<String, String>? headers,
    String correlationId,
  ) {
    return {
      ...defaultHeaders,
      if (tenantId != null) 'X-Tenant-Id': tenantId!,
      'X-Correlation-Id': correlationId,
      'X-Client-Version': '1.0.0', // TODO: Get from package info
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      ...?headers,
    };
  }

  /// Check if status code is retryable.
  bool _isRetryableStatus(int statusCode, RequestConfig config) {
    if (statusCode == 429) return true; // Rate limited
    if (statusCode >= 500) return true; // Server errors
    if (config.allowRetryOn4xx && statusCode >= 400 && statusCode < 500) {
      return true;
    }
    return false;
  }

  /// Create NetworkException from status code.
  NetworkException _createNetworkException({
    required int statusCode,
    required String url,
    required String correlationId,
    String? body,
  }) {
    NetworkErrorType type;
    bool retryable;

    if (statusCode == 429) {
      type = NetworkErrorType.rateLimited;
      retryable = true;
    } else if (statusCode >= 500) {
      type = NetworkErrorType.serverError;
      retryable = true;
    } else {
      type = NetworkErrorType.clientError;
      retryable = false;
    }

    _telemetry.recordError(type, endpoint: url);

    return NetworkException(
      type: type,
      message: 'HTTP $statusCode',
      statusCode: statusCode,
      url: url,
      correlationId: correlationId,
      retryable: retryable,
    );
  }

  /// Classify a client exception.
  NetworkException _classifyClientException(
    http.ClientException e,
    String url,
    String correlationId,
  ) {
    final message = e.message.toLowerCase();

    if (message.contains('timeout') || message.contains('timed out')) {
      return NetworkException(
        type: NetworkErrorType.connectionTimeout,
        message: e.message,
        url: url,
        correlationId: correlationId,
        originalError: e,
      );
    }

    if (message.contains('dns') || message.contains('resolve')) {
      return NetworkException(
        type: NetworkErrorType.dnsError,
        message: e.message,
        url: url,
        correlationId: correlationId,
        originalError: e,
        retryable: false, // DNS errors usually need user action
      );
    }

    if (message.contains('ssl') ||
        message.contains('certificate') ||
        message.contains('handshake')) {
      return NetworkException(
        type: NetworkErrorType.sslError,
        message: e.message,
        url: url,
        correlationId: correlationId,
        originalError: e,
        retryable: false,
      );
    }

    if (message.contains('connection') ||
        message.contains('refused') ||
        message.contains('reset')) {
      return NetworkException(
        type: NetworkErrorType.connectionError,
        message: e.message,
        url: url,
        correlationId: correlationId,
        originalError: e,
      );
    }

    return NetworkException(
      type: NetworkErrorType.unknown,
      message: e.message,
      url: url,
      correlationId: correlationId,
      originalError: e,
    );
  }

  void _log(String message) {
    if (enableLogging) {
      debugPrint('[ResilientHttpClient] $message');
    }
  }

  /// Close the inner HTTP client.
  void close() {
    _innerClient.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR AGGREGATOR
// ══════════════════════════════════════════════════════════════════════════════

/// Aggregates network errors to prevent toast spam.
///
/// Instead of showing a toast for every failed request, this collects
/// errors and shows a single notification after a debounce period.
class NetworkErrorAggregator {
  NetworkErrorAggregator({
    this.debounceInterval = const Duration(seconds: 5),
    this.onNotify,
  });

  final Duration debounceInterval;
  final void Function(String message, int errorCount)? onNotify;

  final _pendingErrors = <NetworkException>[];
  Timer? _debounceTimer;

  /// Add an error to the aggregator.
  void addError(NetworkException error) {
    _pendingErrors.add(error);

    _debounceTimer?.cancel();
    _debounceTimer = Timer(debounceInterval, _flushErrors);
  }

  void _flushErrors() {
    if (_pendingErrors.isEmpty) return;

    // Find the most common/relevant error type
    final typeCounts = <NetworkErrorType, int>{};
    for (final error in _pendingErrors) {
      typeCounts[error.type] = (typeCounts[error.type] ?? 0) + 1;
    }

    final mostCommon = typeCounts.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;

    final sampleError = _pendingErrors.firstWhere((e) => e.type == mostCommon);
    final count = _pendingErrors.length;

    _pendingErrors.clear();

    onNotify?.call(sampleError.userMessage, count);
  }

  /// Clear pending errors without notification.
  void clear() {
    _debounceTimer?.cancel();
    _pendingErrors.clear();
  }

  void dispose() {
    _debounceTimer?.cancel();
  }
}
