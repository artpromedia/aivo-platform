import 'package:jwt_decode/jwt_decode.dart';

class AuthState {
  const AuthState._({
    required this.status,
    this.userId,
    this.tenantId,
    this.roles = const [],
    this.error,
  });

  final AuthStatus status;
  final String? userId;
  final String? tenantId;
  final List<String> roles;
  final String? error;

  factory AuthState.unauthenticated() => const AuthState._(status: AuthStatus.unauthenticated);
  factory AuthState.loading() => const AuthState._(status: AuthStatus.loading);
  factory AuthState.error(String message) => AuthState._(status: AuthStatus.unauthenticated, error: message);
  factory AuthState.authenticated({
    required String userId,
    required String tenantId,
    required List<String> roles,
  }) => AuthState._(status: AuthStatus.authenticated, userId: userId, tenantId: tenantId, roles: roles);

  bool get isAuthenticated => status == AuthStatus.authenticated;

  static DecodedPayload decode(String jwt) => DecodedPayload.fromMap(Jwt.parseJwt(jwt));
}

enum AuthStatus { unauthenticated, authenticated, loading }

class DecodedPayload {
  DecodedPayload({
    required this.userId,
    required this.tenantId,
    required this.roles,
    required this.isExpired,
  });

  final String userId;
  final String tenantId;
  final List<String> roles;
  final bool isExpired;

  factory DecodedPayload.fromMap(Map<String, dynamic> map) {
    final roles = (map['roles'] as List?)?.whereType<String>().toList() ?? <String>[];
    final userId = map['sub']?.toString() ?? '';
    final tenantId = map['tenant_id']?.toString() ?? '';
    final exp = map['exp'] is int ? map['exp'] as int : null;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final isExpired = exp != null && now >= exp;
    return DecodedPayload(userId: userId, tenantId: tenantId, roles: roles, isExpired: isExpired);
  }
}
