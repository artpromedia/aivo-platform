import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/environment.dart';

/// Auth service for handling authentication with the backend.
///
/// Uses [EnvironmentConfig] for configuration. Mock mode is only available
/// in development builds with explicit opt-in.
class AuthService {
  AuthService() : _dio = Dio(BaseOptions(baseUrl: EnvironmentConfig.authBaseUrl));

  final Dio _dio;

  /// Authenticates the user with email and password.
  ///
  /// Returns [AuthTokens] containing access and refresh tokens from the server.
  /// Throws [AuthException] if authentication fails.
  /// 
  /// If [locale] is provided, it is sent to the backend so that any
  /// verification emails are generated in the user's preferred language.
  Future<AuthTokens> login(String email, String password, {String? locale}) async {
    // Mock mode only available in development with explicit opt-in
    if (EnvironmentConfig.useAuthMock) {
      debugPrint('⚠️ [AuthService] Using mock authentication - development only');
      return _mockTokens(email: email);
    }

    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
        if (locale != null) 'locale': locale,
      });

      final data = response.data as Map<String, dynamic>;
      final access = data['accessToken']?.toString();
      final refresh = data['refreshToken']?.toString();
      if (access == null || refresh == null) {
        throw const AuthException('Missing tokens in response');
      }
      return AuthTokens(
        accessToken: access,
        refreshToken: refresh,
        requiresVerification: data['requiresVerification'] == true,
      );
    } on DioException catch (err) {
      final data = err.response?.data;
      final errorCode = data is Map ? data['error']?.toString() : null;

      // Handle email-not-verified: return tokens-like result so the
      // controller can enter the emailUnverified state instead of error.
      if (err.response?.statusCode == 403 && errorCode == 'EMAIL_NOT_VERIFIED') {
        final email = data is Map ? data['email']?.toString() : null;
        throw EmailNotVerifiedException(email: email ?? '');
      }

      final message = errorCode ?? 'Login failed';
      throw AuthException(message);
    } catch (e) {
      debugPrint('[AuthService] Login error: $e');
      throw const AuthException('Login failed');
    }
  }

  /// Creates mock tokens for development testing only.
  ///
  /// This method is only callable when [EnvironmentConfig.useAuthMock] is true,
  /// which requires debug mode + development environment + explicit opt-in.
  AuthTokens _mockTokens({required String email}) {
    // Defense in depth: verify mock mode is actually enabled
    assert(EnvironmentConfig.useAuthMock, 'Mock tokens should only be created in mock mode');
    
    if (!kDebugMode) {
      throw const AuthException('Mock authentication is not available in release builds');
    }

    final payload = {
      'sub': email,
      'tenant_id': 'mock-tenant',
      'roles': ['PARENT'],
      'exp': DateTime.now().add(const Duration(hours: 8)).millisecondsSinceEpoch ~/ 1000,
      'mock': true, // Flag to identify mock tokens
    };
    final token = _encodeMockJwt(payload);
    return AuthTokens(accessToken: token, refreshToken: '${token}_refresh');
  }

  String _encodeMockJwt(Map<String, dynamic> payload) {
    // Note: This creates a non-cryptographic JWT for development only.
    // Real tokens come from the authentication server.
    final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'none', 'typ': 'JWT'})));
    final body = base64Url.encode(utf8.encode(jsonEncode(payload)));
    return '$header.$body.';
  }
}

class AuthTokens {
  AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    this.requiresVerification = false,
  });
  final String accessToken;
  final String refreshToken;
  final bool requiresVerification;
}

/// Thrown when user attempts login but email is not yet verified.
class EmailNotVerifiedException implements Exception {
  EmailNotVerifiedException({required this.email});
  final String email;
  @override
  String toString() => 'EmailNotVerifiedException(email: $email)';
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
