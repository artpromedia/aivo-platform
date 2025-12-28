import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

const _baseUrl = String.fromEnvironment('AUTH_BASE_URL', defaultValue: 'http://localhost:4001');
const _useAuthMock = bool.fromEnvironment('USE_AUTH_MOCK');

class PinService {
  PinService() : _dio = Dio(BaseOptions(baseUrl: _baseUrl));

  final Dio _dio;

  Future<String> validatePin(String pin) async {
    if (_useAuthMock) {
      return _mockToken(pin);
    }

    try {
      final response = await _dio.post('/auth/pin-login', data: {'pin': pin});
      final data = response.data as Map<String, dynamic>;
      final token = data['token']?.toString();
      if (token == null) throw const PinException('Missing token');
      return token;
    } on DioException catch (err) {
      final message = err.response?.data is Map && (err.response!.data as Map)['error'] != null
          ? (err.response!.data as Map)['error'].toString()
          : 'Invalid PIN';
      throw PinException(message);
    } catch (e) {
      debugPrint('[PinService] Unexpected error validating PIN: $e');
      throw const PinException('Invalid PIN');
    }
  }

  String _mockToken(String pin) {
    final payload = {
      'learner_id': 'learner-$pin',
      'tenant_id': 'mock-tenant',
      'exp': DateTime.now().add(const Duration(hours: 4)).millisecondsSinceEpoch ~/ 1000,
    };
    return _encodeMockJwt(payload);
  }

  String _encodeMockJwt(Map<String, dynamic> payload) {
    final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'none', 'typ': 'JWT'})));
    final body = base64Url.encode(utf8.encode(jsonEncode(payload)));
    return '$header.$body.';
  }
}

class PinException implements Exception {
  const PinException(this.message);
  final String message;
  @override
  String toString() => message;
}
