import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/empty_state.dart';
import '../../auth/data/auth_controller.dart';
import '../../feed/data/feed_controller.dart';
import '../../feed/models/author.dart';
import '../../feed/models/post.dart';
import '../../feed/presentation/widgets/post_card.dart';
import '../../messages/data/messages_controller.dart';
import '../../messages/presentation/chat_detail_screen.dart';
import 'profile_edit_sheet.dart';
import 'widgets/profile_qr_sheet.dart';
import 'widgets/profile_sliver_header.dart';
import 'widgets/profile_tabs_content.dart';

class ProfileScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final ThemeController themeController;
  final MessagesController messagesController;
  final Author? targetAuthor;
  final ValueChanged<String>? onPostTap;
  final ValueChanged<Author>? onAuthorTap;

  const ProfileScreen({
    super.key,
    required this.feedController,
    required this.authController,
    required this.themeController,
    required this.messagesController,
    this.targetAuthor,
    this.onPostTap,
    this.onAuthorTap,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  bool get _isSelf {
    if (widget.targetAuthor == null) return true;
    return widget.targetAuthor!.handle == widget.authController.currentUser.handle ||
        widget.targetAuthor!.id == widget.authController.currentUser.id;
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _copyProfileLink(String cleanHandle) {
    Clipboard.setData(
      ClipboardData(text: 'https://thegogetters.uz/profile/$cleanHandle'),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Profil havolasi nusxalandi'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeAccent = isDark ? AppColors.primaryLight : AppColors.slateAccent;
    final surfaceBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;

    return ListenableBuilder(
      listenable:
          Listenable.merge([widget.authController, widget.feedController]),
      builder: (context, _) {
        final selfUser = widget.authController.currentUser;
        final displayName = _isSelf ? selfUser.name : widget.targetAuthor!.name;
        final displayHandle = _isSelf
            ? selfUser.formattedHandle
            : widget.targetAuthor!.formattedHandle;
        final cleanHandle = displayHandle.replaceFirst('@', '');
        final displayRole = _isSelf ? selfUser.role : widget.targetAuthor!.role;
        final displayBio = _isSelf
            ? selfUser.bio
            : 'Go-getters hamjamiyatining faol ishtirokchisi va texnologiya ixlosmandi.';
        final displayAvatar =
            _isSelf ? selfUser.avatarUrl : widget.targetAuthor!.avatarUrl;
        final isVerified =
            _isSelf ? selfUser.verified : widget.targetAuthor!.verified;

        final authorPosts = widget.feedController.postsByAuthor(cleanHandle);
        final savedPosts = widget.feedController.bookmarkedPosts;
        final totalAuthorViews = authorPosts.fold<int>(
          0,
          (sum, p) => sum + p.viewsCount,
        );
        final isFollowingPeer = widget.feedController.posts.any(
          (p) => p.author.handle == cleanHandle && p.author.isFollowing,
        );

        return Scaffold(
          backgroundColor:
              isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
          body: NestedScrollView(
            physics: const BouncingScrollPhysics(),
            headerSliverBuilder: (context, innerBoxIsScrolled) {
              return [
                ProfileSliverHeader(
                  innerBoxIsScrolled: innerBoxIsScrolled,
                  isSelf: _isSelf,
                  isDark: isDark,
                  isVerified: isVerified,
                  isFollowingPeer: isFollowingPeer,
                  displayName: displayName,
                  cleanHandle: cleanHandle,
                  displayAvatar: displayAvatar,
                  coverPhotoUrl: selfUser.coverPhotoUrl,
                  activeAccent: activeAccent,
                  surfaceBg: surfaceBg,
                  authController: widget.authController,
                  themeController: widget.themeController,
                  onCopyLink: () => _copyProfileLink(cleanHandle),
                  onEditProfile: () => ProfileEditSheet.show(
                    context,
                    authController: widget.authController,
                  ),
                  onShowQr: () => ProfileQrSheet.show(
                    context,
                    displayName: displayName,
                    cleanHandle: cleanHandle,
                    isDark: isDark,
                    onCopyLink: () => _copyProfileLink(cleanHandle),
                  ),
                  onToggleFollow: () =>
                      widget.feedController.toggleFollowAuthor(cleanHandle),
                  onMessage: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    final navigator = Navigator.of(context);
                    try {
                      final conv = await widget.messagesController
                          .startOrOpenConversation(widget.targetAuthor!);
                      navigator.push(
                        MaterialPageRoute(
                          builder: (_) => ChatDetailScreen(
                            conversation: conv,
                            controller: widget.messagesController,
                          ),
                        ),
                      );
                    } catch (e) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(e.toString()),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                ),
                ProfileInfoSection(
                  displayName: displayName,
                  displayHandle: displayHandle,
                  displayRole: displayRole,
                  displayBio: displayBio,
                  isVerified: isVerified,
                  isSelf: _isSelf,
                  isDark: isDark,
                  activeAccent: activeAccent,
                  surfaceBg: surfaceBg,
                  selfUser: selfUser,
                  postsCount: authorPosts.length,
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: ProfileTabBarDelegate(
                    TabBar(
                      controller: _tabController,
                      indicatorColor: activeAccent,
                      indicatorWeight: 2.5,
                      dividerColor:
                          isDark ? AppColors.borderDark : AppColors.borderLight,
                      labelColor: activeAccent,
                      unselectedLabelColor: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                      labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                      labelStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                      unselectedLabelStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      tabs: [
                        _buildProfileTab(Icons.layers_outlined, 'Postlar'),
                        _buildProfileTab(
                          _isSelf
                              ? Icons.bookmark_border_rounded
                              : Icons.rocket_launch_outlined,
                          _isSelf ? 'Saqlanganlar' : 'Loyihalar',
                        ),
                        _buildProfileTab(Icons.bar_chart_rounded, 'Faollik'),
                        _buildProfileTab(Icons.info_outline_rounded, 'Haqida'),
                      ],
                    ),
                    backgroundColor: surfaceBg,
                  ),
                ),
              ];
            },
            body: TabBarView(
              controller: _tabController,
              children: [
                _buildPostListTab(
                  authorPosts,
                  emptyIcon: Icons.article_outlined,
                  emptyTitle: 'Hozircha postlar yo\'q',
                  emptyDesc: 'Foydalanuvchi hali birorta post joylamagan.',
                ),
                _buildPostListTab(
                  _isSelf
                      ? savedPosts
                      : authorPosts.where((p) => p.isProject).toList(),
                  emptyIcon: _isSelf
                      ? Icons.bookmark_border_rounded
                      : Icons.rocket_launch_outlined,
                  emptyTitle: _isSelf
                      ? 'Saqlangan postlar yo\'q'
                      : 'Loyihalar yo\'q',
                  emptyDesc: _isSelf
                      ? 'Keyin o\'qish uchun postlarni saqlab qo\'ying.'
                      : 'Ushbu muallif hali startap loyihasini joylamagan.',
                ),
                ProfileActivityTab(
                  totalViews: totalAuthorViews,
                  discussionsCount: selfUser.discussionsCount,
                  savedCount: savedPosts.length,
                  isDark: isDark,
                ),
                ProfileAboutTab(
                  displayName: displayName,
                  displayHandle: displayHandle,
                  displayRole: displayRole,
                  displayBio: displayBio,
                  selfUser: _isSelf ? selfUser : null,
                  isDark: isDark,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPostListTab(
    List<Post> list, {
    required IconData emptyIcon,
    required String emptyTitle,
    required String emptyDesc,
  }) {
    if (list.isEmpty) {
      return EmptyStateWidget(
        icon: emptyIcon,
        title: emptyTitle,
        description: emptyDesc,
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 96),
      scrollCacheExtent: const ScrollCacheExtent.pixels(500),
      physics: const BouncingScrollPhysics(),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final p = list[index];
        return PostCard(
          key: ValueKey('profile_${p.id}'),
          post: p,
          feedController: widget.feedController,
          authController: widget.authController,
          onPostTap: () => widget.onPostTap?.call(p.id),
          onAuthorTap: widget.onAuthorTap,
        );
      },
    );
  }

  Widget _buildProfileTab(IconData icon, String label) {
    return Tab(
      height: 44,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 15),
          const SizedBox(width: 4),
          Flexible(
            child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
