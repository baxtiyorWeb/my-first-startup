import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../../tags/data/tags_controller.dart';
import '../../../tags/models/tag_item.dart';

class TrendingTopicsBar extends StatefulWidget {
  final TagsController? tagsController;
  final String? selectedTopic;
  final ValueChanged<String>? onTagSelected;

  const TrendingTopicsBar({
    super.key,
    this.tagsController,
    this.selectedTopic,
    this.onTagSelected,
  });

  @override
  State<TrendingTopicsBar> createState() => _TrendingTopicsBarState();
}

class _TrendingTopicsBarState extends State<TrendingTopicsBar> {
  TagsController? _ownedController;

  TagsController get _controller =>
      widget.tagsController ?? (_ownedController ??= TagsController());

  @override
  void initState() {
    super.initState();
    if (_controller.trendingTags.isEmpty && !_controller.isLoadingTrending) {
      _controller.loadTrending();
    }
  }

  @override
  void dispose() {
    _ownedController?.dispose();
    super.dispose();
  }

  Color _tagAccent(int index, bool isDark) {
    final palette = [
      isDark ? AppColors.primaryLight : AppColors.primary,
      isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      isDark ? const Color(0xFF4DB5F0) : const Color(0xFF1D9BF0),
      AppColors.success,
      AppColors.info,
    ];
    return palette[index % palette.length];
  }

  static String _formatUsage(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return '$count';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListenableBuilder(
      listenable: _controller,
      builder: (context, _) {
        final tags = _controller.trendingTags;

        if (tags.isEmpty && _controller.isLoadingTrending) {
          return _buildLoadingBar(isDark);
        }

        if (tags.isEmpty) {
          if (_controller.trendingError == null) {
            return const SizedBox.shrink();
          }
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                Text(
                  'Teglarni yuklab bo\'lmadi',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _controller.loadTrending(forceRefresh: true),
                  child: const Text(
                    'Qayta urinish',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return Container(
          margin: const EdgeInsets.only(top: 6, bottom: 6),
          height: 36,
          child: Row(
            children: [
              Expanded(
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.only(left: 16, right: 8),
                  itemCount: tags.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: Row(
                            children: [
                              Icon(
                                Icons.local_fire_department_rounded,
                                size: 16,
                                color: isDark
                                    ? AppColors.warning
                                    : AppColors.warningTextLight,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Trend:',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  color: isDark
                                      ? AppColors.textPrimaryDark
                                      : AppColors.textPrimaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    final TagItem tag = tags[index - 1];
                    final selectedLower = widget.selectedTopic?.toLowerCase();
                    final isSelected = selectedLower != null &&
                        (selectedLower == tag.slug.toLowerCase() ||
                            selectedLower == tag.name.toLowerCase());
                    final tagColor = _tagAccent(index - 1, isDark);

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: LiquidGlassContainer(
                        borderRadius: AppTheme.radiusFull,
                        blurSigma: 14,
                        tintColor: isSelected ? AppColors.primary : null,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 11,
                          vertical: 6,
                        ),
                        onTap: () => widget.onTagSelected?.call(tag.slug),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '#${tag.name}',
                              style: TextStyle(
                                color: isSelected ? AppColors.onPrimary : tagColor,
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                              ),
                            ),
                            if (tag.usageCount > 0) ...[
                              const SizedBox(width: 5),
                              Text(
                                _formatUsage(tag.usageCount),
                                style: TextStyle(
                                  color: isSelected
                                      ? AppColors.onPrimary.withAlpha(190)
                                      : (isDark
                                          ? AppColors.textMutedDark
                                          : AppColors.textMutedLight),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLoadingBar(bool isDark) {
    final pillColor = isDark
        ? AppColors.surfaceDarkElevated
        : AppColors.surfaceLightElevated;
    return Container(
      margin: const EdgeInsets.only(top: 6, bottom: 6),
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: 5,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, idx) => Container(
          width: idx == 0 ? 54 : 78,
          height: 30,
          decoration: BoxDecoration(
            color: pillColor,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          ),
        ),
      ),
    );
  }
}
