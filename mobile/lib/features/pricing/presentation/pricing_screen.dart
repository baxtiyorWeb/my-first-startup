import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_button.dart';
import '../data/pricing_repository.dart';
import 'widgets/pricing_coming_soon_overlay.dart';

class PricingScreen extends StatefulWidget {
  final PricingRepository repository;
  final bool comingSoonMode;

  const PricingScreen({
    super.key,
    required this.repository,
    this.comingSoonMode = true,
  });

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
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

  Future<void> _selectPlan(PricingPlan plan) async {
    if (widget.comingSoonMode) return;
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

  Future<void> _cancelSub() async {
    if (widget.comingSoonMode) return;
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
    final plans = loadedPlans.isNotEmpty
        ? loadedPlans
        : (widget.comingSoonMode
            ? PricingComingSoonLayer.fallbackPreviewPlans
            : const <PricingPlan>[]);

    Widget content;
    if (_isLoading) {
      content = const Center(child: CircularProgressIndicator());
    } else if (_error != null && !widget.comingSoonMode) {
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
      final planList = ListView(
        padding: const EdgeInsets.all(16),
        physics: widget.comingSoonMode
            ? const NeverScrollableScrollPhysics()
            : const BouncingScrollPhysics(),
        children: [
          Center(
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'monthly', label: Text('Oylik')),
                ButtonSegment(value: 'yearly', label: Text('Yillik (-20%)')),
              ],
              selected: {_billingCycle},
              onSelectionChanged: widget.comingSoonMode
                  ? null
                  : (val) => setState(() => _billingCycle = val.first),
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
        ],
      );

      content = widget.comingSoonMode
          ? PricingComingSoonLayer(isDark: isDark, child: planList)
          : planList;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Tariflar va Obuna')),
      body: content,
    );
  }

  Widget _buildPlanCard(PricingPlan plan, bool isDark) {
    final price = _billingCycle == 'yearly' ? plan.priceYearlyUzs : plan.priceMonthlyUzs;
    final isPro = plan.slug == 'pro';

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
            text: plan.isCurrent
                ? 'Joriy reja'
                : (price <= 0 ? 'Bepul rejaga o\'tish' : 'Rejani tanlash'),
            isFullWidth: true,
            isLoading: _busySlug == plan.slug,
            onPressed: (plan.isCurrent || widget.comingSoonMode)
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
