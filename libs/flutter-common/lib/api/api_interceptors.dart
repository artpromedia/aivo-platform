/// API Interceptors
///
/// Dio interceptors for authentication, correlation ID, and error handling.
library;

import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import 'api_exceptions.dart';

/// Storage keys for tokens.
abstract class TokenStorageKeys {
  static const String accessToken = 'aivo_access_token';
  static const String refreshToken = 'aivo_refresh_token';
}

/// Token refresh callback signature.
typedef TokenRefreshCallback = Future<String?> Function(String refreshToken);

/// Auth state change callback signature.
typedef AuthStateCallback = void Function(bool isAuthenticated);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Interceptor for JWT authentication with auto-refresh.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.dio,
    required this.storage,
    required this.refreshEndpoint,
    this.onAuthStateChanged,
    this.excludedPaths = const ['/auth/login', '/auth/register', '/auth/refresh'],
  });

  final Dio dio;
  final FlutterSecureStorage storage;
  final String refreshEndpoint;
  final AuthStateCallback? onAuthStateChanged;
  final List<String> excludedPaths;

  bool _isRefreshing = false;
  final _refreshCompleter = <Completer<String?>>[];

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth for excluded paths
    final path = options.path;
    if (excludedPaths.any((p) => path.startsWith(p))) {
      return handler.next(options);
    }

    // Add access token to headers
    final accessToken = await storage.read(key: TokenStorageKeys.accessToken);
    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Only handle 401 errors
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // Skip refresh for excluded paths
    final path = err.requestOptions.path;
    if (excludedPaths.any((p) => path.startsWith(p))) {
      return handler.next(err);
    }

    // Attempt token refresh
    final newToken = await _refreshToken();
    if (newToken == null) {
      // Refresh failed, clear tokens and notify
      await _clearTokens();
      onAuthStateChanged?.call(false);
      return handler.next(err);
    }

    // Retry original request with new token
    try {
      final options = err.requestOptions;
      options.headers['Authorization'] = 'Bearer $newToken';

      final response = await dio.fetch(options);
      return handler.resolve(response);
    } catch (e) {
      return handler.next(err);
    }
  }

  Future<String?> _refreshToken() async {
    // If already refreshing, wait for result
    if (_isRefreshing) {
      final completer = Completer<String?>();
      _refreshCompleter.add(completer);
      return completer.future;
    }

    _isRefreshing = true;

    try {
      final refreshToken = await storage.read(key: TokenStorageKeys.refreshToken);
      if (refreshToken == null) {
        return null;
      }

      final response = await dio.post(
        refreshEndpoint,
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {'Authorization': 'Bearer $refreshToken'},
        ),
      );

      final data = response.data as Map<String, dynamic>?;
      final newAccessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;

      if (newAccessToken == null) {
        return null;
      }

      // Store new tokens
      await storage.write(key: TokenStorageKeys.accessToken, value: newAccessToken);
      if (newRefreshToken != null) {
        await storage.write(key: TokenStorageKeys.refreshToken, value: newRefreshToken);
      }

      // Complete waiting requests
      for (final completer in _refreshCompleter) {
        completer.complete(newAccessToken);
      }
      _refreshCompleter.clear();

      return newAccessToken;
    } catch (e) {
      // Complete waiting requests with null
      for (final completer in _refreshCompleter) {
        completer.complete(null);
      }
      _refreshCompleter.clear();
      return null;
    } finally {
      _isRefreshing = false;
    }
  }

  Future<void> _clearTokens() async {
    await storage.delete(key: TokenStorageKeys.accessToken);
    await storage.delete(key: TokenStorageKeys.refreshToken);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION ID INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Interceptor for correlation ID tracking.
class CorrelationIdInterceptor extends Interceptor {
  CorrelationIdInterceptor({
    this.headerName = 'X-Request-ID',
  });

  final String headerName;
  final _uuid = const Uuid();

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Generate correlation ID if not present
    options.headers[headerName] ??= _uuid.v4();
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    // Log correlation ID for debugging
    final correlationId = response.requestOptions.headers[headerName];
    if (kDebugMode && correlationId != null) {
      debugPrint('[API] ${response.requestOptions.method} ${response.requestOptions.path} '
          '-> ${response.statusCode} [correlation: $correlationId]');
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Log correlation ID for debugging
    final correlationId = err.requestOptions.headers[headerName];
    if (kDebugMode && correlationId != null) {
      debugPrint('[API ERROR] ${err.requestOptions.method} ${err.requestOptions.path} '
          '-> ${err.response?.statusCode ?? 'NETWORK'} [correlation: $correlationId]');
    }
    handler.next(err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Interceptor for adding tenant context headers.
class TenantInterceptor extends Interceptor {
  TenantInterceptor({
    required this.getTenantId,
  });

  final String? Function() getTenantId;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final tenantId = getTenantId();
    if (tenantId != null) {
      options.headers['X-Tenant-ID'] = tenantId;
    }
    handler.next(options);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Interceptor for automatic retry with exponential backoff.
class RetryInterceptor extends Interceptor {
  RetryInterceptor({
    required this.dio,
    this.maxRetries = 3,
    this.retryDelays = const [
      Duration(seconds: 1),
      Duration(seconds: 2),
      Duration(seconds: 4),
    ],
    this.retryableStatuses = const [408, 429, 500, 502, 503, 504],
  });

  final Dio dio;
  final int maxRetries;
  final List<Duration> retryDelays;
  final List<int> retryableStatuses;

  static const _retryCountKey = 'retry_count';

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final statusCode = err.response?.statusCode;
    final shouldRetry = _shouldRetry(err, statusCode);

    if (!shouldRetry) {
      return handler.next(err);
    }

    final retryCount = (err.requestOptions.extra[_retryCountKey] as int?) ?? 0;
    if (retryCount >= maxRetries) {
      return handler.next(err);
    }

    // Calculate delay
    final delay = retryCount < retryDelays.length
        ? retryDelays[retryCount]
        : retryDelays.last;

    // Check for Retry-After header
    final retryAfter = err.response?.headers.value('retry-after');
    final actualDelay = retryAfter != null
        ? Duration(seconds: int.tryParse(retryAfter) ?? delay.inSeconds)
        : delay;

    if (kDebugMode) {
      debugPrint('[API] Retrying request (attempt ${retryCount + 1}/$maxRetries) '
          'after ${actualDelay.inSeconds}s: ${err.requestOptions.path}');
    }

    await Future<void>.delayed(actualDelay);

    // Retry request
    try {
      final options = err.requestOptions;
      options.extra[_retryCountKey] = retryCount + 1;
      final response = await dio.fetch(options);
      return handler.resolve(response);
    } on DioException catch (e) {
      return handler.next(e);
    }
  }

  bool _shouldRetry(DioException err, int? statusCode) {
    // Network errors are retryable
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      return true;
    }

    // Check status code
    if (statusCode != null && retryableStatuses.contains(statusCode)) {
      return true;
    }

    // Socket exceptions are retryable
    if (err.error is SocketException) {
      return true;
    }

    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TRANSFORMER INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Interceptor that transforms Dio errors to typed API exceptions.
class ErrorTransformerInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final apiException = _transformError(err);
    handler.next(DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: apiException,
      message: apiException.message,
    ));
  }

  ApiException _transformError(DioException err) {
    final correlationId = err.requestOptions.headers['X-Request-ID'] as String?;
    final statusCode = err.response?.statusCode;
    final data = err.response?.data;

    // Handle network errors
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      return TimeoutException(
        message: 'Request timed out. Please try again.',
        originalError: err,
      );
    }

    if (err.type == DioExceptionType.connectionError) {
      return NetworkException(
        message: 'Unable to connect. Please check your internet connection.',
        originalError: err,
      );
    }

    // Extract error message from response
    String message = 'An unexpected error occurred';
    if (data is Map<String, dynamic>) {
      message = data['error']?.toString() ??
          data['message']?.toString() ??
          message;
    }

    // Transform by status code
    switch (statusCode) {
      case 400:
        final errors = <String, List<String>>{};
        if (data is Map<String, dynamic> && data['errors'] is Map) {
          final errorMap = data['errors'] as Map;
          for (final entry in errorMap.entries) {
            final key = entry.key.toString();
            final value = entry.value;
            if (value is List) {
              errors[key] = value.map((e) => e.toString()).toList();
            } else {
              errors[key] = [value.toString()];
            }
          }
        }
        return ValidationException(
          message: message,
          errors: errors,
          correlationId: correlationId,
        );

      case 401:
        return UnauthorizedException(
          message: message,
          correlationId: correlationId,
        );

      case 403:
        // Check for consent required
        if (data is Map<String, dynamic> && data['requiredConsents'] is List) {
          final consents = (data['requiredConsents'] as List)
              .map((e) => e.toString())
              .toList();
          return ConsentRequiredException(
            requiredConsents: consents,
            message: message,
            correlationId: correlationId,
          );
        }
        return ForbiddenException(
          message: message,
          correlationId: correlationId,
        );

      case 404:
        return NotFoundException(
          message: message,
          correlationId: correlationId,
        );

      case 429:
        final retryAfterHeader = err.response?.headers.value('retry-after');
        final retryAfter = retryAfterHeader != null
            ? Duration(seconds: int.tryParse(retryAfterHeader) ?? 60)
            : null;
        return RateLimitException(
          message: message,
          retryAfter: retryAfter,
          correlationId: correlationId,
        );

      default:
        if (statusCode != null && statusCode >= 500) {
          return ServerException(
            message: message,
            statusCode: statusCode,
            correlationId: correlationId,
          );
        }
        return ServerException(
          message: message,
          correlationId: correlationId,
        );
    }
  }
}
