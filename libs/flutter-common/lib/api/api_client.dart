/// API Client
///
/// Configured Dio client with all interceptors for Aivo API.
library;

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_config.dart';
import 'api_exceptions.dart';
import 'api_interceptors.dart';

/// Singleton API client for Aivo services.
class AivoApiClient {
  AivoApiClient._internal();

  static final AivoApiClient instance = AivoApiClient._internal();

  late final Dio _dio;
  late final FlutterSecureStorage _storage;
  late final ApiConfig _config;

  String? _currentTenantId;
  bool _initialized = false;

  /// Initialize the API client.
  void initialize({
    ApiConfig? config,
    FlutterSecureStorage? storage,
    void Function(bool)? onAuthStateChanged,
  }) {
    if (_initialized) return;

    _config = config ?? ApiConfig.fromEnvironment();
    _storage = storage ??
        const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
        );

    _dio = Dio(BaseOptions(
      baseUrl: _config.gatewayUrl,
      connectTimeout: _config.connectTimeout,
      receiveTimeout: _config.receiveTimeout,
      sendTimeout: _config.sendTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors in order
    _dio.interceptors.addAll([
      CorrelationIdInterceptor(),
      TenantInterceptor(getTenantId: () => _currentTenantId),
      AuthInterceptor(
        dio: _dio,
        storage: _storage,
        refreshEndpoint: ApiEndpoints.refreshToken,
        onAuthStateChanged: onAuthStateChanged,
      ),
      RetryInterceptor(dio: _dio),
      ErrorTransformerInterceptor(),
    ]);

    _initialized = true;
  }

  /// Get the underlying Dio instance (for advanced use).
  Dio get dio {
    _ensureInitialized();
    return _dio;
  }

  /// Set the current tenant ID.
  void setTenantId(String? tenantId) {
    _currentTenantId = tenantId;
  }

  /// Get the current tenant ID.
  String? get tenantId => _currentTenantId;

  /// Store authentication tokens.
  Future<void> setTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _ensureInitialized();
    await Future.wait([
      _storage.write(key: TokenStorageKeys.accessToken, value: accessToken),
      _storage.write(key: TokenStorageKeys.refreshToken, value: refreshToken),
    ]);
  }

  /// Clear authentication tokens.
  Future<void> clearTokens() async {
    _ensureInitialized();
    await Future.wait([
      _storage.delete(key: TokenStorageKeys.accessToken),
      _storage.delete(key: TokenStorageKeys.refreshToken),
    ]);
    _currentTenantId = null;
  }

  /// Check if user has valid tokens.
  Future<bool> hasValidTokens() async {
    _ensureInitialized();
    final accessToken = await _storage.read(key: TokenStorageKeys.accessToken);
    return accessToken != null;
  }

  /// Get the current access token.
  Future<String?> getAccessToken() async {
    _ensureInitialized();
    return _storage.read(key: TokenStorageKeys.accessToken);
  }

  void _ensureInitialized() {
    if (!_initialized) {
      throw StateError('AivoApiClient not initialized. Call initialize() first.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET request.
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    _ensureInitialized();
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// POST request.
  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    _ensureInitialized();
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// PUT request.
  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    _ensureInitialized();
    return _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// PATCH request.
  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    _ensureInitialized();
    return _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  /// DELETE request.
  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    _ensureInitialized();
    return _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }
}

/// Extract typed API exception from Dio error.
ApiException? extractApiException(Object? error) {
  if (error is ApiException) return error;
  if (error is DioException && error.error is ApiException) {
    return error.error as ApiException;
  }
  return null;
}
