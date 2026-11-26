import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Stores the JWT session token in the platform keystore (Android Keystore /
/// iOS Keychain) instead of plain SharedPreferences.
///
/// Tokens written by older app versions into SharedPreferences are migrated on
/// first read and the plaintext copy is removed. On platforms where the secure
/// storage plugin is unavailable (tests, some desktop targets) the store falls
/// back to SharedPreferences so authentication keeps working.
class TokenStore {
  static const String _tokenKey = 'geters_jwt_token';

  final FlutterSecureStorage _secureStorage;

  TokenStore({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  Future<String?> readToken() async {
    try {
      final secure = await _secureStorage.read(key: _tokenKey);
      if (secure != null && secure.isNotEmpty) return secure;
    } catch (_) {
      // Fall through to the legacy location.
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final legacy = prefs.getString(_tokenKey);
      if (legacy != null && legacy.isNotEmpty) {
        await writeToken(legacy);
        await prefs.remove(_tokenKey);
        return legacy;
      }
    } catch (_) {
      // Ignore storage failures.
    }

    return null;
  }

  Future<void> writeToken(String token) async {
    var storedSecurely = false;
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
      storedSecurely = true;
    } catch (_) {
      storedSecurely = false;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      if (storedSecurely) {
        if (prefs.containsKey(_tokenKey)) await prefs.remove(_tokenKey);
      } else {
        await prefs.setString(_tokenKey, token);
      }
    } catch (_) {
      // Ignore storage failures.
    }
  }

  Future<void> clear() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
    } catch (_) {
      // Ignore storage failures.
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey(_tokenKey)) await prefs.remove(_tokenKey);
    } catch (_) {
      // Ignore storage failures.
    }
  }
}
