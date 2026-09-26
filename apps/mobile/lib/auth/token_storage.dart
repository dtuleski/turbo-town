import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/constants.dart';

/// Persists Cognito tokens in the platform secure store
/// (Keychain on iOS, EncryptedSharedPreferences on Android).
class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final FlutterSecureStorage _storage;

  Future<void> saveSession({
    required String idToken,
    required String accessToken,
    String? refreshToken,
    String? email,
    String? username,
  }) async {
    await Future.wait([
      _storage.write(key: StorageKeys.idToken, value: idToken),
      _storage.write(key: StorageKeys.accessToken, value: accessToken),
      if (refreshToken != null)
        _storage.write(key: StorageKeys.refreshToken, value: refreshToken),
      if (email != null) _storage.write(key: StorageKeys.userEmail, value: email),
      if (username != null)
        _storage.write(key: StorageKeys.username, value: username),
    ]);
  }

  Future<String?> get idToken => _storage.read(key: StorageKeys.idToken);
  Future<String?> get accessToken => _storage.read(key: StorageKeys.accessToken);
  Future<String?> get refreshToken => _storage.read(key: StorageKeys.refreshToken);
  Future<String?> get email => _storage.read(key: StorageKeys.userEmail);
  Future<String?> get username => _storage.read(key: StorageKeys.username);

  Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: StorageKeys.idToken),
      _storage.delete(key: StorageKeys.accessToken),
      _storage.delete(key: StorageKeys.refreshToken),
      _storage.delete(key: StorageKeys.userEmail),
      _storage.delete(key: StorageKeys.username),
    ]);
  }
}
