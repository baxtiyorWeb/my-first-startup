import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/liquid_glass.dart';
import '../../../core/widgets/verified_badge.dart';
import '../../auth/data/auth_controller.dart';
import '../../feed/data/feed_controller.dart';
import '../../feed/models/author.dart';
import '../../feed/presentation/widgets/post_card.dart';

class ExploreScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final ValueChanged<String> onPostTap;
  final ValueChanged<Author> onAuthorTap;

  const ExploreScreen({
    super.key,
    required this.feedController,
    required this.authController,
    required this.onPostTap,
    required this.onAuthorTap,
  });

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _category = 'all';

  static const List<Map<String, String>> _categories = [
    {'id': 'all', 'label': 'Barchasi'},
    {'id': 'project', 'label': 'Loyihalar'},
    {'id': 'cofounder', 'label': 'Kofaunderlar'},
    {'id': 'discussions', 'label': 'Munozaralar'},
  ];

  static const List<Author> _recommendedAuthors = [
    Author(
      id: 'u3',
      name: 'Madina Karimova',
      handle: 'madina_ux',
      role: 'Product Designer',
      avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      verified: true,
    ),
    Author(
      id: 'u2',
      name: 'Sardor Rahimov',
      handle: 'sardor_dev',
      role: 'Full-Stack Dev',
      avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      verified: true,
    ),
    Author(
      id: 'u4',
      name: 'Javohir Toshmatov',
      handle: 'javohir_ai',
      role: 'AI Researcher',
      avatarUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      verified: true,
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activePillColor = isDark ? AppColors.primary : AppColors.slateAccent;

    return Scaffold(
      appBar: AppBar(title: const Text('Kashf et')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      textInputAction: TextInputAction.search,
                      style: TextStyle(
                        fontSize: 13.5,
                        color: isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimaryLight,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Postlar, mavzular va mualliflar qidirish...',
                        filled: false,
                        prefixIcon: Icon(
                          Icons.search_rounded,
                          size: 20,
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                        ),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                    ),
                  ),
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: _searchController,
                    builder: (context, value, _) {
                      if (value.text.isEmpty) return const SizedBox.shrink();
                      return IconButton(
                        onPressed: () => _searchController.clear(),
                        icon: const Icon(Icons.close_rounded, size: 18),
                        visualDensity: VisualDensity.compact,
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final cat = _categories[idx];
                final isSelected = _category == cat['id'];
                return LiquidGlassContainer(
                  borderRadius: AppTheme.radiusFull,
                  tintColor: isSelected ? activePillColor : null,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  onTap: () => setState(() => _category = cat['id']!),
                  child: Center(
                    child: Text(
                      cat['label']!,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected
                            ? (isDark ? AppColors.onPrimary : Colors.white)
                            : (isDark
                                ? AppColors.textSecondaryDark
                                : AppColors.textPrimaryLight),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: ListenableBuilder(
              listenable:
                  Listenable.merge([widget.feedController, _searchController]),
              builder: (context, _) {
                final query = _searchController.text.trim().toLowerCase();
                final allPosts = widget.feedController.posts;
                final filtered = allPosts.where((p) {
                  if (query.isNotEmpty) {
                    final matchesQuery = p.content.toLowerCase().contains(query) ||
                        (p.title != null && p.title!.toLowerCase().contains(query)) ||
                        p.author.name.toLowerCase().contains(query) ||
                        p.author.handle.toLowerCase().contains(query) ||
                        (p.topic != null && p.topic!.toLowerCase().contains(query)) ||
                        p.tags.any((t) => t.toLowerCase().contains(query));
                    if (!matchesQuery) return false;
                  }
                  if (_category == 'project') return p.isProject;
                  if (_category == 'cofounder') {
                    return p.lookingFor == 'cofounder' ||
                        p.author.intent == 'looking_for_cofounder';
                  }
                  if (_category == 'discussions') return p.commentsCount >= 5;
                  return true;
                }).toList();

                return CustomScrollView(
                  scrollCacheExtent: const ScrollCacheExtent.pixels(500),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(),
                  slivers: [
                    if (query.isEmpty) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                          child: Text(
                            'Tavsiya etilgan mualliflar',
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? AppColors.textPrimaryDark
                                  : AppColors.textPrimaryLight,
                            ),
                          ),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: SizedBox(
                          height: 156,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _recommendedAuthors.length,
                            separatorBuilder: (_, _) => const SizedBox(width: 10),
                            itemBuilder: (context, idx) {
                              final author = _recommendedAuthors[idx];
                              final isFollowing = allPosts.any(
                                (p) =>
                                    p.author.handle == author.handle &&
                                    p.author.isFollowing,
                              );
                              return _RecommendedAuthorCard(
                                author: author,
                                isFollowing: isFollowing,
                                isDark: isDark,
                                onTap: () => widget.onAuthorTap(author),
                                onToggleFollow: () => widget.feedController
                                    .toggleFollowAuthor(author.handle),
                              );
                            },
                          ),
                        ),
                      ),
                    ],
                    const SliverToBoxAdapter(child: SizedBox(height: 10)),
                    if (filtered.isEmpty)
                      const SliverFillRemaining(
                        hasScrollBody: false,
                        child: EmptyStateWidget(
                          icon: Icons.explore_outlined,
                          title: 'Natija topilmadi',
                          description:
                              'Boshqa kalit so\'z yoki toifani tanlab ko\'ring.',
                        ),
                      )
                    else
                      SliverPadding(
                        padding: const EdgeInsets.only(bottom: 96),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final post = filtered[index];
                              return PostCard(
                                key: ValueKey('explore_${post.id}'),
                                post: post,
                                feedController: widget.feedController,
                                authController: widget.authController,
                                onPostTap: () => widget.onPostTap(post.id),
                                onAuthorTap: widget.onAuthorTap,
                              );
                            },
                            childCount: filtered.length,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RecommendedAuthorCard extends StatelessWidget {
  final Author author;
  final bool isFollowing;
  final bool isDark;
  final VoidCallback onTap;
  final VoidCallback onToggleFollow;

  const _RecommendedAuthorCard({
    required this.author,
    required this.isFollowing,
    required this.isDark,
    required this.onTap,
    required this.onToggleFollow,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 158,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            AppAvatar(imageUrl: author.avatarUrl, name: author.name, size: 44),
            Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        author.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                        ),
                      ),
                    ),
                    if (author.verified) ...[
                      const SizedBox(width: 3),
                      const VerifiedBadge(size: 13),
                    ],
                  ],
                ),
                Text(
                  author.role,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    color:
                        isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
            AppButton(
              text: isFollowing ? 'Kuzatilmoqda' : 'Kuzatish',
              variant: isFollowing ? ButtonVariant.outline : ButtonVariant.primary,
              size: ButtonSize.sm,
              isFullWidth: true,
              onPressed: onToggleFollow,
            ),
          ],
        ),
      ),
    );
  }
}
