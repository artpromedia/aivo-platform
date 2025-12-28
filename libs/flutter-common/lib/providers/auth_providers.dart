/// Authentication Providers
///
/// Riverpod providers for authentication state management.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════════════════════════════════════

/// Authentication status.
enum AuthStatus {
  /// Initial loading state.
  loading,

  /// User is authenticated.
  authenticated,

  /// User is not authenticated.
  unauthenticated,

  /// Authentication error occurred.
  error,
}

/// Authentication state.
class AuthState {
  const AuthState({
    required this.status,
    this.userId,
    this.tenantId,
    this.email,
    this.roles = const [],
    this.error,
  });

  final AuthStatus status;
  final String? userId;
  final String? tenantId;
  final String? email;
  final List<String> roles;
  final String? error;

  /// Create loading state.
  const AuthState.loading()
      : this(status: AuthStatus.loading);

  /// Create authenticated state.
  const AuthState.authenticated({
    required String userId,
    required String tenantId,
    String? email,
    List<String> roles = const [],
  }) : this(
          status: AuthStatus.authenticated,
          userId: userId,
          tenantId: tenantId,
          email: email,
          roles: roles,
        );

  /// Create unauthenticated state.
  const AuthState.unauthenticated()
      : this(status: AuthStatus.unauthenticated);

  /// Create error state.
  const AuthState.error(String error)
      : this(status: AuthStatus.error, error: error);

  /// Whether the user is authenticated.
  bool get isAuthenticated => status == AuthStatus.authenticated;

  /// Whether the state is loading.
  bool get isLoading => status == AuthStatus.loading;

  /// Check if user has a specific role.
  bool hasRole(String role) => roles.contains(role);

  /// Check if user has any of the specified roles.
  bool hasAnyRole(List<String> checkRoles) {
    return checkRoles.any((role) => roles.contains(role));
  }

  @override
  String toString() {
    return 'AuthState(status: $status, userId: $userId, tenantId: $tenantId, roles: $roles)';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// JWT DECODER
// ═══════════════════════════════════════════════════════════════════════════════

/// Decoded JWT claims.
class JwtClaims {
  const JwtClaims({
    required this.sub,
    required this.tenantId,
    required this.roles,
    required this.exp,
    this.email,
  });

  final String sub;
  final String tenantId;
  final List<String> roles;
  final DateTime exp;
  final String? email;

  /// Whether the token is expired.
  bool get isExpired => DateTime.now().isAfter(exp);

  /// Decode a JWT token.
  factory JwtClaims.decode(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        throw const FormatException('Invalid JWT format');
      }

      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final claims = jsonDecode(decoded) as Map<String, dynamic>;

      return JwtClaims(
        sub: claims['sub']?.toString() ?? '',
        tenantId: claims['tenant_id']?.toString() ?? '',
        roles: (claims['roles'] as List?)?.cast<String>() ?? [],
        exp: DateTime.fromMillisecondsSinceEpoch(
          ((claims['exp'] as num?) ?? 0).toInt() * 1000,
        ),
        email: claims['email']?.toString(),
      );
    } catch (e) {
      assert(() {
        debugPrint('[JwtClaims] Failed to decode token: $e');
        return true;
      }());
      return JwtClaims(
        sub: '',
        tenantId: '',
        roles: const [],
        exp: DateTime(1970),
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH NOTIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/// Authentication state notifier.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._apiClient) : super(const AuthState.loading());

  final AivoApiClient _apiClient;

  /// Initialize auth state from stored tokens.
  Future<void> initialize() async {
    try {
      final accessToken = await _apiClient.getAccessToken();
      if (accessToken == null) {
        state = const AuthState.unauthenticated();
        return;
      }

      final claims = JwtClaims.decode(accessToken);
      if (claims.sub.isEmpty || claims.isExpired) {
        await _apiClient.clearTokens();
        state = const AuthState.unauthenticated();
        return;
      }

      _apiClient.setTenantId(claims.tenantId);
      state = AuthState.authenticated(
        userId: claims.sub,
        tenantId: claims.tenantId,
        email: claims.email,
        roles: claims.roles,
      );
    } catch (_) {
      state = const AuthState.unauthenticated();
    }
  }

  /// Login with email and password.
  Future<void> login(String email, String password) async {
    state = const AuthState.loading();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );

      final data = response.data as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final refreshToken = data?['refreshToken'] as String?;

      if (accessToken == null || refreshToken == null) {
        state = const AuthState.error('Invalid response from server');
        return;
      }

      final claims = JwtClaims.decode(accessToken);
      if (claims.sub.isEmpty) {
        state = const AuthState.error('Invalid token received');
        return;
      }

      await _apiClient.setTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      _apiClient.setTenantId(claims.tenantId);

      state = AuthState.authenticated(
        userId: claims.sub,
        tenantId: claims.tenantId,
        email: claims.email,
        roles: claims.roles,
      );
    } catch (e) {
      final apiError = extractApiException(e);
      state = AuthState.error(apiError?.message ?? 'Login failed');
    }
  }

  /// Register a new account.
  Future<void> register({
    required String email,
    required String password,
    required String name,
    String? tenantSlug,
  }) async {
    state = const AuthState.loading();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.register,
        data: {
          'email': email,
          'password': password,
          'name': name,
          if (tenantSlug != null) 'tenantSlug': tenantSlug,
        },
      );

      final data = response.data as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final refreshToken = data?['refreshToken'] as String?;

      if (accessToken == null || refreshToken == null) {
        state = const AuthState.error('Invalid response from server');
        return;
      }

      final claims = JwtClaims.decode(accessToken);
      await _apiClient.setTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      _apiClient.setTenantId(claims.tenantId);

      state = AuthState.authenticated(
        userId: claims.sub,
        tenantId: claims.tenantId,
        email: claims.email,
        roles: claims.roles,
      );
    } catch (e) {
      final apiError = extractApiException(e);
      state = AuthState.error(apiError?.message ?? 'Registration failed');
    }
  }

  /// Request password reset.
  Future<bool> forgotPassword(String email) async {
    try {
      await _apiClient.post(
        ApiEndpoints.forgotPassword,
        data: {'email': email},
      );
      return true;
    } catch (e) {
      debugPrint('[AuthNotifier] Password reset failed for $email: $e');
      return false;
    }
  }

  /// Logout.
  Future<void> logout() async {
    try {
      await _apiClient.post(ApiEndpoints.logout);
    } catch (e) {
      // Ignore logout errors but log in debug mode
      assert(() {
        debugPrint('[AuthNotifier] Logout call failed: $e');
        return true;
      }());
    } finally {
      await _apiClient.clearTokens();
      state = const AuthState.unauthenticated();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for the auth notifier.
final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiClient = AivoApiClient.instance;
  final notifier = AuthNotifier(apiClient);
  // Initialize on creation
  notifier.initialize();
  return notifier;
});

/// Provider for checking if user is authenticated.
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authNotifierProvider).isAuthenticated;
});

/// Provider for current user ID.
final currentUserIdProvider = Provider<String?>((ref) {
  return ref.watch(authNotifierProvider).userId;
});

/// Provider for current tenant ID.
final currentTenantIdProvider = Provider<String?>((ref) {
  return ref.watch(authNotifierProvider).tenantId;
});

/// Provider for current user roles.
final currentUserRolesProvider = Provider<List<String>>((ref) {
  return ref.watch(authNotifierProvider).roles;
});
