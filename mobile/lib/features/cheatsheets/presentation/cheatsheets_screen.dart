import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/badge_chip.dart';
import '../../../core/widgets/empty_state.dart';
import '../data/cheatsheet_data.dart';
import '../models/cheatsheet.dart';
import 'cheatsheet_detail_screen.dart';

class CheatSheetsScreen extends StatefulWidget {
  const CheatSheetsScreen({super.key});

  @override
  State<CheatSheetsScreen> createState() => _CheatSheetsScreenState();
}

class _CheatSheetsScreenState extends State<CheatSheetsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'Barchasi';

  static const List<String> _categories = [
    'Barchasi',
    'DevOps & Tooling',
    'Mobile Development',
    'Database & Backend',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Qo\'llanmalar & Cheat Sheet',
          style: AppTypography.heading3.copyWith(
            fontWeight: FontWeight.w800,
            color:
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: ValueListenableBuilder<TextEditingValue>(
              valueListenable: _searchController,
              builder: (context, value, _) {
                return TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Buyruq yoki qo\'llanma qidirish...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    suffixIcon: value.text.isNotEmpty
                        ? IconButton(
                            onPressed: () => _searchController.clear(),
                            icon: const Icon(Icons.close_rounded, size: 18),
                            visualDensity: VisualDensity.compact,
                          )
                        : null,
                    isDense: true,
                    filled: true,
                    fillColor:
                        isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                );
              },
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: _categories.map((cat) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: BadgeChip(
                    label: cat,
                    isSelected: _selectedCategory == cat,
                    onTap: () => setState(() => _selectedCategory = cat),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ValueListenableBuilder<TextEditingValue>(
              valueListenable: _searchController,
              builder: (context, value, _) {
                final q = value.text.trim().toLowerCase();
                final filtered = CheatSheetsData.list.where((sheet) {
                  final matchesCat = _selectedCategory == 'Barchasi' ||
                      sheet.category == _selectedCategory;
                  final matchesSearch = q.isEmpty ||
                      sheet.title.toLowerCase().contains(q) ||
                      sheet.shortDescription.toLowerCase().contains(q) ||
                      sheet.sections.any((s) => s.commands.any((c) =>
                          c.command.toLowerCase().contains(q) ||
                          c.description.toLowerCase().contains(q)));
                  return matchesCat && matchesSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return EmptyStateWidget(
                    icon: Icons.code_off_rounded,
                    title: 'Qo\'llanma topilmadi',
                    description:
                        'Qidiruv so\'rovingizga mos buyruq yoki qo\'llanma topilmadi.',
                    actionText: 'Tozalash',
                    onAction: () {
                      _searchController.clear();
                      if (_selectedCategory != 'Barchasi') {
                        setState(() => _selectedCategory = 'Barchasi');
                      }
                    },
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) =>
                      _buildSheetCard(context, filtered[index], isDark),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSheetCard(BuildContext context, CheatSheet item, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => CheatSheetDetailScreen(sheet: item),
            ),
          ),
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.primarySurfaceDark
                            : AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      child: Icon(
                        _iconForKey(item.icon),
                        color: AppColors.primary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: AppTypography.heading3.copyWith(
                              fontSize: 16,
                              color: isDark
                                  ? AppColors.textPrimaryDark
                                  : AppColors.textPrimaryLight,
                            ),
                          ),
                          Text(
                            item.category,
                            style: AppTypography.caption.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 14,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  item.shortDescription,
                  style: AppTypography.body.copyWith(
                    color: isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 12),
                if (item.sections.isNotEmpty &&
                    item.sections.first.commands.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.codeSurfaceDark
                          : AppColors.codeSurfaceLight,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.chevron_right,
                          size: 16,
                          color: AppColors.codeAccent,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            item.sections.first.commands.first.command,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: AppColors.codeText,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _iconForKey(String icon) {
    switch (icon) {
      case 'terminal':
        return Icons.terminal_rounded;
      case 'layers':
        return Icons.layers_rounded;
      case 'phone_android':
        return Icons.phone_android_rounded;
      case 'storage':
        return Icons.storage_rounded;
      default:
        return Icons.code_rounded;
    }
  }
}
