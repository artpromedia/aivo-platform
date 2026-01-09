import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'pin_service.dart';
import 'pin_state.dart';
import 'pin_storage.dart';

final pinStorageProvider = Provider<PinTokenStorage>((_) => PinTokenStorage());
final pinServiceProvider = Provider<PinService>((_) => PinService());
final pinControllerProvider = StateNotifierProvider<PinController, PinAuthState>((ref) {
  final service = ref.read(pinServiceProvider);
  final storage = ref.read(pinStorageProvider);
  return PinController(service, storage)..init();
});

class PinController extends StateNotifier<PinAuthState> {
  PinController(this._service, this._storage) : super(PinAuthState.loading());

  final PinService _service;
  final PinTokenStorage _storage;

  Future<void> init() async {
    final token = await _storage.read();
    if (token == null) {
      state = PinAuthState.unauthenticated();
      return;
    }
    final decoded = PinAuthState.decode(token);
    if (decoded.learnerId.isEmpty || decoded.isExpired) {
      await _storage.clear();
      state = PinAuthState.unauthenticated();
      return;
    }
    state = PinAuthState.authenticated(learnerId: decoded.learnerId, tenantId: decoded.tenantId);
  }

  Future<void> validatePin(String pin) async {
    state = PinAuthState.loading();
    try {
      final token = await _service.validatePin(pin);
      final decoded = PinAuthState.decode(token);
      if (decoded.learnerId.isEmpty || decoded.isExpired) {
        state = PinAuthState.error('Invalid session token');
        return;
      }
      await _storage.save(token);
      state = PinAuthState.authenticated(learnerId: decoded.learnerId, tenantId: decoded.tenantId);
    } on PinException catch (err) {
      state = PinAuthState.error(err.message);
    } catch (e) {
      debugPrint('[PinController] Unexpected error validating PIN: $e');
      state = PinAuthState.error('Invalid PIN');
    }
  }

  Future<void> logout() async {
    await _storage.clear();
    state = PinAuthState.unauthenticated();
  }

  /// Set authenticated state from SSO login.
  ///
  /// This is called when the user authenticates via enterprise SSO
  /// (Clever, ClassLink, Google, Microsoft) instead of PIN.
  ///
  /// Addresses RE-AUDIT-003: Mobile Apps Still Lack Enterprise SSO
  void setAuthenticatedFromSso({
    required String userId,
    required String tenantId,
  }) {
    // For SSO, we use the user ID as the learner ID
    // The SSO token is stored separately by SsoService
    state = PinAuthState.authenticated(
      learnerId: userId,
      tenantId: tenantId,
    );
    debugPrint('[PinController] Authenticated via SSO: $userId @ $tenantId');
  }
}
