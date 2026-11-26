import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/brand_logo.dart';
import '../../../core/widgets/empty_state.dart';
import '../../auth/data/auth_controller.dart';
import '../../messages/data/messages_controller.dart';
import '../../notifications/data/notifications_controller.dart';
import '../../tags/data/tags_controller.dart';
import '../data/feed_controller.dart';
import '../models/author.dart';
import 'create_post_screen.dart';
import 'widgets/create_post_composer_bar.dart';
import 'widgets/feed_filter_toolbar.dart';
import 'widgets/feed_loading_skeleton.dart';
import 'widgets/post_card.dart';
import 'widgets/trending_topics_bar.dart';

class FeedScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final ThemeController themeController;
  final MessagesController messagesController;
  final NotificationsController notificationsController;
  final TagsController? tagsController;
  final VoidCallback onNotificationsTap;
  final VoidCallback onAvatarMenuTap;
  final ValueChanged<String> onPostTap;
  final ValueChanged<Author> onAuthorTap;

  const FeedScreen({
    super.key,
    required this.feedController,
    required this.authController,
    required this.themeController,
    required this.messagesController,
    required this.notificationsController,
    this.tagsController,
    required this.onNotificationsTap,
    required this.onAvatarMenuTap,
    required this.onPostTap,
    required this.onAuthorTap,
  });

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  bool _isGridView = false;

  Future<void> _openCreateScreen({
    bool openImageField = false,
    bool openVideoField = false,
  }) async {
    final created = await CreatePostScreen.open(
      context,
      feedController: widget.feedController,
      authController: widget.authController,
      tagsController: widget.tagsController,
      openImagePickerOnStart: openImageField,
      openVideoPickerOnStart: openVideoField,
    );
    if (created == true && mounted) {
      widget.tagsController?.loadTrending(forceRefresh: true);
    }
  }

  String? _resolveTopicDisplayLabel(String? filter) {
    if (filter == null || filter.isEmpty) return null;
    final tags = widget.tagsController?.trendingTags;
    if (tags != null) {
      final lower = filter.toLowerCase();
      for (final t in tags) {
        if (t.slug.toLowerCase() == lower || t.name.toLowerCase() == lower) {
          return t.name;
        }
      }
    }
    return filter;
  }

  bool _handleScroll(ScrollNotification notification) {
    if (notification.metrics.pixels >=
        notification.metrics.maxScrollExtent - 320) {
      if (widget.feedController.hasMorePosts &&
          !widget.feedController.isLoadingMore) {
        widget.feedController.loadMorePosts();
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.backgroundDark : AppColors.backgroundLight;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: const BrandLogo(size: 38, showText: true, showTagline: true),
        actions: [
          ListenableBuilder(
            listenable: widget.notificationsController,
            builder: (context, _) {
              final unread = widget.notificationsController.unreadCount;
              final bellShape = CircleBorder(
                side: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              );
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Material(
                    color: isDark
                        ? AppColors.surfaceDarkElevated
                        : AppColors.surfaceLight,
                    shape: bellShape,
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: widget.onNotificationsTap,
                      customBorder: bellShape,
                      child: SizedBox(
                        width: 38,
                        height: 38,
                        child: Icon(
                          Icons.notifications_none_rounded,
                          size: 20,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                        ),
                      ),
                    ),
                  ),
                  if (unread > 0)
                    Positioned(
                      right: -1,
                      top: -1,
                      child: IgnorePointer(
                        child: Container(
                          width: 9,
                          height: 9,
                          decoration: BoxDecoration(
                            color: AppColors.danger,
                            shape: BoxShape.circle,
                            border: Border.all(color: bgColor, width: 1.5),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(width: 10),
          ListenableBuilder(
            listenable: widget.authController,
            builder: (context, _) {
              final user = widget.authController.currentUser;
              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: AppAvatar(
                  name: user.name,
                  imageUrl: user.avatarUrl,
                  size: 38,
                  isOnline: true,
                  ringColor: bgColor,
                  onTap: widget.onAvatarMenuTap,
                ),
              );
            },
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: Listenable.merge([
          widget.feedController,
          widget.authController,
          if (widget.tagsController != null) widget.tagsController!,
        ]),
        builder: (context, _) {
          final posts = widget.feedController.visiblePosts;
          final currentUser = widget.authController.currentUser;
          final pendingSync = widget.feedController.pendingSyncCount;

          return NotificationListener<ScrollNotification>(
            onNotification: _handleScroll,
            child: RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  widget.feedController.loadPosts(forceRefresh: true),
                  if (widget.tagsController != null)
                    widget.tagsController!.loadTrending(forceRefresh: true),
                ]);
              },
              color: AppColors.primary,
              child: CustomScrollView(
                scrollCacheExtent: const ScrollCacheExtent.pixels(600),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                slivers: [
                  if (pendingSync > 0)
                    SliverToBoxAdapter(
                      child: _PendingSyncBanner(
                        count: pendingSync,
                        isDark: isDark,
                        onRetryTap: () => widget
                            .feedController.actionController.syncEngine
                            .syncNow(ignoreBackoff: true),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: TrendingTopicsBar(
                      tagsController: widget.tagsController,
                      selectedTopic: widget.feedController.selectedTopicFilter,
                      onTagSelected: widget.feedController.setTopicFilter,
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: CreatePostComposerBar(
                      userName: currentUser.name,
                      userAvatarUrl: currentUser.avatarUrl,
                      onTap: () => _openCreateScreen(),
                      onMediaTap: () => _openCreateScreen(openImageField: true),
                      onVideoTap: () => _openCreateScreen(openVideoField: true),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: FeedFilterToolbar(
                      activeTab: widget.feedController.activeTab,
                      onTabChanged: widget.feedController.setFilterTab,
                      activeSort: widget.feedController.activeSort,
                      onSortChanged: widget.feedController.setSortBy,
                      isGridView: _isGridView,
                      onViewModeChanged: (val) =>
                          setState(() => _isGridView = val),
                      selectedTopic: _resolveTopicDisplayLabel(
                        widget.feedController.selectedTopicFilter,
                      ),
                      onClearTopic: () =>
                          widget.feedController.setTopicFilter(null),
                    ),
                  ),
                  if (widget.feedController.isLoading && posts.isEmpty)
                    const SliverToBoxAdapter(child: FeedLoadingSkeleton())
                  else if (posts.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: EmptyStateWidget(
                        icon: Icons.article_outlined,
                        title: 'Hozircha postlar topilmadi',
                        description:
                            'Tanlangan filtr bo\'yicha postlar yo\'q. Boshqa bo\'limni tanlang yoki yangi post yarating.',
                        actionText: 'Post yaratish',
                        onAction: () => _openCreateScreen(),
                      ),
                    )
                  else if (_isGridView)
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 0.74,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final p = posts[index];
                            return RepaintBoundary(
                              child: PostGridCard(
                                key: ValueKey('grid_${p.id}'),
                                post: p,
                                feedController: widget.feedController,
                                onTap: () => widget.onPostTap(p.id),
                              ),
                            );
                          },
                          childCount: posts.length,
                        ),
                      ),
                    )
                  else
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final p = posts[index];
                          return PostCard(
                            key: ValueKey('feed_${p.id}'),
                            post: p,
                            feedController: widget.feedController,
                            authController: widget.authController,
                            onPostTap: () => widget.onPostTap(p.id),
                            onAuthorTap: widget.onAuthorTap,
                            onTagTap: widget.feedController.setTopicFilter,
                          );
                        },
                        childCount: posts.length,
                      ),
                    ),
                  if (widget.feedController.isLoadingMore)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 18),
                        child: Center(
                          child: SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                      ),
                    ),
                  const SliverToBoxAdapter(child: SizedBox(height: 88)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PendingSyncBanner extends StatelessWidget {
  final int count;
  final bool isDark;
  final VoidCallback onRetryTap;

  const _PendingSyncBanner({
    required this.count,
    required this.isDark,
    required this.onRetryTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.primarySurfaceDark : AppColors.primarySurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary.withAlpha(65)),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_sync_outlined, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '$count ta amal sinxronizatsiyani kutmoqda',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
          InkWell(
            onTap: onRetryTap,
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Text(
                'Sinxronlash',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
