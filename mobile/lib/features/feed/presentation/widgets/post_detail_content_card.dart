import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/intent_mapper.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/app_media_image.dart';
import '../../../../core/widgets/app_video_player.dart';
import '../../../../core/widgets/badge_chip.dart';
import '../../../../core/widgets/media_lightbox.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../../auth/data/auth_controller.dart';
import '../../data/feed_controller.dart';
import '../../models/author.dart';
import '../../models/post.dart';
import 'post_action_bar.dart';

class PostDetailContentCard extends StatelessWidget {
  final Post post;
  final FeedController feedController;
  final AuthController authController;
  final ValueChanged<Author>? onAuthorTap;
  final ValueChanged<String>? onTagTap;
  final VoidCallback onCommentTap;

  const PostDetailContentCard({
    super.key,
    required this.post,
    required this.feedController,
    required this.authController,
    this.onAuthorTap,
    this.onTagTap,
    required this.onCommentTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fallbackTags = post.tagItems.isEmpty
        ? ContentUtils.extractDisplayTags(
            explicitTags: post.tags,
            content: post.content,
            topic: post.topic,
            projectStage: post.projectStage,
          )
        : const <String>[];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => onAuthorTap?.call(post.author),
            child: Row(
              children: [
                AppAvatar(
                  imageUrl: post.author.avatarUrl,
                  name: post.author.name,
                  size: 44,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              post.author.name,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? AppColors.textPrimaryDark
                                    : AppColors.textPrimaryLight,
                              ),
                            ),
                          ),
                          if (post.author.verified) ...[
                            const SizedBox(width: 4),
                            const VerifiedBadge(size: 16),
                          ],
                        ],
                      ),
                      Text(
                        '${post.author.formattedHandle} · ${post.author.role}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                if (post.author.id != authController.currentUser.id)
                  TextButton(
                    onPressed: () =>
                        feedController.toggleFollowAuthor(post.author.handle),
                    style: TextButton.styleFrom(
                      backgroundColor: post.author.isFollowing
                          ? (isDark
                              ? AppColors.surfaceDarkSubtle
                              : AppColors.surfaceLightElevated)
                          : AppColors.primary,
                      foregroundColor: post.author.isFollowing
                          ? (isDark
                              ? AppColors.textSecondaryDark
                              : AppColors.textPrimaryLight)
                          : Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Text(
                      post.author.isFollowing ? 'Kuzatilmoqda' : 'Kuzatish',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (post.title != null && post.title!.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              post.title!,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                height: 1.3,
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
              ),
            ),
          ],
          const SizedBox(height: 10),
          SelectableText(
            ContentUtils.stripHtml(post.content),
            style: TextStyle(
              fontSize: 14.5,
              height: 1.6,
              color: isDark
                  ? AppColors.textSecondaryDark
                  : AppColors.textSecondaryLight,
            ),
          ),
          if (post.isProject) _DetailProjectBanner(post: post, isDark: isDark),
          if (post.videoUrl != null && post.videoUrl!.isNotEmpty) ...[
            const SizedBox(height: 14),
            AppVideoPlayer(
              url: post.videoUrl!,
              posterUrl:
                  post.mediaUrls.isNotEmpty ? post.mediaUrls.first : null,
              durationSeconds: post.videoDurationSeconds,
              height: 240,
              borderRadius: 12,
            ),
          ],
          if (post.mediaUrls.isNotEmpty) ...[
            const SizedBox(height: 14),
            ...post.mediaUrls.asMap().entries.map((entry) {
              return Padding(
                padding: EdgeInsets.only(top: entry.key > 0 ? 8 : 0),
                child: GestureDetector(
                  onTap: () => MediaLightbox.show(
                    context,
                    urls: post.mediaUrls,
                    initialIndex: entry.key,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AppMediaImage(
                      source: entry.value,
                      width: double.infinity,
                      height: 220,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              );
            }),
          ],
          if (post.tagItems.isNotEmpty || fallbackTags.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: post.tagItems.isNotEmpty
                  ? post.tagItems
                      .map((t) {
                        final chip = BadgeChip(label: '#${t.name}');
                        return onTagTap == null
                            ? chip
                            : GestureDetector(
                                onTap: () => onTagTap!(t.slug),
                                child: chip,
                              );
                      })
                      .toList()
                  : fallbackTags
                      .map((t) {
                        final chip = BadgeChip(label: t);
                        return onTagTap == null
                            ? chip
                            : GestureDetector(
                                onTap: () => onTagTap!(t.replaceFirst('#', '')),
                                child: chip,
                              );
                      })
                      .toList(),
            ),
          ],
          const SizedBox(height: 14),
          Text(
            '${DateFormatter.formatShortDate(post.createdAt)} · ${post.readingTimeMinutes} daq o\'qish · ${NumberFormatter.compact(post.viewsCount)} ko\'rish',
            style: TextStyle(
              fontSize: 12,
              color:
                  isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: 12),
          Divider(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            height: 1,
          ),
          const SizedBox(height: 4),
          PostInlineActionBar(
            post: post,
            feedController: feedController,
            onCommentTap: onCommentTap,
            showShareCount: true,
          ),
        ],
      ),
    );
  }
}

class _DetailProjectBanner extends StatelessWidget {
  final Post post;
  final bool isDark;

  const _DetailProjectBanner({required this.post, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDarkElevated : AppColors.backgroundLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.rocket_launch_rounded,
                size: 16,
                color: AppColors.primary,
              ),
              const SizedBox(width: 6),
              const Text(
                'Startap Loyihasi',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const Spacer(),
              if (post.projectStage != null)
                BadgeChip(
                  label: DomainLabels.stageLabel(post.projectStage),
                  isSelected: true,
                ),
            ],
          ),
          if (post.lookingFor != null) ...[
            const SizedBox(height: 8),
            Text(
              'Qidirilmoqda: ${DomainLabels.lookingForLabel(post.lookingFor)}',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
              ),
            ),
          ],
          if (post.projectUrl != null && post.projectUrl!.isNotEmpty) ...[
            const SizedBox(height: 6),
            InkWell(
              onTap: () {
                Clipboard.setData(ClipboardData(text: post.projectUrl!));
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(
                      content: Text('Loyiha havolasi nusxalandi'),
                      duration: Duration(seconds: 1),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
              },
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.link_rounded, size: 15, color: AppColors.primary),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        post.projectUrl!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.primary,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
