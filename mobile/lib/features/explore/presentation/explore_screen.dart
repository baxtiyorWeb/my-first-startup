import 'package:material_ui/material_ui.dart';
import '../../../core/constants/api_constants.dart';
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
  List<Author> _recommendedAuthors = const [];
  final Map<String, bool> _followOverrides = {};

  static const List<Map<String, String>> _categories = [
    {'id': 'all', 'label': 'Barchasi'},
    {'id': 'project', 'label': 'Loyihalar'},
    {'id': 'cofounder', 'label': 'Kofaunderlar'},
    {'id': 'discussions', 'label': 'Munozaralar'},
  ];

  @override
  void initState() {
    super.initState();
    _loadRecommendedAuthors();
  }

  Future<void> _loadRecommendedAuthors() async {
    try {
      final decoded = await widget.authController.apiClient
          .get('${ApiConstants.usersEndpoint}/recommended');
      final data = decoded['data'];
      final rawList = data is Map<String, dynamic> && data['thinkers'] is List
          ? data['thinkers'] as List<dynamic>
          : data is List
              ? data
              : const <dynamic>[];
      final loaded = rawList
          .whereType<Map<String, dynamic>>()
          .map(Author.fromJson)
          .toList();
      if (!mounted) return;
      setState(() {
        _recommendedAuthors = loaded;
        for (final a in loaded) {
          _followOverrides[a.handle.replaceFirst('@', '').toLowerCase()] =
              a.isFollowing;
        }
      });
    } catch (_) {
      // Fallback to authors already present in loaded feed posts
    }
  }

  Future<void> _handleToggleFollow(Author author) async {
    final key = author.handle.replaceFirst('@', '').toLowerCase();
    final messenger = ScaffoldMessenger.of(context);
    try {
      final next = await widget.feedController.toggleFollowAuthor(author.handle);
      if (!mounted) return;
      setState(() => _followOverrides[key] = next);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              next
                  ? '${author.name} obunalarga qo\'shildi'
                  : '${author.name} obunadan chiqarildi',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (e) {
      if (!mounted) return;
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.dangerSurface,
          ),
        );
    }
  }

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

                final selfHandle = widget.authController.currentUser.handle
                    .replaceFirst('@', '')
                    .toLowerCase();
                final List<Author> displayAuthors;
                if (_recommendedAuthors.isNotEmpty) {
                  displayAuthors = _recommendedAuthors;
                } else {
                  final seen = <String>{selfHandle};
                  final derived = <Author>[];
                  for (final post in allPosts) {
                    final h =
                        post.author.handle.replaceFirst('@', '').toLowerCase();
                    if (h.isNotEmpty && seen.add(h)) {
                      derived.add(post.author);
                      if (derived.length >= 6) break;
                    }
                  }
                  displayAuthors = derived;
                }

                return CustomScrollView(
                  scrollCacheExtent: const ScrollCacheExtent.pixels(500),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(),
                  slivers: [
                    if (query.isEmpty && displayAuthors.isNotEmpty) ...[
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
                            itemCount: displayAuthors.length,
                            separatorBuilder: (_, _) => const SizedBox(width: 10),
                            itemBuilder: (context, idx) {
                              final author = displayAuthors[idx];
                              final cleanHandle = author.handle
                                  .replaceFirst('@', '')
                                  .toLowerCase();
                              final isFollowing = _followOverrides[cleanHandle] ??
                                  author.isFollowing ||
                                      allPosts.any(
                                        (p) =>
                                            p.author.handle
                                                    .replaceFirst('@', '')
                                                    .toLowerCase() ==
                                                cleanHandle &&
                                            p.author.isFollowing,
                                      );
                              return _RecommendedAuthorCard(
                                author: author,
                                isFollowing: isFollowing,
                                isDark: isDark,
                                onTap: () => widget.onAuthorTap(author),
                                onToggleFollow: () => _handleToggleFollow(author),
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
