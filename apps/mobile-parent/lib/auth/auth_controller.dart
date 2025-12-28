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

  Future<void> logout() async {
    await _storage.clear();
    state = AuthState.unauthenticated();
  }
}
