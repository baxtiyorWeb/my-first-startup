import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_media_image.dart';
import '../../../../core/widgets/app_video_player.dart';
import '../../../../core/widgets/media_lightbox.dart';
import '../../models/post.dart';

/// Renders video preview, media image preview, and external project link banner
/// for a feed post card.
class PostMediaSection extends StatelessWidget {
  final Post post;
  final bool isDark;

  const PostMediaSection({
    super.key,
    required this.post,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (post.videoUrl != null && post.videoUrl!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
            child: AppVideoPlayer(
              url: post.videoUrl!,
              posterUrl: post.mediaUrls.isNotEmpty ? post.mediaUrls.first : null,
              durationSeconds: post.videoDurationSeconds,
              height: 220,
              borderRadius: 14,
            ),
          ),
        if (post.mediaUrls.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
            child: GestureDetector(
              onTap: () => MediaLightbox.show(context, urls: post.mediaUrls),
              child: Container(
                width: double.infinity,
                height: 170,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: isDark
                      ? AppColors.surfaceDarkElevated
                      : AppColors.surfaceLightElevated,
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppMediaImage(
                      source: post.mediaUrls.first,
                      fit: BoxFit.cover,
                    ),
                    if (post.mediaUrls.length > 1)
                      Positioned(
                        right: 8,
                        bottom: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withAlpha(160),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '+${post.mediaUrls.length - 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        if (post.projectUrl != null && post.projectUrl!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 2),
            child: InkWell(
              onTap: () {
                Clipboard.setData(ClipboardData(text: post.projectUrl!));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Havola nusxalandi: ${post.projectUrl}'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.surfaceDarkElevated
                      : AppColors.surfaceLightElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.open_in_new_rounded,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        post.projectUrl!.replaceAll(
                          RegExp(r'^https?://(www\.)?'),
                          '',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.north_east_rounded,
                      size: 16,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
