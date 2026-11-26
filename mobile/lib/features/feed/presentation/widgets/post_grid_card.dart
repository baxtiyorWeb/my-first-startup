import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../data/feed_controller.dart';
import '../../models/post.dart';

class PostGridCard extends StatelessWidget {
  final Post post;
  final FeedController feedController;
  final VoidCallback onTap;

  const PostGridCard({
    super.key,
    required this.post,
    required this.feedController,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolved = feedController.resolvePost(post);
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AppAvatar(
                  imageUrl: resolved.author.avatarUrl,
                  name: resolved.author.name,
                  size: 26,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    resolved.author.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: isDark
                          ? AppColors.textPrimaryDark
                          : AppColors.textPrimaryLight,
                    ),
                  ),
                ),
                if (resolved.author.verified) const VerifiedBadge(size: 13),
              ],
            ),
            const SizedBox(height: 8),
            if (resolved.title != null)
              Text(
                resolved.title!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  height: 1.25,
                  color: isDark
                      ? AppColors.textPrimaryDark
                      : AppColors.textPrimaryLight,
                ),
              ),
            const SizedBox(height: 4),
            Expanded(
              child: Text(
                ContentUtils.stripHtml(resolved.content),
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11.5,
                  height: 1.4,
                  color: isDark
                      ? AppColors.textSecondaryDark
                      : AppColors.textSecondaryLight,
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () => feedController.toggleLike(resolved.id),
                  child: Row(
                    children: [
                      Icon(
                        resolved.isLiked ? Icons.favorite : Icons.favorite_border,
                        size: 14,
                        color: resolved.isLiked ? AppColors.danger : muted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${resolved.likesCount}',
                        style: TextStyle(
                          fontSize: 11,
                          color: resolved.isLiked ? AppColors.danger : muted,
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    Icon(
                      Icons.chat_bubble_outline,
                      size: 13,
                      color: muted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${resolved.commentsCount}',
                      style: TextStyle(
                        fontSize: 11,
                        color: muted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
