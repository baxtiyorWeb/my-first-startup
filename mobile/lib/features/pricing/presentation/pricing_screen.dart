import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_button.dart';
import '../data/pricing_repository.dart';
import '../data/revenuecat_service.dart';

/// Pullik tariflar hozircha vaqtincha yopiq: rejalar hammaga ko'rinadi, lekin
/// sotib olish tugmalari faollashtirilmagan. Tariflar ishga tushganda `true`
/// qilib qo'yish kifoya.
const bool kPlansPurchasable = false;

/// Backend ma'lumoti kelmaguncha ko'rsatiladigan namunaviy rejalar.
const List<PricingPlan> kPreviewPlans = [
  PricingPlan(
    id: 'preview_free',
    slug: 'free',
    name: 'Bepul',
    description: 'Asosiy jamoa va kontent imkoniyatlari',
    priceMonthlyUzs: 0,
    priceYearlyUzs: 0,
    currency: 'UZS',
    features: [
      'Cheksiz postlar va fikrlar',
      'Shorts video lentasi',
      'Saqlangan postlar to\'plami',
    ],
    isCurrent: true,
  ),
  PricingPlan(
    id: 'preview_pro',
    slug: 'pro',
    name: 'Pro',
    description: 'Tez o\'sayotgan startaplar va mualliflar uchun',
    priceMonthlyUzs: 49000,
    priceYearlyUzs: 470000,
    currency: 'UZS',
    features: [
      'Tasdiqlangan nishon va tahlil',
      'Loyihalar uchun kengaytirilgan qamrov',
      'Ustuvor ko\'rib chiqish',
    ],
    isCurrent: false,
  ),
];

class PricingScreen extends StatefulWidget {
  final PricingRepository repository;
  final RevenueCatService? revenueCat;

  /// Signed-in user id. Required for Google Play purchases because RevenueCat
  /// identifies the customer by the same id the backend verifies.
  final String? userId;

  const PricingScreen({
    super.key,
    required this.repository,
    this.revenueCat,
    this.userId,
  });

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
  late final RevenueCatService _revenueCat =
      widget.revenueCat ?? RevenueCatService();
  String _billingCycle = 'monthly';
  PricingOverview? _overview;
  bool _isLoading = true;
  String? _error;
  String? _busySlug;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await widget.repository.getOverview();
      if (!mounted) return;
      setState(() {
        _overview = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  bool get _purchasesEnabled => kPlansPurchasable;

  bool get _usesGooglePlay =>
      _purchasesEnabled &&
      widget.userId != null &&
      _revenueCat.isConfigured &&
      (_overview?.googlePlayConfigured ?? false);

  Future<void> _selectPlan(PricingPlan plan) async {
    if (!_purchasesEnabled) return;

    final price =
        _billingCycle == 'yearly' ? plan.priceYearlyUzs : plan.priceMonthlyUzs;
    if (price > 0 && _usesGooglePlay) {
      await _purchaseWithGooglePlay(plan);
      return;
    }

    setState(() => _busySlug = plan.slug);
    try {
      final result = await widget.repository.checkout(
        planSlug: plan.slug,
        billingCycle: _billingCycle,
      );
      if (!mounted) return;

      final checkoutUrl = result.checkoutUrl;
      if (result.requiresPayment && checkoutUrl != null && checkoutUrl.isNotEmpty) {
        await _showPaymentLink(checkoutUrl);
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message), behavior: SnackBarBehavior.floating),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), behavior: SnackBarBehavior.floating),
      );
    } finally {
      if (mounted) setState(() => _busySlug = null);
    }
  }

  Future<void> _showPaymentLink(String url) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('To\'lov sahifasi'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('To\'lovni yakunlash uchun havolani brauzerda oching:'),
            const SizedBox(height: 10),
            SelectableText(url, style: const TextStyle(fontSize: 12.5)),
            const SizedBox(height: 10),
            const Text(
              'To\'lov tasdiqlangach obuna avtomatik faollashadi.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (!dialogContext.mounted) return;
              Navigator.of(dialogContext).pop();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Havola nusxalandi'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: const Text('Nusxalash'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Yopish'),
          ),
        ],
      ),
    );
  }

  Future<void> _purchaseWithGooglePlay(PricingPlan plan) async {
    final userId = widget.userId;
    if (userId == null) return;

    setState(() => _busySlug = plan.slug);
    try {
      final purchase = await _revenueCat.purchase(
        appUserId: userId,
        plan: plan,
        billingCycle: _billingCycle,
      );
      if (!purchase.active) {
        throw StateError(
          "To'lov tasdiqlanmadi. Qayta urinib ko'ring yoki xaridlarni tiklang.",
        );
      }

      final sync = await widget.repository.syncGooglePlay();
      if (!mounted) return;
      _showMessage(sync.message);
      await _load();
    } on StorePurchaseCancelled {
      // Foydalanuvchi Google Play oynasini yopdi — xato ko'rsatilmaydi.
    } catch (e) {
      if (!mounted) return;
      _showMessage(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _busySlug = null);
    }
  }

  Future<void> _restorePurchases() async {
    final userId = widget.userId;
    if (userId == null) return;

    setState(() => _busySlug = 'restore');
    try {
      await _revenueCat.restore(appUserId: userId);
      final sync = await widget.repository.syncGooglePlay();
      if (!mounted) return;
      _showMessage(sync.message);
      await _load();
    } catch (e) {
      if (!mounted) return;
      _showMessage(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _busySlug = null);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: isError ? const TextStyle(color: Colors.white) : null,
        ),
        backgroundColor: isError ? AppColors.dangerSurface : null,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _cancelSub() async {
    setState(() => _busySlug = 'cancel');
    try {
      await widget.repository.cancelSubscription();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Avtomatik yangilanish bekor qilindi'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), behavior: SnackBarBehavior.floating),
      );
    } finally {
      if (mounted) setState(() => _busySlug = null);
    }
  }

  String _formatUzs(int amount) {
    if (amount <= 0) return 'Bepul';
    final s = amount.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return '${buf.toString()} so\'m';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sub = _overview?.currentSubscription;
    final loadedPlans = _overview?.plans ?? const <PricingPlan>[];
    final plans = loadedPlans.isNotEmpty ? loadedPlans : kPreviewPlans;

    Widget content;
    if (_isLoading) {
      content = const Center(child: CircularProgressIndicator());
    } else if (_error != null && loadedPlans.isEmpty) {
      content = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              AppButton(text: 'Qayta urinish', onPressed: _load),
            ],
          ),
        ),
      );
    } else {
      content = ListView(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        children: [
          Center(
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'monthly', label: Text('Oylik')),
                ButtonSegment(value: 'yearly', label: Text('Yillik (-20%)')),
              ],
              selected: {_billingCycle},
              onSelectionChanged: (val) =>
                  setState(() => _billingCycle = val.first),
            ),
          ),
          const SizedBox(height: 16),
          if (sub != null)
            _SubscriptionBanner(
              sub: sub,
              isDark: isDark,
              busySlug: _busySlug,
              onCancel: _cancelSub,
            ),
          ...plans.map((plan) => _buildPlanCard(plan, isDark)),
          if (!_purchasesEnabled) _buildPausedNotice(isDark),
          if (_usesGooglePlay)
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 24),
              child: Column(
                children: [
                  AppButton(
                    text: 'Xaridlarni tiklash',
                    variant: ButtonVariant.secondary,
                    isFullWidth: true,
                    isLoading: _busySlug == 'restore',
                    onPressed:
                        _busySlug == null ? _restorePurchases : null,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    "To'lov Google Play orqali amalga oshiriladi. "
                    "Obuna hisobingizga bog'lanadi va boshqa qurilmalarda ham ishlaydi.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
            ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Tariflar va Obuna')),
      body: content,
    );
  }

  Widget _buildPausedNotice(bool isDark) {
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return Container(
      margin: const EdgeInsets.only(top: 2, bottom: 24),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: AppColors.primary.withAlpha(70)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(28),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Tariflar hozircha vaqtincha yopiq',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Rejalar bilan bemalol tanishing, lekin sotib olish hozircha vaqtincha '
            'o\'chirilgan. Bu davrda Geters\'ning barcha asosiy imkoniyatlari hamma '
            'uchun bepul ishlaydi — hech qanday to\'lov olinmaydi va hisobingizdan '
            'pul yechilmaydi.',
            style: TextStyle(fontSize: 12.5, height: 1.5, color: muted),
          ),
          const SizedBox(height: 8),
          Text(
            'Tariflar ishga tushganda shu sahifada xabar beramiz. Savolingiz bo\'lsa, '
            'qo\'llab-quvvatlash jamoasiga yozishingiz mumkin.',
            style: TextStyle(fontSize: 12.5, height: 1.5, color: muted),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(PricingPlan plan, bool isDark) {
    final price = _billingCycle == 'yearly' ? plan.priceYearlyUzs : plan.priceMonthlyUzs;
    final isPro = plan.slug == 'pro';
    final String actionLabel;
    if (plan.isCurrent) {
      actionLabel = 'Joriy reja';
    } else if (!_purchasesEnabled) {
      actionLabel = price <= 0 ? 'Bepul reja' : 'Tez orada ishga tushadi';
    } else {
      actionLabel = price <= 0 ? 'Bepul rejaga o\'tish' : 'Rejani tanlash';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isPro
            ? (isDark ? AppColors.surfaceDarkElevated : const Color(0xFF0F1419))
            : (isDark ? AppColors.surfaceDark : AppColors.surfaceLightElevated),
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                plan.name,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: isPro ? Colors.white : null,
                ),
              ),
              if (plan.isCurrent)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.success.withAlpha(35),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Faol',
                    style: TextStyle(
                      color: isDark
                          ? AppColors.success
                          : AppColors.successTextLight,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            plan.description,
            style: TextStyle(
              fontSize: 12.5,
              color: isPro
                  ? Colors.white70
                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            '${_formatUzs(price)}${price > 0 ? (_billingCycle == 'yearly' ? ' / yil' : ' / oy') : ''}',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: isPro ? Colors.white : null,
            ),
          ),
          const SizedBox(height: 12),
          ...plan.features.map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  const Icon(Icons.check_rounded, size: 16, color: AppColors.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      f,
                      style: TextStyle(
                        fontSize: 13,
                        color: isPro ? Colors.white : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          AppButton(
            text: actionLabel,
            isFullWidth: true,
            isLoading: _busySlug == plan.slug,
            onPressed: (plan.isCurrent || !_purchasesEnabled)
                ? null
                : () => _selectPlan(plan),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionBanner extends StatelessWidget {
  final SubscriptionStatus sub;
  final bool isDark;
  final String? busySlug;
  final VoidCallback onCancel;

  const _SubscriptionBanner({
    required this.sub,
    required this.isDark,
    required this.busySlug,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLightElevated,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Joriy obuna: ${sub.planName}',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Amal qilish muddati: ${DateFormatter.formatShortDate(sub.currentPeriodEnd)}'
            '${sub.cancelAtPeriodEnd ? ' · Davr yakunida bekor qilinadi' : ''}',
            style: TextStyle(
              fontSize: 12.5,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          if (!sub.cancelAtPeriodEnd && sub.planSlug != 'free') ...[
            const SizedBox(height: 10),
            AppButton(
              text: 'Obunani bekor qilish',
              variant: ButtonVariant.danger,
              size: ButtonSize.sm,
              isLoading: busySlug == 'cancel',
              onPressed: onCancel,
            ),
          ],
        ],
      ),
    );
  }
}
