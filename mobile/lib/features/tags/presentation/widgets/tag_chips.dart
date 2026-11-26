import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../models/tag_item.dart';

class SelectedTagChip extends StatelessWidget {
  final TagItem tag;
  final bool isDark;
  final VoidCallback onRemove;

  const SelectedTagChip({
    super.key,
    required this.tag,
    required this.isDark,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(left: 11, right: 6, top: 6, bottom: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.textPrimaryDark : AppColors.slateAccent,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '#${tag.name}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.surfaceDark : Colors.white,
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: Icon(
              Icons.close_rounded,
              size: 16,
              color: isDark ? AppColors.surfaceDark : Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class SuggestionTagChip extends StatelessWidget {
  final TagItem tag;
  final bool isSelected;
  final bool disabled;
  final bool isDark;
  final VoidCallback onTap;

  const SuggestionTagChip({
    super.key,
    required this.tag,
    required this.isSelected,
    required this.disabled,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isSelected
        ? AppColors.primary.withValues(alpha: isDark ? 0.22 : 0.1)
        : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight);
    final border = isSelected
        ? AppColors.primary
        : (isDark ? AppColors.borderDarkElevated : AppColors.borderLight);

    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: Opacity(
        opacity: disabled ? 0.5 : 1,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '#${tag.name}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected
                      ? AppColors.primary
                      : (isDark
                          ? AppColors.textSecondaryDark
                          : AppColors.textPrimaryLight),
                ),
              ),
              if (tag.usageCount > 0) ...[
                const SizedBox(width: 6),
                Text(
                  _compactUsage(tag.usageCount),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static String _compactUsage(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return '$count';
  }
}
