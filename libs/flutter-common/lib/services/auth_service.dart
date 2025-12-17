/// Authentication Service
///
/// Manages authentication state, login/logout, and user session.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';
import '../api/api_exceptions.dart';
import 'token_manager.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// USER MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/// User information from authentication.
class User {
  const User({
    required this.id,
    required this.email,
    required this.tenantId,
    this.firstName,
    this.lastName,
    this.avatarUrl,
    this.roles = const [],
    this.permissions = const [],
    this.createdAt,
    this.lastLoginAt,
  });

  final String id;
  final String email;
  final String tenantId;
  final String? firstName;
  final String? lastName;
  final String? avatarUrl;
  final List<String> roles;
  final List<String> permissions;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;

  String get displayName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? email.split('@').first;
  }

  String get initials {
    if (firstName != null && lastName != null) {
      return '${firstName![0]}${lastName![0]}'.toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  bool hasRole(String role) => roles.contains(role);
  bool hasPermission(String permission) => permissions.contains(permission);

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      tenantId: json['tenantId'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      roles: (json['roles'] as List<dynamic>?)?.cast<String>() ?? [],
      permissions:
          (json['permissions'] as List<dynamic>?)?.cast<String>() ?? [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.parse(json['lastLoginAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'tenantId': tenantId,
        'firstName': firstName,
        'lastName': lastName,
        'avatarUrl': avatarUrl,
        'roles': roles,
        'permissions': permissions,
        'createdAt': createdAt?.toIso8601String(),
        'lastLoginAt': lastLoginAt?.toIso8601String(),
      };

  User copyWith({
    String? id,
    String? email,
    String? tenantId,
    String? firstName,
    String? lastName,
    String? avatarUrl,
    List<String>? roles,
    List<String>? permissions,
    DateTime? createdAt,
    DateTime? lastLoginAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      tenantId: tenantId ?? this.tenantId,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      roles: roles ?? this.roles,
      permissions: permissions ?? this.permissions,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════════════════════════════════════

/// Authentication state sealed class.
sealed class AuthState {
  const AuthState();
}

/// Unknown state - initial loading.
class AuthStateUnknown extends AuthState {
  const AuthStateUnknown();
}

/// Authenticated state with user.
class AuthStateAuthenticated extends AuthState {
  const AuthStateAuthenticated(this.user);
  final User user;
}

/// Unauthenticated state.
class AuthStateUnauthenticated extends AuthState {
  const AuthStateUnauthenticated([this.reason]);
  final String? reason;
}

/// Authentication error state.
class AuthStateError extends AuthState {
  const AuthStateError(this.error);
  final String error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/// Result of an authentication operation.
sealed class AuthResult {
  const AuthResult();
}

/// Successful authentication.
class AuthSuccess extends AuthResult {
  const AuthSuccess({
    required this.user,
    this.requiresVerification = false,
    this.requiresOnboarding = false,
  });

  final User user;
  final bool requiresVerification;
  final bool requiresOnboarding;
}

/// Authentication failure.
class AuthFailure extends AuthResult {
  const AuthFailure({
    required this.message,
    this.code,
    this.errors,
  });

  final String message;
  final String? code;
  final Map<String, List<String>>? errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Secure storage keys for user data.
abstract class UserStorageKeys {
  static const String userData = 'aivo_user_data';
  static const String lastLoginAt = 'aivo_last_login';
}

/// Authentication service managing login, logout, and session state.
class AuthService {
  AuthService({
    required AivoApiClient apiClient,
    TokenManager? tokenManager,
    FlutterSecureStorage? secureStorage,
  })  : _apiClient = apiClient,
        _tokenManager = tokenManager ?? TokenManager(),
        _secureStorage = secureStorage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions:
                  IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final AivoApiClient _apiClient;
  final TokenManager _tokenManager;
  final FlutterSecureStorage _secureStorage;

  final _authStateController = StreamController<AuthState>.broadcast();
  Stream<AuthState> get authStateStream => _authStateController.stream;

  AuthState _currentState = const AuthStateUnknown();
  AuthState get currentState => _currentState;

  User? _currentUser;
  User? get currentUser => _currentUser;

  /// Initialize auth service and check existing session.
  Future<void> initialize() async {
    try {
      final hasToken = await _tokenManager.hasValidToken();
      if (hasToken) {
        // Try to get cached user first
        final cachedUser = await _getCachedUser();
        if (cachedUser != null) {
          _currentUser = cachedUser;
          _updateState(AuthStateAuthenticated(cachedUser));
          // Refresh user in background
          _refreshUserInBackground();
          return;
        }

        // No cached user, fetch from API
        final user = await getCurrentUser();
        _currentUser = user;
        _updateState(AuthStateAuthenticated(user));
      } else {
        _updateState(const AuthStateUnauthenticated());
      }
    } catch (e) {
      _updateState(const AuthStateUnauthenticated());
    }
  }

  /// Login with email and password.
  Future<AuthResult> login({
    required String email,
    required String password,
    String? tenantId,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {
          'email': email,
          'password': password,
          if (tenantId != null) 'tenantId': tenantId,
        },
      );

      final data = response.data!;
      final tokens = TokenPair.fromJson(data['tokens'] as Map<String, dynamic>);
      await _tokenManager.saveTokens(tokens);

      final user = User.fromJson(data['user'] as Map<String, dynamic>);
      await _cacheUser(user);

      _currentUser = user;
      _updateState(AuthStateAuthenticated(user));

      // Set tenant ID on API client
      _apiClient.setTenantId(user.tenantId);

      return AuthSuccess(
        user: user,
        requiresVerification: data['requiresVerification'] == true,
        requiresOnboarding: data['requiresOnboarding'] == true,
      );
    } on ValidationException catch (e) {
      return AuthFailure(
        message: e.message,
        code: 'VALIDATION_ERROR',
        errors: e.errors,
      );
    } on UnauthorizedException {
      return const AuthFailure(
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      );
    } catch (e) {
      return AuthFailure(
        message: e.toString(),
        code: 'LOGIN_ERROR',
      );
    }
  }

  /// Register a new user.
  Future<AuthResult> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String tenantId,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.register,
        data: {
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          'tenantId': tenantId,
          ...?additionalData,
        },
      );

      final data = response.data!;
      final tokens = TokenPair.fromJson(data['tokens'] as Map<String, dynamic>);
      await _tokenManager.saveTokens(tokens);

      final user = User.fromJson(data['user'] as Map<String, dynamic>);
      await _cacheUser(user);

      _currentUser = user;
      _updateState(AuthStateAuthenticated(user));

      return AuthSuccess(
        user: user,
        requiresVerification: true,
        requiresOnboarding: true,
      );
    } on ValidationException catch (e) {
      return AuthFailure(
        message: e.message,
        code: 'VALIDATION_ERROR',
        errors: e.errors,
      );
    } catch (e) {
      return AuthFailure(
        message: e.toString(),
        code: 'REGISTER_ERROR',
      );
    }
  }

  /// Logout the current user.
  Future<void> logout() async {
    try {
      await _apiClient.post(ApiEndpoints.logout);
    } catch (_) {
      // Ignore logout errors - we'll clear local state anyway
    } finally {
      await _tokenManager.clearTokens();
      await _clearCachedUser();
      _currentUser = null;
      _updateState(const AuthStateUnauthenticated());
      _apiClient.setTenantId(null);
    }
  }

  /// Get current user from API.
  Future<User> getCurrentUser() async {
    final response = await _apiClient.get<Map<String, dynamic>>('/auth/me');
    final user = User.fromJson(response.data!);
    await _cacheUser(user);
    return user;
  }

  /// Request password reset email.
  Future<void> requestPasswordReset(String email) async {
    await _apiClient.post(
      ApiEndpoints.forgotPassword,
      data: {'email': email},
    );
  }

  /// Reset password with token.
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _apiClient.post(
      ApiEndpoints.resetPassword,
      data: {
        'token': token,
        'password': newPassword,
      },
    );
  }

  /// Change password for current user.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _apiClient.post(
      '/auth/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }

  /// Refresh the current user from API.
  Future<void> refreshUser() async {
    if (_currentState is! AuthStateAuthenticated) return;

    try {
      final user = await getCurrentUser();
      _currentUser = user;
      _updateState(AuthStateAuthenticated(user));
    } catch (e) {
      // If refresh fails due to auth error, logout
      if (e is UnauthorizedException) {
        await logout();
      }
    }
  }

  void _refreshUserInBackground() {
    Future.microtask(() async {
      try {
        final user = await getCurrentUser();
        _currentUser = user;
        _updateState(AuthStateAuthenticated(user));
      } catch (_) {
        // Ignore background refresh errors
      }
    });
  }

  Future<User?> _getCachedUser() async {
    final userData = await _secureStorage.read(key: UserStorageKeys.userData);
    if (userData == null) return null;

    try {
      final json = jsonDecode(userData) as Map<String, dynamic>;
      return User.fromJson(json);
    } catch (e) {
      return null;
    }
  }

  Future<void> _cacheUser(User user) async {
    await _secureStorage.write(
      key: UserStorageKeys.userData,
      value: jsonEncode(user.toJson()),
    );
  }

  Future<void> _clearCachedUser() async {
    await _secureStorage.delete(key: UserStorageKeys.userData);
  }

  void _updateState(AuthState state) {
    _currentState = state;
    _authStateController.add(state);
  }

  /// Dispose the service.
  void dispose() {
    _authStateController.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for AuthService.
final authServiceProvider = Provider<AuthService>((ref) {
  final service = AuthService(
    apiClient: AivoApiClient.instance,
  );

  ref.onDispose(() => service.dispose());

  return service;
});

/// Provider for current auth state.
final authStateProvider = StreamProvider<AuthState>((ref) {
  final service = ref.watch(authServiceProvider);
  return service.authStateStream;
});

/// Provider for current user.
final currentUserProvider = Provider<User?>((ref) {
  final service = ref.watch(authServiceProvider);
  return service.currentUser;
});

/// Provider for checking if user is authenticated.
final isAuthenticatedProvider = Provider<bool>((ref) {
  final service = ref.watch(authServiceProvider);
  return service.currentState is AuthStateAuthenticated;
});
