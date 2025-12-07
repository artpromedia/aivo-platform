import 'package:jwt_decode/jwt_decode.dart';

class PinAuthState {
  const PinAuthState._({required this.status, this.learnerId, this.tenantId, this.error});

  final PinStatus status;
  final String? learnerId;
  final String? tenantId;
  final String? error;

  factory PinAuthState.unauthenticated() => const PinAuthState._(status: PinStatus.unauthenticated);
  factory PinAuthState.loading() => const PinAuthState._(status: PinStatus.loading);
  factory PinAuthState.error(String message) => PinAuthState._(status: PinStatus.unauthenticated, error: message);
  factory PinAuthState.authenticated({required String learnerId, required String tenantId}) =>
      PinAuthState._(status: PinStatus.authenticated, learnerId: learnerId, tenantId: tenantId);

  bool get isAuthenticated => status == PinStatus.authenticated;

  static PinPayload decode(String jwt) => PinPayload.fromMap(Jwt.parseJwt(jwt));
}

enum PinStatus { unauthenticated, authenticated, loading }

class PinPayload {
  PinPayload({required this.learnerId, required this.tenantId, required this.isExpired});

  final String learnerId;
  final String tenantId;
  final bool isExpired;

  factory PinPayload.fromMap(Map<String, dynamic> map) {
    final learnerId = map['learner_id']?.toString() ?? '';
    final tenantId = map['tenant_id']?.toString() ?? '';
    final exp = map['exp'] is int ? map['exp'] as int : null;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final isExpired = exp != null && now >= exp;
    return PinPayload(learnerId: learnerId, tenantId: tenantId, isExpired: isExpired);
  }
}
