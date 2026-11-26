import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../models/post.dart';
import '../../data/feed_controller.dart';

/// Shared social interaction feedback handlers used across Feed, Shorts,
/// PostDetail, Bookmarks, Explore, and Search so every entry point executes
/// the exact same optimistic + queued [PostActionController] flow.
class SocialActionFeedback {
  SocialActionFeedback._();

  static Future<void> toggleBookmark(
    BuildContext context,
    FeedController feedController,
    Post post,
  ) async {
    HapticFeedback.selectionClick();
    final saved = await feedController.toggleBookmark(post.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            saved
                ? 'Saqlanganlarga qo\'shildi'
                : 'Saqlanganlardan olib tashlandi',
          ),
          duration: const Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  static Future<void> share(
    BuildContext context,
    FeedController feedController,
    Post post,
  ) async {
    final dispatch = await feedController.sharePost(post);
    if (!context.mounted) return;
    if (!dispatch.usedNativeSheet) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Post havolasi nusxalandi'),
            duration: Duration(seconds: 1),
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }
}

/// Reusable action bar rendered at the bottom of Feed cards and PostDetail cards.
class PostInlineActionBar extends StatelessWidget {
  final Post post;
  final FeedController feedController;
  final VoidCallback onCommentTap;
  final bool showViewCount;
  final bool showShareCount;

  const PostInlineActionBar({
    super.key,
    required this.post,
    required this.feedController,
    required this.onCommentTap,
    this.showViewCount = true,
    this.showShareCount = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final resolved = feedController.resolvePost(post);

    return Row(
      children: [
        _ActionButton(
          icon: resolved.isLiked ? Icons.favorite : Icons.favorite_border_rounded,
          label: '${resolved.likesCount}',
          isActive: resolved.isLiked,
          activeColor: AppColors.danger,
          onTap: () {
            HapticFeedback.selectionClick();
            feedController.toggleLike(resolved.id);
          },
        ),
        const SizedBox(width: 4),
        _ActionButton(
          icon: Icons.chat_bubble_outline_rounded,
          label: '${resolved.commentsCount}',
          onTap: onCommentTap,
        ),
        if (showViewCount) ...[
          const SizedBox(width: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              children: [
                Icon(Icons.remove_red_eye_outlined, size: 17, color: muted),
                const SizedBox(width: 5),
                Text(
                  NumberFormatter.compact(resolved.viewsCount),
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: muted,
                  ),
                ),
              ],
            ),
          ),
        ],
        const Spacer(),
        if (showShareCount || resolved.sharesCount > 0)
          _ActionButton(
            icon: Icons.reply_rounded,
            label: resolved.sharesCount > 0
                ? NumberFormatter.compact(resolved.sharesCount)
                : '',
            onTap: () => SocialActionFeedback.share(context, feedController, resolved),
          )
        else
          IconButton(
            onPressed: () =>
                SocialActionFeedback.share(context, feedController, resolved),
            icon: const Icon(Icons.reply_rounded, size: 19),
            color: muted,
            visualDensity: VisualDensity.compact,
          ),
        IconButton(
          onPressed: () =>
              SocialActionFeedback.toggleBookmark(context, feedController, resolved),
          icon: AnimatedScale(
            scale: resolved.isSaved ? 1.12 : 1.0,
            duration: const Duration(milliseconds: 140),
            child: Icon(
              resolved.isSaved ? Icons.bookmark : Icons.bookmark_border_rounded,
              size: 19,
            ),
          ),
          color: resolved.isSaved ? AppColors.primary : muted,
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final Color? activeColor;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.isActive = false,
    this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = isActive
        ? (activeColor ?? AppColors.primary)
        : (isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: isActive ? 1.12 : 1.0,
              duration: const Duration(milliseconds: 140),
              child: Icon(icon, size: 17, color: color),
            ),
            if (label.isNotEmpty) ...[
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  color: color,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
