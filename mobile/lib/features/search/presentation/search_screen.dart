import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/empty_state.dart';
import '../../auth/data/auth_controller.dart';
import '../../feed/data/feed_controller.dart';
import '../../feed/models/author.dart';
import '../../feed/models/post.dart';
import '../../feed/presentation/widgets/post_card.dart';
import '../../tags/data/tags_controller.dart';
import '../../tags/data/tags_repository.dart';
import '../../tags/models/tag_item.dart';
import 'widgets/search_empty_discovery.dart';

class SearchScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final TagsController? tagsController;
  final String? initialQuery;
  final ValueChanged<String> onPostTap;
  final ValueChanged<Author> onAuthorTap;

  const SearchScreen({
    super.key,
    required this.feedController,
    required this.authController,
    this.tagsController,
    this.initialQuery,
    required this.onPostTap,
    required this.onAuthorTap,
  });

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  late final TagsController _tagsController;
  late final bool _ownsTagsController;

  @override
  void initState() {
    super.initState();
    _ownsTagsController = widget.tagsController == null;
    _tagsController = widget.tagsController ??
        TagsController(
          repository: TagsRepositoryImpl(apiClient: widget.authController.apiClient),
          cacheStore: widget.feedController.cacheStore,
        );
    if (_tagsController.trendingTags.isEmpty && !_tagsController.isLoadingTrending) {
      _tagsController.loadTrending();
    }
    final initial = widget.initialQuery?.trim() ?? '';
    if (initial.isNotEmpty) {
      _searchController.text = initial;
      _tagsController.updateSearchQuery(initial);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    if (_ownsTagsController) {
      _tagsController.dispose();
    } else {
      _tagsController.clearSearch();
    }
    super.dispose();
  }

  void _selectTagFilter(String tagName) {
    _searchController.text = tagName;
    _searchController.selection = TextSelection.collapsed(offset: tagName.length);
    _tagsController.updateSearchQuery(tagName);
  }

  bool _matchesPost(Post p, String query) {
    final q = query.replaceFirst('#', '').toLowerCase();
    return p.content.toLowerCase().contains(q) ||
        (p.title != null && p.title!.toLowerCase().contains(q)) ||
        p.author.name.toLowerCase().contains(q) ||
        p.author.handle.toLowerCase().contains(q) ||
        (p.topic != null && p.topic!.toLowerCase().contains(q)) ||
        p.tags.any((t) => t.toLowerCase().contains(q)) ||
        p.tagItems.any(
          (t) => t.name.toLowerCase().contains(q) || t.slug.toLowerCase().contains(q),
        );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Container(
          height: 42,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  onChanged: _tagsController.updateSearchQuery,
                  style: TextStyle(
                    fontSize: 13.5,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Postlar, teglar va mualliflar...',
                    filled: false,
                    prefixIcon: Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _searchController,
                builder: (context, value, _) {
                  if (value.text.isEmpty) return const SizedBox.shrink();
                  return IconButton(
                    onPressed: () {
                      _searchController.clear();
                      _tagsController.clearSearch();
                    },
                    icon: const Icon(Icons.close_rounded, size: 18),
                    visualDensity: VisualDensity.compact,
                  );
                },
              ),
            ],
          ),
        ),
      ),
      body: ListenableBuilder(
        listenable: Listenable.merge([
          widget.feedController,
          _searchController,
          _tagsController,
        ]),
        builder: (context, _) {
          final query = _searchController.text.trim();
          final allPosts = widget.feedController.posts;
          final searchResults = query.isEmpty
              ? allPosts
              : allPosts.where((p) => _matchesPost(p, query)).toList();

          if (query.isEmpty) {
            return SearchEmptyDiscovery(
              tagsController: _tagsController,
              feedController: widget.feedController,
              allPosts: allPosts,
              isDark: isDark,
              onSelectTag: _selectTagFilter,
              onAuthorTap: widget.onAuthorTap,
            );
          }

          final matchingTags = _tagsController.suggestions;
          if (searchResults.isEmpty && matchingTags.isEmpty) {
            return EmptyStateWidget(
              icon: Icons.search_off_rounded,
              title: '"$query" bo\'yicha natijalar topilmadi',
              description: 'Boshqa kalit so\'z bilan qidirib ko\'ring yoki trend teglardan birini tanlang.',
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            physics: const BouncingScrollPhysics(),
            itemCount: searchResults.length + (matchingTags.isNotEmpty ? 1 : 0),
            itemBuilder: (context, index) {
              if (matchingTags.isNotEmpty && index == 0) {
                return _buildTagSuggestionsStrip(matchingTags, isDark);
              }
              final postIdx = matchingTags.isNotEmpty ? index - 1 : index;
              final post = searchResults[postIdx];
              return PostCard(
                key: ValueKey('search_${post.id}'),
                post: post,
                feedController: widget.feedController,
                authController: widget.authController,
                onPostTap: () => widget.onPostTap(post.id),
                onAuthorTap: widget.onAuthorTap,
                onTagTap: _selectTagFilter,
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildTagSuggestionsStrip(List<TagItem> tags, bool isDark) {
    return Container(
      height: 44,
      margin: const EdgeInsets.only(bottom: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        itemCount: tags.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, idx) {
          final tag = tags[idx];
          return GestureDetector(
            onTap: () => _selectTagFilter(tag.name),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: Text(
                '#${tag.name}',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
