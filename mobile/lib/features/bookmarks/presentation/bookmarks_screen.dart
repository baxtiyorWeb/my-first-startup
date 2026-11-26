import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_state.dart';
import '../../auth/data/auth_controller.dart';
import '../../feed/data/feed_controller.dart';
import '../../feed/models/author.dart';
import '../../feed/presentation/widgets/post_card.dart';

class BookmarksScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final ValueChanged<String> onPostTap;
  final ValueChanged<Author> onAuthorTap;

  const BookmarksScreen({
    super.key,
    required this.feedController,
    required this.authController,
    required this.onPostTap,
    required this.onAuthorTap,
  });

  @override
  State<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends State<BookmarksScreen> {
  @override
  void initState() {
    super.initState();
    widget.feedController.loadBookmarks();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Saqlanganlar')),
      body: ListenableBuilder(
        listenable: widget.feedController,
        builder: (context, _) {
          final saved = widget.feedController.bookmarkedPosts;
          if (widget.feedController.isBookmarksLoading && saved.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (saved.isEmpty) {
            return RefreshIndicator(
              onRefresh: () =>
                  widget.feedController.loadBookmarks(forceRefresh: true),
              color: AppColors.primary,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                children: const [
                  SizedBox(height: 120),
                  EmptyStateWidget(
                    icon: Icons.bookmark_border_rounded,
                    title: 'Saqlangan postlar yo\'q',
                    description:
                        'Lentadagi foydali fikr va loyihalarni keyin o\'qish uchun saqlab qo\'ying.',
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                widget.feedController.loadBookmarks(forceRefresh: true),
            color: AppColors.primary,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(0, 8, 0, 48),
              scrollCacheExtent: const ScrollCacheExtent.pixels(500),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              itemCount: saved.length,
              itemBuilder: (context, index) {
                final post = saved[index];
                return PostCard(
                  key: ValueKey('bookmark_${post.id}'),
                  post: post,
                  feedController: widget.feedController,
                  authController: widget.authController,
                  onPostTap: () => widget.onPostTap(post.id),
                  onAuthorTap: widget.onAuthorTap,
                );
              },
            ),
          );
        },
      ),
    );
  }
}
