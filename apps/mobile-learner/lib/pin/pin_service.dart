import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/environment.dart';

/// PIN attempt rate limiting configuration.
class PinRateLimiter {
  PinRateLimiter({
    this.maxAttempts = 5,
    this.lockoutDuration = const Duration(minutes: 5),
  });

  final int maxAttempts;
  final Duration lockoutDuration;

  int _failedAttempts = 0;
  DateTime? _lockoutUntil;

  /// Number of remaining attempts before lockout.
  int get attemptsRemaining => (maxAttempts - _failedAttempts).clamp(0, maxAttempts);

  /// Whether the user is currently locked out.
  bool get isLockedOut {
    if (_lockoutUntil == null) return false;
    if (DateTime.now().isAfter(_lockoutUntil!)) {
      // Lockout expired, reset
      _failedAttempts = 0;
      _lockoutUntil = null;
      return false;
    }
    return true;
  }

  /// Time remaining until lockout expires.
  Duration get lockoutTimeRemaining {
    if (_lockoutUntil == null) return Duration.zero;
    final remaining = _lockoutUntil!.difference(DateTime.now());
    return remaining.isNegative ? Duration.zero : remaining;
  }

  /// Record a failed attempt. Returns true if now locked out.
  bool recordFailedAttempt() {
    _failedAttempts++;
    if (_failedAttempts >= maxAttempts) {
      _lockoutUntil = DateTime.now().add(lockoutDuration);
      return true;
    }
    return false;
  }

  /// Reset on successful authentication.
  void reset() {
    _failedAttempts = 0;
    _lockoutUntil = null;
  }
}

/// Service for PIN-based child authentication.
///
/// Uses [EnvironmentConfig] for configuration. Mock mode is only available
/// in development builds with explicit opt-in.
///
/// Includes rate limiting to protect against brute force attacks.
class PinService {
  PinService({PinRateLimiter? rateLimiter})
      : _dio = Dio(BaseOptions(baseUrl: EnvironmentConfig.authBaseUrl)),
        _rateLimiter = rateLimiter ?? PinRateLimiter();

  final Dio _dio;
  final PinRateLimiter _rateLimiter;

  /// Get rate limiter state for UI feedback.
  PinRateLimiter get rateLimiter => _rateLimiter;

  /// Validates a PIN and returns an authentication token.
  ///
  /// Returns a JWT token if the PIN is valid.
  /// Throws [PinException] if validation fails.
  /// Throws [PinLockoutException] if too many failed attempts.
  Future<String> validatePin(String pin) async {
    // Check lockout first
    if (_rateLimiter.isLockedOut) {
      final minutes = (_rateLimiter.lockoutTimeRemaining.inSeconds / 60).ceil();
      throw PinLockoutException(
        'Too many tries! Take a break and try again in $minutes minute${minutes == 1 ? '' : 's'}.',
        timeRemaining: _rateLimiter.lockoutTimeRemaining,
      );
    }

    // Mock mode only available in development with explicit opt-in
    if (EnvironmentConfig.useAuthMock) {
      debugPrint('⚠️ [PinService] Using mock authentication - development only');
      return _mockToken(pin);
    }

    try {
      final response = await _dio.post('/auth/pin-login', data: {'pin': pin});
      final data = response.data as Map<String, dynamic>;
      final token = data['token']?.toString();
      if (token == null) throw const PinException('Missing token');
      
      // Success - reset rate limiter
      _rateLimiter.reset();
      return token;
    } on DioException catch (err) {
      // Record failed attempt
      final nowLockedOut = _rateLimiter.recordFailedAttempt();
      
      if (nowLockedOut) {
        throw PinLockoutException(
          'Too many tries! Take a break and try again later.',
          timeRemaining: _rateLimiter.lockoutDuration,
        );
      }
      
      final remaining = _rateLimiter.attemptsRemaining;
      final message = err.response?.data is Map && (err.response!.data as Map)['error'] != null
          ? (err.response!.data as Map)['error'].toString()
          : 'Hmm, that PIN didn\'t work. You have $remaining tr${remaining == 1 ? 'y' : 'ies'} left.';
      throw PinException(message, attemptsRemaining: remaining);
    } catch (e) {
      debugPrint('[PinService] Unexpected error validating PIN: $e');
      _rateLimiter.recordFailedAttempt();
      throw PinException(
        'Something went wrong. Let\'s try again!',
        attemptsRemaining: _rateLimiter.attemptsRemaining,
      );
    }
  }

  /// Creates mock token for development testing only.
  String _mockToken(String pin) {
    // Defense in depth: verify mock mode is actually enabled
    assert(EnvironmentConfig.useAuthMock, 'Mock tokens should only be created in mock mode');
    
    if (!kDebugMode) {
      throw const PinException('Mock authentication is not available in release builds');
    }

    // Reset rate limiter on mock success
    _rateLimiter.reset();

    final payload = {
      'learner_id': 'learner-$pin',
      'tenant_id': 'mock-tenant',
      'exp': DateTime.now().add(const Duration(hours: 4)).millisecondsSinceEpoch ~/ 1000,
      'mock': true,
    };
    return _encodeMockJwt(payload);
  }

  String _encodeMockJwt(Map<String, dynamic> payload) {
    final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'none', 'typ': 'JWT'})));
    final body = base64Url.encode(utf8.encode(jsonEncode(payload)));
    return '$header.$body.';
  }

  /// Refresh authentication using a stored refresh token.
  ///
  /// Used for biometric login to obtain a new session token.
  Future<String> refreshToken(String refreshToken) async {
    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      
      final data = response.data as Map<String, dynamic>;
      final token = data['token']?.toString() ?? data['accessToken']?.toString();
      if (token == null) throw const PinException('Missing token');
      
      return token;
    } on DioException catch (err) {
      final message = err.response?.data is Map && (err.response!.data as Map)['error'] != null
          ? (err.response!.data as Map)['error'].toString()
          : 'Session expired. Please sign in again.';
      throw PinException(message);
    } catch (e) {
      debugPrint('[PinService] Unexpected error refreshing token: $e');
      throw const PinException('Something went wrong. Please try again.');
    }
  }
}

/// Exception for invalid PIN attempts.
class PinException implements Exception {
  const PinException(this.message, {this.attemptsRemaining});
  final String message;
  final int? attemptsRemaining;
  @override
  String toString() => message;
}

/// Exception for rate-limit lockout.
class PinLockoutException implements Exception {
  const PinLockoutException(this.message, {required this.timeRemaining});
  final String message;
  final Duration timeRemaining;
  @override
  String toString() => message;
}
