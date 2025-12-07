import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PinTokenStorage {
  PinTokenStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
        );

  final FlutterSecureStorage _storage;

  static const _sessionKey = 'learner_session_token';

  Future<void> save(String token) async {
    await _storage.write(key: _sessionKey, value: token);
  }

  Future<String?> read() async => _storage.read(key: _sessionKey);

  Future<void> clear() async => _storage.delete(key: _sessionKey);
}
