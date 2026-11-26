import 'package:material_ui/material_ui.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'app_button.dart';

class AppConfirmDialog {
  static Future<bool> show(
    BuildContext context, {
    required String title,
    required String message,
    String confirmLabel = 'Tasdiqlash',
    String cancelLabel = 'Bekor qilish',
    bool isDanger = false,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = isDanger ? AppColors.danger : AppColors.primary;

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLight,
        surfaceTintColor: Colors.transparent,
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          side: BorderSide(
            color: isDark ? AppColors.borderDarkElevated : AppColors.borderLight,
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: accent.withAlpha(24),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isDanger ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
                size: 19,
                color: accent,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(
            fontSize: 13.5,
            height: 1.45,
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
          ),
        ),
        actions: [
          AppButton(
            text: cancelLabel,
            variant: ButtonVariant.outline,
            size: ButtonSize.sm,
            onPressed: () => Navigator.of(ctx).pop(false),
          ),
          const SizedBox(width: 4),
          AppButton(
            text: confirmLabel,
            variant: isDanger ? ButtonVariant.danger : ButtonVariant.primary,
            size: ButtonSize.sm,
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
    return result ?? false;
  }
}
