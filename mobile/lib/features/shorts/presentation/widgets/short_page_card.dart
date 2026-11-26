import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/app_media_image.dart';
import '../../../../core/widgets/app_video_player.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../../auth/data/auth_controller.dart';
import '../../../feed/data/feed_controller.dart';
import '../../../feed/models/post.dart';
import 'short_action_rail.dart';

class ShortPageCard extends StatefulWidget {
  final Post post;
  final bool isActive;
  final bool isMuted;
  final double playbackSpeed;
  final bool autoAdvance;
  final String speedLabel;
  final VoidCallback onToggleMute;
  final VoidCallback onCycleSpeed;
  final VoidCallback onVideoCompleted;
  final ValueChanged<String> onTagTap;
  final FeedController feedController;
  final AuthController authController;
  final VoidCallback onPostTap;
  final VoidCallback onAuthorTap;

  const ShortPageCard({
    super.key,
    required this.post,
    required this.isActive,
    required this.isMuted,
    required this.playbackSpeed,
    required this.autoAdvance,
    required this.speedLabel,
    required this.onToggleMute,
    required this.onCycleSpeed,
    required this.onVideoCompleted,
    required this.onTagTap,
    required this.feedController,
    required this.authController,
    required this.onPostTap,
    required this.onAuthorTap,
  });

  @override
  State<ShortPageCard> createState() => _ShortPageCardState();
}

class _ShortPageCardState extends State<ShortPageCard> {
  bool _captionExpanded = false;

  @override
  Widget build(BuildContext context) {
    final resolved = widget.feedController.resolvePost(widget.post);
    final cleanContent = ContentUtils.stripHtml(resolved.content);
    final title = (resolved.title ?? '').trim();
    final captionText = title.isNotEmpty && cleanContent.isNotEmpty
        ? '$title — $cleanContent'
        : (title.isNotEmpty ? title : cleanContent);
    final isOwn = resolved.author.id == widget.authController.currentUser.id ||
        resolved.author.handle == widget.authController.currentUser.handle;
    final bottomPadding = MediaQuery.paddingOf(context).bottom;

    return RepaintBoundary(
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (resolved.videoUrl != null && resolved.videoUrl!.isNotEmpty)
            AppVideoPlayer(
              url: resolved.videoUrl!,
              posterUrl: resolved.mediaUrls.isNotEmpty ? resolved.mediaUrls.first : null,
              durationSeconds: resolved.videoDurationSeconds,
              isActive: widget.isActive,
              muted: widget.isMuted,
              playbackSpeed: widget.playbackSpeed,
              showShortsTimeline: true,
              shortsTimelineBottomOffset: bottomPadding + 6,
              autoPlay: true,
              looping: !widget.autoAdvance,
              fillContainer: true,
              borderRadius: 0,
              onCompleted: widget.autoAdvance ? widget.onVideoCompleted : null,
              onDoubleTap: () {
                if (!resolved.isLiked) {
                  widget.feedController.toggleLike(resolved.id);
                }
              },
            )
          else if (resolved.mediaUrls.isNotEmpty)
            AppMediaImage(source: resolved.mediaUrls.first, fit: BoxFit.cover)
          else
            const _FallbackBackdrop(),
          IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: const [0.0, 0.24, 0.64, 1.0],
                  colors: [
                    Colors.black.withAlpha(165),
                    Colors.transparent,
                    Colors.black.withAlpha(115),
                    Colors.black.withAlpha(232),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 84,
            bottom: bottomPadding + 34,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: GestureDetector(
                        onTap: widget.onAuthorTap,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Text(
                                    resolved.author.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                if (resolved.author.verified) ...[
                                  const SizedBox(width: 4),
                                  const VerifiedBadge(size: 14),
                                ],
                              ],
                            ),
                            Text(
                              '${resolved.author.formattedHandle} · ${NumberFormatter.compact(resolved.viewsCount)} ko\'rish',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: Colors.white.withAlpha(190),
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (!isOwn) ...[
                      const SizedBox(width: 10),
                      GestureDetector(
                        onTap: () => widget.feedController
                            .toggleFollowAuthor(resolved.author.handle),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: resolved.author.isFollowing
                                ? Colors.white.withAlpha(32)
                                : AppColors.primary,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: resolved.author.isFollowing
                                  ? Colors.white.withAlpha(65)
                                  : Colors.transparent,
                            ),
                          ),
                          child: Text(
                            resolved.author.isFollowing
                                ? 'Kuzatilmoqda'
                                : 'Kuzatish',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (captionText.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () {
                      if (captionText.length > 90) {
                        setState(() => _captionExpanded = !_captionExpanded);
                      } else {
                        widget.onPostTap();
                      }
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          captionText,
                          maxLines: _captionExpanded ? 8 : 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                          ),
                        ),
                        if (captionText.length > 90)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              _captionExpanded ? 'Yashirish' : 'Ko\'proq',
                              style: TextStyle(
                                color: Colors.white.withAlpha(195),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    GestureDetector(
                      onTap: widget.onPostTap,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4.5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(215),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              resolved.isProject ||
                                      (resolved.projectUrl?.isNotEmpty ?? false)
                                  ? 'Loyihani ko\'rish'
                                  : 'Batafsil',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 3),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              color: Colors.white,
                              size: 13,
                            ),
                          ],
                        ),
                      ),
                    ),
                    ...resolved.tags.take(3).map((tag) {
                      return GestureDetector(
                        onTap: () => widget.onTagTap(tag),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(28),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: Colors.white.withAlpha(24),
                            ),
                          ),
                          child: Text(
                            '#$tag',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            right: 12,
            bottom: bottomPadding + 40,
            child: ShortActionRail(
              post: resolved,
              isOwn: isOwn,
              isMuted: widget.isMuted,
              speedLabel: widget.speedLabel,
              feedController: widget.feedController,
              authController: widget.authController,
              onAuthorTap: widget.onAuthorTap,
              onCycleSpeed: widget.onCycleSpeed,
              onToggleMute: widget.onToggleMute,
            ),
          ),
        ],
      ),
    );
  }
}

class _FallbackBackdrop extends StatelessWidget {
  const _FallbackBackdrop();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0A1224), Color(0xFF101D38), Color(0xFF070A12)],
        ),
      ),
      child: Center(
        child: Container(
          width: 78,
          height: 78,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withAlpha(20),
            border: Border.all(color: Colors.white.withAlpha(45), width: 1.2),
          ),
          child: const Icon(
            Icons.play_arrow_rounded,
            color: Colors.white,
            size: 42,
          ),
        ),
      ),
    );
  }
}
