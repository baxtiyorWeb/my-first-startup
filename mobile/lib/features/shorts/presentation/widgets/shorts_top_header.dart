import 'package:material_ui/material_ui.dart';
import '../../../feed/models/post.dart';

class ShortsTopHeader extends StatelessWidget {
  final double topPadding;
  final List<String> filters;
  final String selectedFilter;
  final bool canGoBack;
  final Post? currentPost;
  final VoidCallback onBack;
  final VoidCallback onCreateShort;
  final VoidCallback onSearch;
  final ValueChanged<String> onSelectFilter;
  final ValueChanged<Post> onOpenOptions;

  const ShortsTopHeader({
    super.key,
    required this.topPadding,
    required this.filters,
    required this.selectedFilter,
    required this.canGoBack,
    this.currentPost,
    required this.onBack,
    required this.onCreateShort,
    required this.onSearch,
    required this.onSelectFilter,
    required this.onOpenOptions,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: topPadding + 8,
      left: 0,
      right: 0,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                if (canGoBack) ...[
                  GestureDetector(
                    onTap: onBack,
                    child: Semantics(
                      button: true,
                      label: 'Orqaga',
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withAlpha(115),
                          border: Border.all(
                            color: Colors.white.withAlpha(42),
                          ),
                        ),
                        child: const Icon(
                          Icons.arrow_back_ios_new_rounded,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ] else
                  const SizedBox(width: 4),
                const Text(
                  'Shorts',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                    shadows: [Shadow(color: Colors.black45, blurRadius: 8)],
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: onCreateShort,
                  icon: const Icon(
                    Icons.videocam_outlined,
                    color: Colors.white,
                    size: 24,
                  ),
                  tooltip: 'Short yaratish',
                ),
                IconButton(
                  onPressed: onSearch,
                  icon: const Icon(
                    Icons.search_rounded,
                    color: Colors.white,
                    size: 23,
                  ),
                  tooltip: 'Qidirish',
                ),
                if (currentPost != null)
                  IconButton(
                    onPressed: () => onOpenOptions(currentPost!),
                    icon: const Icon(
                      Icons.more_vert_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                    tooltip: 'Sozlamalar',
                  ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filters.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filter = filters[index];
                final isSelected = selectedFilter == filter;
                return GestureDetector(
                  onTap: () => onSelectFilter(filter),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? Colors.white
                          : Colors.black.withAlpha(115),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: isSelected
                            ? Colors.white
                            : Colors.white.withAlpha(40),
                      ),
                    ),
                    child: Text(
                      filter,
                      style: TextStyle(
                        color: isSelected
                            ? const Color(0xFF0F172A)
                            : Colors.white,
                        fontSize: 12.5,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
