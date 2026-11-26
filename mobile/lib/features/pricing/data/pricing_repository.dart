import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

class PricingPlan {
  final String id;
  final String slug;
  final String name;
  final String description;
  final int priceMonthlyUzs;
  final int priceYearlyUzs;
  final String currency;
  final List<String> features;
  final String? storeProductMonthlyId;
  final String? storeProductYearlyId;
  final bool isCurrent;

  const PricingPlan({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.priceMonthlyUzs,
    required this.priceYearlyUzs,
    required this.currency,
    required this.features,
    this.storeProductMonthlyId,
    this.storeProductYearlyId,
    required this.isCurrent,
  });

  factory PricingPlan.fromJson(Map<String, dynamic> json) {
    return PricingPlan(
      id: json['id'] as String? ?? '',
      slug: json['slug'] as String? ?? 'free',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      priceMonthlyUzs: json['priceMonthlyUzs'] as int? ?? 0,
      priceYearlyUzs: json['priceYearlyUzs'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'UZS',
      features: (json['features'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      storeProductMonthlyId: json['storeProductMonthlyId'] as String?,
      storeProductYearlyId: json['storeProductYearlyId'] as String?,
      isCurrent: json['isCurrent'] as bool? ?? false,
    );
  }
}

class SubscriptionStatus {
  final String id;
  final String planSlug;
  final String planName;
  final String status;
  final String billingCycle;
  final DateTime currentPeriodEnd;
  final bool cancelAtPeriodEnd;

  const SubscriptionStatus({
    required this.id,
    required this.planSlug,
    required this.planName,
    required this.status,
    required this.billingCycle,
    required this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      id: json['id'] as String? ?? '',
      planSlug: json['planSlug'] as String? ?? 'free',
      planName: json['planName'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      billingCycle: json['billingCycle'] as String? ?? 'monthly',
      currentPeriodEnd: DateTime.tryParse(json['currentPeriodEnd']?.toString() ?? '') ??
          DateTime.now(),
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] as bool? ?? false,
    );
  }
}

class PricingOverview {
  final List<PricingPlan> plans;
  final SubscriptionStatus? currentSubscription;
  final bool providerConfigured;
  final bool googlePlayConfigured;

  const PricingOverview({
    required this.plans,
    this.currentSubscription,
    this.providerConfigured = false,
    this.googlePlayConfigured = false,
  });
}

class CheckoutResult {
  final String message;
  final String? checkoutUrl;
  final bool requiresPayment;

  const CheckoutResult({
    required this.message,
    this.checkoutUrl,
    this.requiresPayment = false,
  });
}

class StoreSyncResult {
  final bool active;
  final String message;

  const StoreSyncResult({required this.active, required this.message});
}

class PricingRepository {
  final ApiClient _apiClient;

  PricingRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  Future<PricingOverview> getOverview() async {
    final decoded = await _apiClient.get(ApiConstants.pricingEndpoint);
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final plansRaw = data['plans'] as List<dynamic>? ?? const [];
    final subRaw = data['currentSubscription'] as Map<String, dynamic>?;
    return PricingOverview(
      plans: plansRaw
          .map((e) => PricingPlan.fromJson(e as Map<String, dynamic>))
          .toList(),
      currentSubscription:
          subRaw != null ? SubscriptionStatus.fromJson(subRaw) : null,
      providerConfigured: data['providerConfigured'] as bool? ?? false,
      googlePlayConfigured: data['googlePlayConfigured'] as bool? ?? false,
    );
  }

  Future<CheckoutResult> checkout({
    required String planSlug,
    required String billingCycle,
    String provider = 'inpay',
  }) async {
    final decoded = await _apiClient.post(
      ApiConstants.subscriptionCheckoutEndpoint,
      body: {
        'planSlug': planSlug,
        'billingCycle': billingCycle,
        'provider': provider,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return CheckoutResult(
      message: data['message'] as String? ?? 'So\'rov yuborildi',
      checkoutUrl: data['checkoutUrl'] as String?,
      requiresPayment: data['requiresPayment'] as bool? ?? false,
    );
  }

  Future<void> cancelSubscription() async {
    await _apiClient.post(ApiConstants.subscriptionCancelEndpoint);
  }

  /// Verifies a Google Play purchase with RevenueCat on the server and
  /// activates the matching plan for the signed-in user.
  Future<StoreSyncResult> syncGooglePlay() async {
    final decoded = await _apiClient.post(
      ApiConstants.subscriptionGooglePlaySyncEndpoint,
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return StoreSyncResult(
      active: data['active'] as bool? ?? false,
      message: data['message'] as String? ?? 'Obuna holati yangilandi',
    );
  }
}
