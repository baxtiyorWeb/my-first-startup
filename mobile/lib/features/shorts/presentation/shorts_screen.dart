import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_state.dart';
import '../../auth/data/auth_controller.dart';
import '../../feed/data/feed_controller.dart';
import '../../feed/models/author.dart';
import '../../feed/models/post.dart';
import '../../feed/presentation/create_post_screen.dart';
import '../../search/presentation/search_screen.dart';
import '../../tags/data/tags_controller.dart';
import 'widgets/short_page_card.dart';
import 'widgets/shorts_options_sheet.dart';
import 'widgets/shorts_top_header.dart';

/// Full-bleed vertical Shorts screen without bottom navigation bar.
class ShortsScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final TagsController? tagsController;
  final bool isTabActive;
  final VoidCallback? onBack;
  final VoidCallback? onCreateShort;
  final ValueChanged<String>? onPostTap;
  final ValueChanged<Author>? onAuthorTap;

  const ShortsScreen({
    super.key,
    required this.feedController,
    required this.authController,
    this.tagsController,
    this.isTabActive = true,
    this.onBack,
    this.onCreateShort,
    this.onPostTap,
    this.onAuthorTap,
  });

  @override
  State<ShortsScreen> createState() => _ShortsScreenState();
}

class _ShortsScreenState extends State<ShortsScreen> {
  static const List<String> _filters = [
    'Siz uchun',
    'Trend',
    'Texnologiya',
    'Dasturlash',
  ];

  static const List<double> _speedCycle = [1.0, 1.5, 2.0, 0.75];

  final PageController _pageController = PageController();
  final Set<String> _recordedViews = {};
  String _selectedFilter = 'Siz uchun';
  int _activePage = 0;
  bool _isMuted = false;
  double _playbackSpeed = 1.0;
  bool _autoAdvance = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        widget.feedController.loadShorts(filter: _mapFilter(_selectedFilter));
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  String _mapFilter(String label) {
    switch (label) {
      case 'Trend':
        return 'trending';
      case 'Texnologiya':
        return 'tech';
      case 'Dasturlash':
        return 'dev';
      default:
        return 'for_you';
    }
  }

  void _cycleSpeed() {
    final idx = _speedCycle.indexOf(_playbackSpeed);
    final next = _speedCycle[(idx + 1) % _speedCycle.length];
    setState(() => _playbackSpeed = next);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Ijro tezligi: ${ShortsOptionsSheet.formatSpeed(next)}'),
          duration: const Duration(milliseconds: 900),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  void _advanceToNextShort(int totalCount) {
    if (_activePage + 1 >= totalCount || !_pageController.hasClients) return;
    _pageController.nextPage(
      duration: const Duration(milliseconds: 340),
      curve: Curves.easeOutCubic,
    );
  }

  List<Post> _resolveShorts() {
    if (widget.feedController.shorts.isNotEmpty) {
      return widget.feedController.shorts;
    }
    return widget.feedController.posts.where((p) => p.isShort).toList();
  }

  void _selectFilter(String filter) {
    if (_selectedFilter == filter) return;
    setState(() {
      _selectedFilter = filter;
      _activePage = 0;
    });
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
    widget.feedController.loadShorts(filter: _mapFilter(filter));
  }

  void _openSearch({String? initialQuery}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SearchScreen(
          feedController: widget.feedController,
          authController: widget.authController,
          tagsController: widget.tagsController,
          initialQuery: initialQuery,
          onPostTap: (id) => widget.onPostTap?.call(id),
          onAuthorTap: (author) => widget.onAuthorTap?.call(author),
        ),
      ),
    );
  }

  void _openCreateShort() {
    if (widget.onCreateShort != null) {
      widget.onCreateShort!();
      return;
    }
    CreatePostScreen.open(
      context,
      feedController: widget.feedController,
      authController: widget.authController,
      tagsController: widget.tagsController,
      openVideoPickerOnStart: true,
    );
  }

  void _handleBack() {
    if (widget.onBack != null) {
      widget.onBack!();
    } else {
      Navigator.of(context).maybePop();
    }
  }

  bool _isOwnPost(Post post) {
    final user = widget.authController.currentUser;
    return post.author.id == user.id || post.author.handle == user.handle;
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.paddingOf(context).top;
    final canGoBack = widget.onBack != null || Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: ListenableBuilder(
        listenable: widget.feedController,
        builder: (context, _) {
          final isLoading = widget.feedController.isShortsLoading &&
              widget.feedController.shorts.isEmpty;
          final shorts = _resolveShorts();

          if (isLoading) {
            return Stack(
              children: [
                const Center(child: CircularProgressIndicator(color: Colors.white)),
                _header(topPadding, canGoBack),
              ],
            );
          }

          if (shorts.isEmpty) {
            return Stack(
              children: [
                Center(
                  child: EmptyStateWidget(
                    icon: Icons.smart_display_outlined,
                    title: 'Hozircha Shorts yo\'q',
                    description: '60 soniyagacha bo\'lgan videolar shu yerda chiqadi.',
                    actionText: 'Qayta yuklash',
                    onAction: () => widget.feedController.loadShorts(
                      filter: _mapFilter(_selectedFilter),
                      forceRefresh: true,
                    ),
                  ),
                ),
                _header(topPadding, canGoBack),
              ],
            );
          }

          final currentIndex = _activePage.clamp(0, shorts.length - 1);
          final currentPost = shorts[currentIndex];
          if (_recordedViews.add(currentPost.id)) {
            widget.feedController.recordView(currentPost.id);
          }

          return Stack(
            children: [
              RefreshIndicator(
                onRefresh: () => widget.feedController.loadShorts(
                  filter: _mapFilter(_selectedFilter),
                  forceRefresh: true,
                ),
                color: AppColors.primary,
                edgeOffset: topPadding + 56,
                child: PageView.builder(
                  controller: _pageController,
                  scrollDirection: Axis.vertical,
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  itemCount: shorts.length,
                  onPageChanged: (index) {
                    setState(() => _activePage = index);
                    if (index >= shorts.length - 3 &&
                        widget.feedController.hasMoreShorts) {
                      widget.feedController.loadMoreShorts();
                    }
                  },
                  itemBuilder: (context, index) {
                    final post = shorts[index];
                    return ShortPageCard(
                      key: ValueKey('short_${post.id}'),
                      post: post,
                      isActive: widget.isTabActive && index == currentIndex,
                      isMuted: _isMuted,
                      playbackSpeed: _playbackSpeed,
                      autoAdvance: _autoAdvance,
                      speedLabel: ShortsOptionsSheet.formatSpeed(_playbackSpeed),
                      onToggleMute: () => setState(() => _isMuted = !_isMuted),
                      onCycleSpeed: _cycleSpeed,
                      onVideoCompleted: () => _advanceToNextShort(shorts.length),
                      onTagTap: (tag) => _openSearch(initialQuery: tag),
                      feedController: widget.feedController,
                      authController: widget.authController,
                      onPostTap: () => widget.onPostTap?.call(post.id),
                      onAuthorTap: () => widget.onAuthorTap?.call(post.author),
                    );
                  },
                ),
              ),
              _header(topPadding, canGoBack, currentPost: currentPost),
            ],
          );
        },
      ),
    );
  }

  Widget _header(double topPadding, bool canGoBack, {Post? currentPost}) {
    return ShortsTopHeader(
      topPadding: topPadding,
      filters: _filters,
      selectedFilter: _selectedFilter,
      canGoBack: canGoBack,
      currentPost: currentPost,
      onBack: _handleBack,
      onCreateShort: _openCreateShort,
      onSearch: () => _openSearch(),
      onSelectFilter: _selectFilter,
      onOpenOptions: (post) => ShortsOptionsSheet.show(
        context,
        post: post,
        isOwnPost: _isOwnPost(post),
        initialSpeed: _playbackSpeed,
        initialAutoAdvance: _autoAdvance,
        onSpeedChanged: (s) => setState(() => _playbackSpeed = s),
        onAutoAdvanceChanged: (v) => setState(() => _autoAdvance = v),
        feedController: widget.feedController,
        authController: widget.authController,
        onPostTap: widget.onPostTap,
      ),
    );
  }
}
