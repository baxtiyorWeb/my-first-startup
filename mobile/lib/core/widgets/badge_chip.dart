import 'package:material_ui/material_ui.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/app_typography.dart';

class BadgeChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isSelected;
  final VoidCallback? onTap;

  const BadgeChip({
    super.key,
    required this.label,
    this.icon,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedBg = isDark ? AppColors.primary : AppColors.primaryActive;

    final bg = isSelected
        ? selectedBg
        : (isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated);

    final text = isSelected
        ? (isDark ? AppColors.onPrimary : Colors.white)
        : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight);

    final border = isSelected
        ? selectedBg
        : (isDark ? AppColors.borderDark : AppColors.borderLight);

    final content = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: text),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: AppTypography.badge.copyWith(
              color: text,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            ),
          ),
        ],
      ),
    );

    if (onTap == null) {
      return DecoratedBox(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          border: Border.all(color: border, width: 1),
        ),
        child: content,
      );
    }

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      side: BorderSide(color: border, width: 1),
    );

    return Material(
      color: bg,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: shape,
        splashColor: AppColors.primary.withAlpha(48),
        highlightColor:
            isDark ? AppColors.primarySurfaceDark : AppColors.primarySurface,
        child: content,
      ),
    );
  }
}
