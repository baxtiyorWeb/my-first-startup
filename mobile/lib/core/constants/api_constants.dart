import 'package:flutter/foundation.dart';

abstract class ApiConstants {
  /// Build vaqtida beriladi:
  ///   flutter run  --dart-define-from-file=config/dev-android.json
  ///   flutter build appbundle --release --dart-define-from-file=config/prod.json
  static const String _configuredBaseUrl =
      String.fromEnvironment('API_BASE_URL');

  static const String _developmentBaseUrl = 'https://www.geters.uz/api';

  /// Debug build konfiguratsiyasiz ishlasa, mobil ilova ishlab turgan API'dan
  /// foydalanadi; lokal backend uchun [API_BASE_URL] ni alohida bering.
  static const String baseUrl =
      _configuredBaseUrl == '' ? _developmentBaseUrl : _configuredBaseUrl;

  static bool get isConfigured => _configuredBaseUrl != '';

  /// Release build API manzilisiz chiqmasligi kerak: aks holda ilova
  /// foydalanuvchi qurilmasining o'ziga so'rov yuboradi.
  static void assertConfiguredForRelease() {
    if (!kReleaseMode || isConfigured) return;
    throw StateError(
      'API_BASE_URL berilmagan. Release build uchun:\n'
      '  flutter build appbundle --release '
      '--dart-define-from-file=config/prod.json\n'
      'yoki mobil papkadagi scripts/build_release.sh dan foydalaning.',
    );
  }

  static const String postsEndpoint = '/posts';
  static const String shortsEndpoint = '/shorts';
  static const String bookmarksEndpoint = '/bookmarks';
  static const String actionsSyncEndpoint = '/actions/sync';
  static const String commentsEndpoint = '/comments';
  static const String uploadEndpoint = '/upload';
  static const String authSessionEndpoint = '/auth/session';
  static const String authGoogleVerifyEndpoint = '/auth/google/verify';
  static const String authLogoutEndpoint = '/auth/logout';
  static const String notificationsEndpoint = '/notifications';
  static const String usersEndpoint = '/users';
  static const String currentUserEndpoint = '/users/me';
  static const String pricingEndpoint = '/pricing';
  static const String subscriptionCheckoutEndpoint = '/subscriptions/checkout';
  static const String subscriptionCancelEndpoint = '/subscriptions/cancel';
  static const String tagsEndpoint = '/tags';
  static const String tagsSuggestEndpoint = '/tags/suggest';
  static const String tagsTrendingEndpoint = '/tags/trending';
}
