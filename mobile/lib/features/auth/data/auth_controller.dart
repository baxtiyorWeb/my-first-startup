import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/cache/local_cache_store.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/token_store.dart';
import '../../feed/models/author.dart';
import '../../profile/models/user_profile.dart';

class AuthController extends ChangeNotifier {
  static const String _lastUserIdKey = 'geters_last_user_id';

  final ApiClient _apiClient;
  final LocalCacheStore _cacheStore;
  final TokenStore _tokenStore;
  bool _isAuthenticated;
  bool _isRestoringSession = false;
  bool _isBusy = false;
  String? _errorMessage;
  String _locale = 'uz';

  UserProfile _currentUser = _guestProfile();

  static UserProfile _guestProfile() => UserProfile(
        id: 'guest',
        name: 'Foydalanuvchi',
        handle: 'user',
        role: 'Go-getter',
        bio: '',
        verified: false,
        intent: 'none',
        joinedDate: DateTime(2026, 1, 1),
        postsCount: 0,
        discussionsCount: 0,
        followersCount: 0,
        followingCount: 0,
      );

  AuthController({
    ApiClient? apiClient,
    LocalCacheStore? cacheStore,
    TokenStore? tokenStore,
    bool initialAuthenticated = false,
  })  : _apiClient = apiClient ?? ApiClient(),
        _cacheStore = cacheStore ?? LocalCacheStore(),
        _tokenStore = tokenStore ?? TokenStore(),
        _isAuthenticated = initialAuthenticated {
    _apiClient.onUnauthorized = _handleUnauthorized;
  }

  ApiClient get apiClient => _apiClient;
  LocalCacheStore get cacheStore => _cacheStore;
  String? get authToken => _apiClient.authToken;
  bool get isAuthenticated => _isAuthenticated;
  bool get isRestoringSession => _isRestoringSession;
  bool get isBusy => _isBusy;
  String? get errorMessage => _errorMessage;
  String get locale => _locale;
  UserProfile get currentUser => _currentUser;

  Author get currentAuthor => Author(
        id: _currentUser.id,
        name: _currentUser.name,
        handle: _currentUser.handle,
        role: _currentUser.role,
        avatarUrl: _currentUser.avatarUrl,
        verified: _currentUser.verified,
        intent: _currentUser.intent,
      );

  Future<void> _persistSessionMeta(String? token, String? userId) async {
    // The JWT itself lives in the platform keystore; only the non-secret user id
    // is kept in SharedPreferences for cache scoping.
    if (token == null || token.isEmpty) {
      await _tokenStore.clear();
    } else {
      await _tokenStore.writeToken(token);
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      if (userId != null && userId.isNotEmpty) {
        await prefs.setString(_lastUserIdKey, userId);
      } else {
        await prefs.remove(_lastUserIdKey);
      }
    } catch (_) {}
  }

  Future<({String? token, String? userId})> _readStoredMeta() async {
    final token = await _tokenStore.readToken();
    try {
      final prefs = await SharedPreferences.getInstance();
      return (token: token, userId: prefs.getString(_lastUserIdKey));
    } catch (_) {
      return (token: token, userId: null);
    }
  }

  Future<void> _cacheUserProfile(UserProfile profile) async {
    _cacheStore.setUserScope(profile.id);
    await _cacheStore.writeJson(
      'auth_profile',
      {
        'id': profile.id,
        'name': profile.name,
        'handle': profile.handle,
        'role': profile.role,
        'bio': profile.bio,
        'avatarUrl': profile.avatarUrl,
        'coverPhotoUrl': profile.coverPhotoUrl,
        'location': profile.location,
        'website': profile.website,
        'verified': profile.verified,
        'intent': profile.intent,
        'createdAt': profile.joinedDate.toIso8601String(),
        'postsCount': profile.postsCount,
        'discussionsCount': profile.discussionsCount,
        'followersCount': profile.followersCount,
        'followingCount': profile.followingCount,
        'isPrivate': profile.isPrivate,
        'dmPermission': profile.dmPermission,
        'showOnlineStatus': profile.showOnlineStatus,
        'twoFactorEnabled': profile.twoFactorEnabled,
      },
      ttl: const Duration(hours: 24),
    );
  }

  void _handleUnauthorized() {
    final prevUserId = _currentUser.id;
    _apiClient.setAuthToken(null);
    _persistSessionMeta(null, null);
    _cacheStore.clearUserScope(prevUserId);
    _cacheStore.setUserScope('guest');
    _currentUser = _guestProfile();
    _isAuthenticated = false;
    notifyListeners();
  }

  void setLocale(String locale) {
    if (_locale == locale) return;
    _locale = locale;
    notifyListeners();
  }

  Future<bool> restoreSession() async {
    _isRestoringSession = true;
    notifyListeners();

    try {
      final stored = await _readStoredMeta();
      final token = _apiClient.authToken ?? stored.token;
      if (token != null && token.isNotEmpty) {
        _apiClient.setAuthToken(token);
      }

      if (_apiClient.authToken == null || _apiClient.authToken!.isEmpty) {
        _isAuthenticated = false;
        return false;
      }

      if (stored.userId != null && stored.userId!.isNotEmpty) {
        _cacheStore.setUserScope(stored.userId);
        final cached = await _cacheStore.readJson('auth_profile', allowStale: true);
        if (cached != null && cached.data is Map<String, dynamic>) {
          _currentUser = UserProfile.fromJson(cached.data as Map<String, dynamic>);
          _isAuthenticated = true;
          notifyListeners();
        }
      }

      final decoded = await _apiClient.get(ApiConstants.authSessionEndpoint);
      final data = decoded['data'] as Map<String, dynamic>? ?? const {};
      final isAuth = data['isAuthenticated'] as bool? ?? false;
      if (isAuth && data['user'] is Map<String, dynamic>) {
        _currentUser = UserProfile.fromJson(data['user'] as Map<String, dynamic>);
        _isAuthenticated = true;
        await _persistSessionMeta(_apiClient.authToken, _currentUser.id);
        await _cacheUserProfile(_currentUser);
        return true;
      }

      await _persistSessionMeta(null, null);
      _apiClient.setAuthToken(null);
      _isAuthenticated = false;
      return false;
    } catch (e) {
      if (isConnectivityFailure(e) && _isAuthenticated) {
        return true;
      }
      return false;
    } finally {
      _isRestoringSession = false;
      notifyListeners();
    }
  }

  Future<bool> loginWithGoogleIdToken(
    String idToken, {
    String platform = 'android',
  }) async {
    _isBusy = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final decoded = await _apiClient.post(
        ApiConstants.authGoogleVerifyEndpoint,
        body: {
          'idToken': idToken,
          'platform': platform,
        },
      );
      final data = decoded['data'] as Map<String, dynamic>? ?? const {};
      final token = data['token'] as String?;
      if (token == null || token.isEmpty) {
        throw const ApiException('Server autentifikatsiya tokenini qaytarmadi');
      }
      _apiClient.setAuthToken(token);
      if (data['user'] is Map<String, dynamic>) {
        _currentUser = UserProfile.fromJson(data['user'] as Map<String, dynamic>);
        await _cacheUserProfile(_currentUser);
      }
      await _persistSessionMeta(token, _currentUser.id);
      _isAuthenticated = true;
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<void> updateProfile({
    String? name,
    String? handle,
    String? role,
    String? bio,
    String? location,
    String? website,
    String? intent,
    bool? isPrivate,
    String? dmPermission,
    bool? showOnlineStatus,
    bool? twoFactorEnabled,
  }) async {
    final payload = <String, dynamic>{
      'name': ?name,
      'handle': ?handle,
      'role': ?role,
      'bio': ?bio,
      'location': ?location,
      'website': ?website,
      'intent': ?intent,
      'isPrivate': ?isPrivate,
      'dmPermission': ?dmPermission,
      'showOnlineStatus': ?showOnlineStatus,
      'twoFactorEnabled': ?twoFactorEnabled,
    };

    final decoded =
        await _apiClient.patch(ApiConstants.currentUserEndpoint, body: payload);
    if (decoded['data'] is Map<String, dynamic>) {
      _currentUser = UserProfile.fromJson(decoded['data'] as Map<String, dynamic>);
      await _cacheUserProfile(_currentUser);
      notifyListeners();
    }
  }

  Future<void> logout() async {
    final prevUserId = _currentUser.id;
    try {
      await _apiClient.post(ApiConstants.authLogoutEndpoint);
    } catch (_) {}
    await _persistSessionMeta(null, null);
    await _cacheStore.clearUserScope(prevUserId);
    _cacheStore.setUserScope('guest');
    _apiClient.setAuthToken(null);
    _currentUser = _guestProfile();
    _isAuthenticated = false;
    notifyListeners();
  }
}
