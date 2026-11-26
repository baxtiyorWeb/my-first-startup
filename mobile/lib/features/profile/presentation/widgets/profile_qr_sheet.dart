import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/liquid_glass.dart';

class ProfileQrSheet {
  static void show(
    BuildContext context, {
    required String displayName,
    required String cleanHandle,
    required bool isDark,
    required VoidCallback onCopyLink,
  }) {
    final profileUrl = 'https://thegogetters.uz/profile/$cleanHandle';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: LiquidGlassContainer(
          borderRadius: 24,
          blurSigma: 24,
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withAlpha(50)
                      : Colors.black.withAlpha(35),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                width: 112,
                height: 112,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDarkElevated : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Icon(
                  Icons.qr_code_2_rounded,
                  size: 76,
                  color: isDark ? Colors.white : AppColors.slateAccent,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                displayName,
                style: AppTypography.heading3.copyWith(
                  color: isDark
                      ? AppColors.textPrimaryDark
                      : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                profileUrl,
                style: AppTypography.caption.copyWith(
                  color:
                      isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(height: 16),
              AppButton(
                text: 'Havolani nusxalash',
                icon: Icons.copy_rounded,
                isFullWidth: true,
                onPressed: () {
                  Navigator.pop(ctx);
                  onCopyLink();
                },
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }
}
