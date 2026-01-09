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

  Future<void> login(String email, String password) async {
    state = AuthState.loading();
    try {
      final tokens = await _service.login(email, password);
      final decoded = AuthState.decode(tokens.accessToken);
      if (decoded.userId.isEmpty || decoded.tenantId.isEmpty || decoded.isExpired) {
        state = AuthState.error('Invalid token received');
        return;
      }
      await _storage.saveTokens(accessToken: tokens.accessToken, refreshToken: tokens.refreshToken);
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

  Future<void> logout() async {
    await _storage.clear();
    state = AuthState.unauthenticated();
  }
}
