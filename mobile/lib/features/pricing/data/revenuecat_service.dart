import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import 'pricing_repository.dart';

/// Thrown when the user closes the Google Play purchase sheet.
class StorePurchaseCancelled implements Exception {
  const StorePurchaseCancelled();
}

class StorePurchaseResult {
  final bool active;
  final String? productId;

  const StorePurchaseResult({required this.active, this.productId});
}

/// Google Play purchases through RevenueCat.
///
/// The public Google SDK key is provided at build time:
///   flutter build appbundle --dart-define=REVENUECAT_GOOGLE_API_KEY=goog_xxx
/// or through config/*.json with --dart-define-from-file.
///
/// The RevenueCat secret key and webhook auth stay on the server; the app only
/// sends its user id so server-side verification can activate the entitlement.
class RevenueCatService {
  static const String googleApiKey =
      String.fromEnvironment('REVENUECAT_GOOGLE_API_KEY');

  bool _configured = false;
  String? _appUserId;

  bool get isConfigured => googleApiKey.isNotEmpty && !kIsWeb;

  Future<void> _ensureConfigured(String appUserId) async {
    if (!isConfigured) {
      throw StateError(
        "Google Play to'lovlari sozlanmagan (REVENUECAT_GOOGLE_API_KEY).",
      );
    }

    if (!_configured) {
      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }
      final configuration = PurchasesConfiguration(googleApiKey)
        ..appUserID = appUserId;
      await Purchases.configure(configuration);
      _configured = true;
      _appUserId = appUserId;
      return;
    }

    if (_appUserId != appUserId) {
      await Purchases.logIn(appUserId);
      _appUserId = appUserId;
    }
  }

  Future<StorePurchaseResult> purchase({
    required String appUserId,
    required PricingPlan plan,
    required String billingCycle,
  }) async {
    await _ensureConfigured(appUserId);
    final package = await _resolvePackage(plan: plan, billingCycle: billingCycle);

    try {
      final result = await Purchases.purchase(PurchaseParams.package(package));
      return StorePurchaseResult(
        active: result.customerInfo.entitlements.active.isNotEmpty,
        productId: package.storeProduct.identifier,
      );
    } on PlatformException catch (error) {
      if (PurchasesErrorHelper.getErrorCode(error) ==
          PurchasesErrorCode.purchaseCancelledError) {
        throw const StorePurchaseCancelled();
      }
      rethrow;
    }
  }

  /// Restores previous Google Play purchases and returns whether an active
  /// entitlement now exists.
  Future<bool> restore({required String appUserId}) async {
    await _ensureConfigured(appUserId);
    final info = await Purchases.restorePurchases();
    return info.entitlements.active.isNotEmpty;
  }

  Future<Package> _resolvePackage({
    required PricingPlan plan,
    required String billingCycle,
  }) async {
    final productId = billingCycle == 'yearly'
        ? plan.storeProductYearlyId
        : plan.storeProductMonthlyId;
    final offerings = await Purchases.getOfferings();

    if (productId != null && productId.isNotEmpty) {
      for (final offering in offerings.all.values) {
        for (final package in offering.availablePackages) {
          if (package.storeProduct.identifier == productId) return package;
        }
      }
    }

    // Fallback to the current offering's standard packages so a renamed store
    // product still resolves while the backend mapping is updated.
    final current = offerings.current;
    if (current != null) {
      final fallback = billingCycle == 'yearly' ? current.annual : current.monthly;
      if (fallback != null) return fallback;
    }

    throw StateError(
      "Google Play mahsuloti topilmadi. RevenueCat offering sozlamalarini tekshiring.",
    );
  }
}
