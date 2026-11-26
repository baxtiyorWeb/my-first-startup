import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../auth/data/auth_controller.dart';
import '../../../feed/data/feed_controller.dart';
import '../../../feed/models/post.dart';
import '../../../feed/presentation/widgets/discussion_bottom_sheet.dart';
import '../../../feed/presentation/widgets/post_action_bar.dart';

class ShortActionRail extends StatelessWidget {
  final Post post;
  final bool isOwn;
  final bool isMuted;
  final String speedLabel;
  final FeedController feedController;
  final AuthController authController;
  final VoidCallback onAuthorTap;
  final VoidCallback onCycleSpeed;
  final VoidCallback onToggleMute;

  const ShortActionRail({
    super.key,
    required this.post,
    required this.isOwn,
    required this.isMuted,
    required this.speedLabel,
    required this.feedController,
    required this.authController,
    required this.onAuthorTap,
    required this.onCycleSpeed,
    required this.onToggleMute,
  });

  @override
  Widget build(BuildContext context) {
    final resolved = feedController.resolvePost(post);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.bottomCenter,
          children: [
            GestureDetector(
              onTap: onAuthorTap,
              child: Container(
                padding: const EdgeInsets.all(2.2),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.primary, AppColors.info, AppColors.purple],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black45,
                      blurRadius: 10,
                      offset: Offset(0, 3),
                    ),
                  ],
                ),
                child: Container(
                  padding: const EdgeInsets.all(1.5),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black,
                  ),
                  child: AppAvatar(
                    imageUrl: resolved.author.avatarUrl,
                    name: resolved.author.name,
                    size: 44,
                  ),
                ),
              ),
            ),
            if (!isOwn)
              Positioned(
                bottom: -8,
                child: GestureDetector(
                  onTap: () =>
                      feedController.toggleFollowAuthor(resolved.author.handle),
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: resolved.author.isFollowing
                          ? AppColors.success
                          : AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.black, width: 1.5),
                    ),
                    child: Icon(
                      resolved.author.isFollowing
                          ? Icons.check_rounded
                          : Icons.add_rounded,
                      color: AppColors.onPrimary,
                      size: 14,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),
        _RailActionButton(
          icon: resolved.isLiked
              ? Icons.favorite_rounded
              : Icons.favorite_border_rounded,
          iconColor: resolved.isLiked ? AppColors.like : Colors.white,
          label: NumberFormatter.compact(resolved.likesCount),
          onTap: () => feedController.toggleLike(resolved.id),
        ),
        const SizedBox(height: 12),
        _RailActionButton(
          icon: Icons.chat_bubble_outline_rounded,
          label: NumberFormatter.compact(resolved.commentsCount),
          onTap: () => DiscussionBottomSheet.show(
            context,
            post: resolved,
            feedController: feedController,
            currentAuthor: authController.currentAuthor,
          ),
        ),
        const SizedBox(height: 12),
        _RailActionButton(
          icon: resolved.isSaved
              ? Icons.bookmark_rounded
              : Icons.bookmark_border_rounded,
          iconColor: resolved.isSaved ? AppColors.primaryLight : Colors.white,
          label: resolved.isSaved ? 'Saqlandi' : 'Saqlash',
          onTap: () => SocialActionFeedback.toggleBookmark(
            context,
            feedController,
            resolved,
          ),
        ),
        const SizedBox(height: 12),
        _RailActionButton(
          icon: Icons.reply_rounded,
          label: resolved.sharesCount > 0
              ? NumberFormatter.compact(resolved.sharesCount)
              : 'Ulashish',
          onTap: () => SocialActionFeedback.share(
            context,
            feedController,
            resolved,
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: onCycleSpeed,
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withAlpha(135),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.white.withAlpha(70)),
            ),
            child: Text(
              speedLabel,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _RailActionButton(
          icon: isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
          iconColor: Colors.white,
          label: '',
          onTap: onToggleMute,
        ),
      ],
    );
  }
}

class _RailActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color iconColor;
  final VoidCallback onTap;

  const _RailActionButton({
    required this.icon,
    required this.label,
    this.iconColor = Colors.white,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: iconColor,
            size: 27,
            shadows: const [Shadow(color: Colors.black54, blurRadius: 8)],
          ),
          if (label.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                shadows: [Shadow(color: Colors.black54, blurRadius: 6)],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
