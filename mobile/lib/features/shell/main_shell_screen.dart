import 'package:material_ui/material_ui.dart';
import '../auth/data/auth_controller.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/widgets/app_video_player.dart';
import '../explore/presentation/explore_screen.dart';
import '../feed/data/feed_controller.dart';
import '../feed/models/author.dart';
import '../feed/presentation/create_post_screen.dart';
import '../feed/presentation/feed_screen.dart';
import '../feed/presentation/post_detail_screen.dart';
import '../messages/data/messages_controller.dart';
import '../messages/presentation/messages_screen.dart';
import '../notifications/data/notifications_controller.dart';
import '../notifications/presentation/notifications_screen.dart';
import '../pricing/data/pricing_repository.dart';
import '../pricing/presentation/pricing_screen.dart';
import '../profile/presentation/profile_screen.dart';
import '../shorts/presentation/shorts_screen.dart';
import '../tags/data/tags_controller.dart';
import '../tags/data/tags_repository.dart';
import 'widgets/main_bottom_nav.dart';
import 'widgets/main_shell_drawer.dart';

class MainShellScreen extends StatefulWidget {
  final ThemeController themeController;
  final AuthController authController;
  final FeedController feedController;
  final TagsController? tagsController;
  final NotificationsController notificationsController;
  final MessagesController messagesController;

  const MainShellScreen({
    super.key,
    required this.themeController,
    required this.authController,
    required this.feedController,
    this.tagsController,
    required this.notificationsController,
    required this.messagesController,
  });

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final Set<int> _visitedTabs = {0};
  late final TagsController _tagsController = widget.tagsController ??
      TagsController(
        repository: TagsRepositoryImpl(apiClient: widget.authController.apiClient),
        cacheStore: widget.feedController.cacheStore,
      );
  late final bool _ownsTagsController = widget.tagsController == null;
  int _currentIndex = 0;
  int _previousIndex = 0;
  int _settledIndex = 0;

  @override
  void dispose() {
    if (_ownsTagsController) _tagsController.dispose();
    super.dispose();
  }

  void _onTabSelected(int index) {
    if (index == _currentIndex) return;
    if (index == 2 && _currentIndex != 2) {
      _previousIndex = _currentIndex;
    }
    AppVideoPlayer.releaseActive();
    setState(() {
      _visitedTabs.add(index);
      _currentIndex = index;
    });
  }

  void _exitShorts() {
    AppVideoPlayer.releaseActive();
    final target = _previousIndex == 2 ? 0 : _previousIndex;
    setState(() {
      _visitedTabs.add(target);
      _currentIndex = target;
    });
  }

  void _openCreateShortScreen() {
    CreatePostScreen.open(
      context,
      feedController: widget.feedController,
      authController: widget.authController,
      tagsController: _tagsController,
      openVideoPickerOnStart: true,
    );
  }

  void _openCreateScreen() {
    CreatePostScreen.open(
      context,
      feedController: widget.feedController,
      authController: widget.authController,
      tagsController: _tagsController,
    );
  }

  void _openPostDetail(String postId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PostDetailScreen(
          postId: postId,
          feedController: widget.feedController,
          authController: widget.authController,
          onAuthorTap: _openAuthorProfile,
        ),
      ),
    );
  }

  void _openAuthorProfile(Author author) {
    if (author.handle == widget.authController.currentUser.handle) {
      _onTabSelected(3);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProfileScreen(
          feedController: widget.feedController,
          authController: widget.authController,
          themeController: widget.themeController,
          messagesController: widget.messagesController,
          targetAuthor: author,
          onPostTap: _openPostDetail,
          onAuthorTap: _openAuthorProfile,
        ),
      ),
    );
  }

  void _openMessages() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MessagesScreen(controller: widget.messagesController),
      ),
    );
  }

  void _openNotifications() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            NotificationsScreen(controller: widget.notificationsController),
      ),
    );
  }

  void _openPricing() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PricingScreen(
          repository:
              PricingRepository(apiClient: widget.authController.apiClient),
        ),
      ),
    );
  }

  Widget _buildTabScreen(int index) {
    switch (index) {
      case 0:
        return FeedScreen(
          feedController: widget.feedController,
          authController: widget.authController,
          themeController: widget.themeController,
          messagesController: widget.messagesController,
          notificationsController: widget.notificationsController,
          tagsController: _tagsController,
          onNotificationsTap: _openNotifications,
          onAvatarMenuTap: () => _scaffoldKey.currentState?.openEndDrawer(),
          onPostTap: _openPostDetail,
          onAuthorTap: _openAuthorProfile,
        );
      case 1:
        return ExploreScreen(
          feedController: widget.feedController,
          authController: widget.authController,
          onPostTap: _openPostDetail,
          onAuthorTap: _openAuthorProfile,
        );
      case 2:
        return ShortsScreen(
          feedController: widget.feedController,
          authController: widget.authController,
          tagsController: _tagsController,
          isTabActive: _currentIndex == 2,
          onBack: _exitShorts,
          onCreateShort: _openCreateShortScreen,
          onPostTap: _openPostDetail,
          onAuthorTap: _openAuthorProfile,
        );
      case 3:
      default:
        return ProfileScreen(
          feedController: widget.feedController,
          authController: widget.authController,
          themeController: widget.themeController,
          messagesController: widget.messagesController,
          onPostTap: _openPostDetail,
          onAuthorTap: _openAuthorProfile,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.paddingOf(context).bottom;
    final isShortsTab = _currentIndex == 2;

    return PopScope(
      canPop: !isShortsTab,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _currentIndex == 2) _exitShorts();
      },
      child: Scaffold(
        key: _scaffoldKey,
        extendBody: false,
        endDrawer: MainShellDrawer(
          currentIndex: _currentIndex,
          isDark: isDark,
          authController: widget.authController,
          feedController: widget.feedController,
          themeController: widget.themeController,
          messagesController: widget.messagesController,
          onSelectTab: _onTabSelected,
          onOpenMessages: _openMessages,
          onOpenPricing: _openPricing,
          onOpenPostDetail: _openPostDetail,
          onOpenAuthorProfile: _openAuthorProfile,
        ),
        body: Stack(
          fit: StackFit.expand,
          children: List.generate(4, (i) {
            if (!_visitedTabs.contains(i)) {
              return const SizedBox.shrink();
            }
            final isActive = i == _currentIndex;
            final isOffstage = !isActive && i != _settledIndex;
            return Offstage(
              offstage: isOffstage,
              child: IgnorePointer(
                ignoring: !isActive,
                child: TickerMode(
                  enabled: isActive,
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    opacity: isActive ? 1.0 : 0.0,
                    onEnd: () {
                      if (isActive && _settledIndex != _currentIndex && mounted) {
                        setState(() => _settledIndex = _currentIndex);
                      }
                    },
                    child: _buildTabScreen(i),
                  ),
                ),
              ),
            );
          }),
        ),
        bottomNavigationBar: isShortsTab
            ? null
            : MainBottomNav(
                currentIndex: _currentIndex,
                isDark: isDark,
                bottomPadding: bottomPadding,
                authController: widget.authController,
                onSelectTab: _onTabSelected,
                onCreateTap: _openCreateScreen,
              ),
      ),
    );
  }
}
