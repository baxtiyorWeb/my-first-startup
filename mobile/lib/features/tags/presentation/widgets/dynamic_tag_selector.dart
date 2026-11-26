import 'package:material_ui/material_ui.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../models/tag_item.dart';
import '../../data/tags_controller.dart';
import 'tag_chips.dart';

/// Backend-driven multi-tag selector with live debounced suggestions and creation.
class DynamicTagSelector extends StatefulWidget {
  final TagsController controller;
  final List<TagItem> selectedTags;
  final ValueChanged<List<TagItem>> onChanged;
  final FocusNode? focusNode;
  final int maxTags;

  const DynamicTagSelector({
    super.key,
    required this.controller,
    required this.selectedTags,
    required this.onChanged,
    this.focusNode,
    this.maxTags = AppConstants.maxPostTags,
  });

  @override
  State<DynamicTagSelector> createState() => _DynamicTagSelectorState();
}

class _DynamicTagSelectorState extends State<DynamicTagSelector> {
  final TextEditingController _inputController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.controller.trendingTags.isEmpty &&
        !widget.controller.isLoadingTrending) {
      widget.controller.loadTrending();
    }
  }

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  void _toggleTag(TagItem tag) {
    final current = List<TagItem>.from(widget.selectedTags);
    final idx = current.indexWhere((t) => t == tag);
    if (idx >= 0) {
      current.removeAt(idx);
      widget.onChanged(current);
      return;
    }
    if (current.length >= widget.maxTags) return;
    current.add(tag);
    widget.onChanged(current);
  }

  Future<void> _handleCreateTag() async {
    if (widget.selectedTags.length >= widget.maxTags) return;
    final candidate = widget.controller.normalizedCandidate;
    final created = await widget.controller.createTag(candidate);
    if (!mounted || created == null) return;

    final current = List<TagItem>.from(widget.selectedTags);
    if (!current.contains(created)) {
      current.add(created);
      widget.onChanged(current);
    }
    _inputController.clear();
    widget.controller.clearSearch();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final atLimit = widget.selectedTags.length >= widget.maxTags;

    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final ctrl = widget.controller;
        final suggestions = ctrl.suggestions;
        final showCreate = ctrl.canCreateForCurrentQuery && !atLimit;
        final isEmptySearch = ctrl.searchQuery.trim().isEmpty;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Teglar',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceDarkElevated
                        : AppColors.surfaceLightElevated,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${widget.selectedTags.length}/${widget.maxTags}',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: atLimit
                          ? (isDark
                              ? AppColors.warning
                              : AppColors.warningTextLight)
                          : (isDark
                              ? AppColors.textSecondaryDark
                              : AppColors.textSecondaryLight),
                    ),
                  ),
                ),
              ],
            ),
            if (widget.selectedTags.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.selectedTags
                    .map((tag) => SelectedTagChip(
                          tag: tag,
                          isDark: isDark,
                          onRemove: () => _toggleTag(tag),
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _inputController,
              focusNode: widget.focusNode,
              enabled: !ctrl.isCreating,
              textInputAction: TextInputAction.search,
              onChanged: ctrl.updateSearchQuery,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
              ),
              decoration: InputDecoration(
                hintText: atLimit
                    ? 'Maksimal ${widget.maxTags} ta teg tanlandi'
                    : 'Teg qidirish yoki qo\'shish...',
                hintStyle: TextStyle(
                  fontSize: 13.5,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
                prefixIcon: Icon(
                  Icons.tag_rounded,
                  size: 18,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
                suffixIcon: ctrl.isSearching || ctrl.isCreating
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : (ctrl.searchQuery.isNotEmpty
                        ? IconButton(
                            onPressed: () {
                              _inputController.clear();
                              ctrl.clearSearch();
                            },
                            icon: Icon(
                              Icons.close_rounded,
                              size: 18,
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                            ),
                          )
                        : null),
                filled: true,
                fillColor: isDark
                    ? AppColors.surfaceDarkElevated
                    : AppColors.surfaceLightElevated,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 11,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(
                    color: isDark
                        ? AppColors.borderDarkElevated
                        : AppColors.borderLight,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(
                    color: AppColors.primary,
                    width: 1.4,
                  ),
                ),
              ),
            ),
            if (ctrl.createError != null) ...[
              const SizedBox(height: 8),
              Text(
                ctrl.createError!,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.danger,
                ),
              ),
            ],
            if (showCreate) ...[
              const SizedBox(height: 10),
              InkWell(
                onTap: ctrl.isCreating ? null : _handleCreateTag,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: isDark ? 0.16 : 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.45),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.add_circle_outline_rounded,
                        size: 17,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          '"#${ctrl.normalizedCandidate}" tegini yaratish',
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (suggestions.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                isEmptySearch ? 'Ommabop teglar' : 'Mos teglar',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: suggestions
                    .map((tag) {
                      final isSelected = widget.selectedTags.contains(tag);
                      return SuggestionTagChip(
                        tag: tag,
                        isSelected: isSelected,
                        disabled: atLimit && !isSelected,
                        isDark: isDark,
                        onTap: () {
                          _toggleTag(tag);
                          if (!isEmptySearch && !isSelected) {
                            _inputController.clear();
                            ctrl.clearSearch();
                          }
                        },
                      );
                    })
                    .toList(),
              ),
            ] else if (ctrl.isLoadingTrending && isEmptySearch) ...[
              const SizedBox(height: 12),
              Text(
                'Teglar yuklanmoqda...',
                style: TextStyle(
                  fontSize: 12.5,
                  color: isDark
                      ? AppColors.textMutedDark
                      : AppColors.textMutedLight,
                ),
              ),
            ] else if (ctrl.trendingError != null && isEmptySearch) ...[
              const SizedBox(height: 10),
              TextButton.icon(
                onPressed: () => ctrl.loadTrending(forceRefresh: true),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Teglarni qayta yuklash'),
              ),
            ],
          ],
        );
      },
    );
  }
}
