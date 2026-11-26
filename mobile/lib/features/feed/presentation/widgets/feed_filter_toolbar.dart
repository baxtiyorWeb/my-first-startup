import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../models/feed_category.dart';

class FeedFilterToolbar extends StatelessWidget {
  final String activeTab;
  final ValueChanged<String> onTabChanged;
  final String activeSort;
  final ValueChanged<String> onSortChanged;
  final bool isGridView;
  final ValueChanged<bool> onViewModeChanged;
  final String? selectedTopic;
  final VoidCallback? onClearTopic;
  final List<FeedCategory> categories;
  final String? selectedCategory;
  final ValueChanged<String?>? onCategorySelected;

  const FeedFilterToolbar({
    super.key,
    required this.activeTab,
    required this.onTabChanged,
    required this.activeSort,
    required this.onSortChanged,
    this.isGridView = false,
    required this.onViewModeChanged,
    this.selectedTopic,
    this.onClearTopic,
    this.categories = const [],
    this.selectedCategory,
    this.onCategorySelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activePillColor = isDark ? AppColors.primary : AppColors.slateAccent;

    const tabs = [
      {'id': 'all', 'label': 'Barchasi', 'icon': Icons.grid_view_rounded},
      {'id': 'posts', 'label': 'Postlar', 'icon': Icons.article_outlined},
      {'id': 'articles', 'label': 'Maqolalar', 'icon': Icons.menu_book_outlined},
      {'id': 'shorts', 'label': 'Shorts', 'icon': Icons.play_circle_outline_rounded},
    ];

    const sortOptions = [
      {'id': 'latest', 'label': 'Eng yangilar'},
      {'id': 'popular', 'label': 'Ommabop'},
      {'id': 'views', 'label': 'Ko\'p ko\'rilgan'},
    ];

    final currentSortLabel = sortOptions.firstWhere(
      (s) => s['id'] == activeSort,
      orElse: () => sortOptions[0],
    )['label']!;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 2, 16, 10),
      child: Column(
        children: [
          // Row 1: Liquid Glass Category Selection Pills
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: tabs.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final tab = tabs[index];
                final isSelected = activeTab == tab['id'];
                return LiquidGlassContainer(
                  borderRadius: AppTheme.radiusFull,
                  blurSigma: 14,
                  tintColor: isSelected ? activePillColor : null,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  onTap: () => onTabChanged(tab['id'] as String),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        tab['icon'] as IconData,
                        size: 15,
                        color: isSelected
                            ? (isDark ? AppColors.onPrimary : Colors.white)
                            : (isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        tab['label'] as String,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                          color: isSelected
                              ? (isDark ? AppColors.onPrimary : Colors.white)
                              : (isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Dynamic category chips (backend-driven; never hardcoded)
          if (categories.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 32,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                itemCount: categories.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final category = categories[index];
                  final isSelected = selectedCategory == category.slug;
                  return LiquidGlassContainer(
                    borderRadius: AppTheme.radiusFull,
                    blurSigma: 14,
                    tintColor: isSelected ? AppColors.primary : null,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    onTap: () => onCategorySelected
                        ?.call(isSelected ? null : category.slug),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          category.name,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? AppColors.onPrimary
                                : (isDark
                                    ? AppColors.textSecondaryDark
                                    : AppColors.textPrimaryLight),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${category.count}',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? AppColors.onPrimary.withAlpha(190)
                                : (isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],

          const SizedBox(height: 10),

          // Row 2: Liquid Glass Dropdowns & View Switcher
          Row(
            children: [
              if (selectedTopic != null)
                LiquidGlassContainer(
                  height: 34,
                  borderRadius: AppTheme.radiusFull,
                  tintColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  onTap: onClearTopic,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '#$selectedTopic',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onPrimary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.close, size: 13, color: AppColors.onPrimary),
                    ],
                  ),
                )
              else
                LiquidGlassDropdown<String>(
                  selectedValue: activeTab,
                  onSelected: onTabChanged,
                  options: tabs
                      .map(
                        (t) => LiquidGlassMenuOption<String>(
                          value: t['id'] as String,
                          label: t['label'] as String,
                          icon: t['icon'] as IconData,
                        ),
                      )
                      .toList(),
                  child: LiquidGlassContainer(
                    height: 34,
                    borderRadius: AppTheme.radiusFull,
                    blurSigma: 14,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.playlist_play_rounded,
                          size: 16,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Lenta',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 15,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ],
                    ),
                  ),
                ),

              const Spacer(),

              LiquidGlassDropdown<String>(
                selectedValue: activeSort,
                onSelected: onSortChanged,
                options: sortOptions
                    .map(
                      (o) => LiquidGlassMenuOption<String>(
                        value: o['id']!,
                        label: o['label']!,
                      ),
                    )
                    .toList(),
                child: LiquidGlassContainer(
                  height: 34,
                  borderRadius: AppTheme.radiusFull,
                  blurSigma: 14,
                  padding: const EdgeInsets.symmetric(horizontal: 11),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.language_rounded,
                        size: 14,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        currentSortLabel,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 3),
                      Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 15,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 8),

              LiquidGlassContainer(
                height: 34,
                borderRadius: AppTheme.radiusFull,
                blurSigma: 14,
                padding: const EdgeInsets.all(3),
                child: Row(
                  children: [
                    _ViewModeIcon(
                      icon: Icons.grid_view_outlined,
                      isActive: isGridView,
                      onTap: () => onViewModeChanged(true),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 2),
                    _ViewModeIcon(
                      icon: Icons.view_agenda_outlined,
                      isActive: !isGridView,
                      onTap: () => onViewModeChanged(false),
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ViewModeIcon extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;
  final bool isDark;

  const _ViewModeIcon({
    required this.icon,
    required this.isActive,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final activeBorder = isDark ? AppColors.primary : AppColors.slateAccent;
    final activeBg =
        isDark ? AppColors.primary.withAlpha(38) : AppColors.surfaceLight;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
          decoration: BoxDecoration(
            color: isActive ? activeBg : Colors.transparent,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            border: isActive
                ? Border.all(color: activeBorder.withAlpha(140), width: 1)
                : null,
          ),
          child: Icon(
            icon,
            size: 15,
            color: isActive
                ? (isDark ? AppColors.primaryLight : AppColors.slateAccent)
                : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
        ),
      ),
    );
  }
}
