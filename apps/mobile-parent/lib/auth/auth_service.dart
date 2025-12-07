import 'dart:convert';

import 'package:dio/dio.dart';

const _baseUrl = String.fromEnvironment('AUTH_BASE_URL', defaultValue: 'http://localhost:4001');
const _useAuthMock = bool.fromEnvironment('USE_AUTH_MOCK');

class AuthService {
  AuthService() : _dio = Dio(BaseOptions(baseUrl: _baseUrl));

  final Dio _dio;

  Future<AuthTokens> login(String email, String password) async {
    if (_useAuthMock) {
      return _mockTokens(email: email);
    }

    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final data = response.data as Map<String, dynamic>;
      final access = data['accessToken']?.toString();
      final refresh = data['refreshToken']?.toString();
      if (access == null || refresh == null) {
        throw const AuthException('Missing tokens in response');
      }
      return AuthTokens(accessToken: access, refreshToken: refresh);
    } on DioException catch (err) {
      final message = err.response?.data is Map && (err.response!.data as Map)['error'] != null
          ? (err.response!.data as Map)['error'].toString()
          : 'Login failed';
      throw AuthException(message);
    } catch (_) {
      throw const AuthException('Login failed');
    }
  }

  AuthTokens _mockTokens({required String email}) {
    final payload = {
      'sub': email,
      'tenant_id': 'mock-tenant',
      'roles': ['PARENT'],
      'exp': DateTime.now().add(const Duration(hours: 8)).millisecondsSinceEpoch ~/ 1000,
    };
    final token = _encodeMockJwt(payload);
    return AuthTokens(accessToken: token, refreshToken: '${token}_refresh');
  }

  String _encodeMockJwt(Map<String, dynamic> payload) {
    final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'none', 'typ': 'JWT'})));
    final body = base64Url.encode(utf8.encode(jsonEncode(payload)));
    return '$header.$body.';
  }
}

class AuthTokens {
  AuthTokens({required this.accessToken, required this.refreshToken});
  final String accessToken;
  final String refreshToken;
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
