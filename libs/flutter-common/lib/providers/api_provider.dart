/// API Provider
///
/// Riverpod provider for the API client instance.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api.dart';

/// Provider for secure storage.
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
});

/// Provider for API configuration.
final apiConfigProvider = Provider<ApiConfig>((ref) {
  return ApiConfig.fromEnvironment();
});

/// Provider for the API client.
final apiClientProvider = Provider<AivoApiClient>((ref) {
  return AivoApiClient.instance;
});

/// Initialize the API client.
///
/// Call this during app bootstrap before using other providers.
void initializeApiClient(ProviderContainer container) {
  final config = container.read(apiConfigProvider);
  final storage = container.read(secureStorageProvider);

  AivoApiClient.instance.initialize(
    config: config,
    storage: storage,
    onAuthStateChanged: (isAuthenticated) {
      // This will be handled by auth providers
    },
  );
}
