import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String baseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:4004',
);

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  dio.interceptors.add(AuthInterceptor(ref));
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    error: true,
  ));

  return dio;
});

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

class AuthInterceptor extends Interceptor {
  final Ref ref;
  
  AuthInterceptor(this.ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final storage = ref.read(secureStorageProvider);
    final token = await storage.read(key: 'access_token');
    
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final storage = ref.read(secureStorageProvider);
      final refreshToken = await storage.read(key: 'refresh_token');
      
      if (refreshToken != null) {
        try {
          final dio = Dio(BaseOptions(baseUrl: baseUrl));
          final response = await dio.post('/auth/refresh', data: {
            'refreshToken': refreshToken,
          });
          
          final newAccessToken = response.data['accessToken'];
          await storage.write(key: 'access_token', value: newAccessToken);
          
          // Retry the original request
          final opts = err.requestOptions;
          opts.headers['Authorization'] = 'Bearer $newAccessToken';
          
          final retryResponse = await Dio().fetch(opts);
          return handler.resolve(retryResponse);
        } catch (e) {
          // Refresh failed, clear tokens
          await storage.delete(key: 'access_token');
          await storage.delete(key: 'refresh_token');
        }
      }
    }
    
    handler.next(err);
  }
}
