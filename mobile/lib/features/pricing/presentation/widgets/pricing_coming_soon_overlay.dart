import 'dart:ui' show ImageFilter;
import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/pricing_repository.dart';

/// Coming Soon overlay + offline preview plans when backend pricing data is
/// absent, keeping the pricing UI safely blurred and non-interactive.
class PricingComingSoonLayer extends StatelessWidget {
  final Widget child;
  final bool isDark;

  const PricingComingSoonLayer({
    super.key,
    required this.child,
    required this.isDark,
  });

  static const List<PricingPlan> fallbackPreviewPlans = [
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

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        AbsorbPointer(
          absorbing: true,
          child: ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: 7, sigmaY: 7),
            child: child,
          ),
        ),
        Positioned.fill(
          child: Container(
            color: (isDark ? Colors.black : Colors.white).withAlpha(115),
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 340),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 28,
                  ),
                  decoration: BoxDecoration(
                    color: (isDark
                            ? AppColors.surfaceDarkElevated
                            : Colors.white)
                        .withAlpha(235),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.primary.withAlpha(90),
                      width: 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(isDark ? 95 : 28),
                        blurRadius: 28,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(28),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.auto_awesome_rounded,
                          color: AppColors.primary,
                          size: 26,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(24),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Tez kunda',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Coming Soon',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.4,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Premium tariflar va pro imkoniyatlar hozircha yopiq bosqichda. Hozir Geters platformasining barcha imkoniyatlaridan bepul foydalanishingiz mumkin.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13.5,
                          height: 1.45,
                          color: isDark
                              ? AppColors.textSecondaryDark
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
