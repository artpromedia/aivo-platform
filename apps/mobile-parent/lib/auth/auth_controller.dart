import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_service.dart';
import 'auth_state.dart';
import 'token_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((_) => TokenStorage());
final authServiceProvider = Provider<AuthService>((_) => AuthService());
final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  final service = ref.read(authServiceProvider);
  final storage = ref.read(tokenStorageProvider);
  return AuthController(service, storage)..init();
});

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._service, this._storage) : super(AuthState.loading());

  final AuthService _service;
  final TokenStorage _storage;

  Future<void> init() async {
    final existing = await _storage.readTokens();
    if (existing == null) {
      state = AuthState.unauthenticated();
      return;
    }
    final decoded = AuthState.decode(existing.$1);
    if (decoded.userId.isEmpty || decoded.tenantId.isEmpty || decoded.isExpired) {
      await _storage.clear();
      state = AuthState.unauthenticated();
      return;
    }
    state = AuthState.authenticated(userId: decoded.userId, tenantId: decoded.tenantId, roles: decoded.roles);
  }

  Future<void> login(String email, String password, {String? locale}) async {
    state = AuthState.loading();
    try {
      final tokens = await _service.login(email, password, locale: locale);
      final decoded = AuthState.decode(tokens.accessToken);
      if (decoded.userId.isEmpty || decoded.tenantId.isEmpty || decoded.isExpired) {
        state = AuthState.error('Invalid token received');
        return;
      }
      await _storage.saveTokens(accessToken: tokens.accessToken, refreshToken: tokens.refreshToken);

      if (tokens.requiresVerification) {
        state = AuthState.emailUnverified(userId: decoded.userId, tenantId: decoded.tenantId);
        return;
      }

      state = AuthState.authenticated(userId: decoded.userId, tenantId: decoded.tenantId, roles: decoded.roles);
    } on AuthException catch (err) {
      state = AuthState.error(err.message);
    } catch (e) {
      debugPrint('[AuthController] Login error: $e');
      state = AuthState.error('Login failed');
    }
  }

  /// Authenticate via enterprise SSO (Clever, ClassLink, Google, Microsoft).
  ///
  /// This is called after the SSO flow completes and returns tokens.
  /// Addresses RE-AUDIT-003: Mobile Apps Still Lack Enterprise SSO
  Future<bool> loginWithSso({
    required String accessToken,
    required String refreshToken,
    required String provider,
  }) async {
    state = AuthState.loading();
    try {
      final decoded = AuthState.decode(accessToken);
      if (decoded.userId.isEmpty || decoded.tenantId.isEmpty || decoded.isExpired) {
        state = AuthState.error('Invalid SSO token received');
        return false;
      }

      // Verify the user has PARENT role
      if (!decoded.roles.contains('PARENT')) {
        state = AuthState.error('This SSO account is not a parent account');
        return false;
      }

      await _storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
      state = AuthState.authenticated(
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        roles: decoded.roles,
      );

      debugPrint('[AuthController] SSO login successful via $provider: ${decoded.userId}');
      return true;
    } catch (e) {
      debugPrint('[AuthController] SSO login error: $e');
      state = AuthState.error('SSO login failed');
      return false;
    }
  }

  /// Set authenticated state directly from SSO callback.
  ///
  /// Used when SSO tokens are already validated and stored by SsoService.
  void setAuthenticatedFromSso({
    required String userId,
    required String tenantId,
    required List<String> roles,
  }) {
    state = AuthState.authenticated(userId: userId, tenantId: tenantId, roles: roles);
    debugPrint('[AuthController] Authenticated via SSO: $userId');
  }

  /// Authenticate using biometrics with stored refresh token.
  ///
  /// Uses the refresh token stored during previous login to obtain
  /// new access tokens without requiring password entry.
  Future<bool> loginWithBiometrics({
    required String refreshToken,
  }) async {
    state = AuthState.loading();
    try {
      // Use the refresh token to get new access tokens
      // In production, this would call the auth service to refresh tokens
      // For now, we validate the stored refresh token format
      if (refreshToken.isEmpty) {
        state = AuthState.error('Invalid biometric credentials');
        return false;
      }

      // Attempt to get new tokens using refresh token
      // This simulates the token refresh flow
      final tokens = await _refreshTokens(refreshToken);
      if (tokens == null) {
        state = AuthState.error('Session expired. Please sign in again.');
        return false;
      }

      final decoded = AuthState.decode(tokens.$1);
      if (decoded.userId.isEmpty || decoded.tenantId.isEmpty || decoded.isExpired) {
        state = AuthState.error('Session expired. Please sign in again.');
        return false;
      }

      await _storage.saveTokens(accessToken: tokens.$1, refreshToken: tokens.$2);
      state = AuthState.authenticated(
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        roles: decoded.roles,
      );

      debugPrint('[AuthController] Biometric login successful: ${decoded.userId}');
      return true;
    } catch (e) {
      debugPrint('[AuthController] Biometric login error: $e');
      state = AuthState.error('Biometric login failed');
      return false;
    }
  }

  /// Refresh access tokens using a refresh token.
  Future<(String, String)?> _refreshTokens(String refreshToken) async {
    try {
      // In production, this would call the auth service refresh endpoint
      // For now, we check if refresh token is valid format
      if (refreshToken.contains('_refresh')) {
        // Mock token refresh - in production this calls the backend
        final existing = await _storage.readTokens();
        if (existing != null) {
          return existing;
        }
      }
      return null;
    } catch (e) {
      debugPrint('[AuthController] Token refresh error: $e');
      return null;
    }
  }

  Future<void> logout() async {
    await _storage.clear();
    state = AuthState.unauthenticated();
  }
}
