import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';
import '../../theme/app_colors.dart';
import 'video_poster_backdrop.dart';
import 'video_timeline_bar.dart';

class VideoControlsOverlay extends StatelessWidget {
  final VideoPlayerController? controller;
  final bool isInitialized;
  final bool isLoading;
  final bool hasError;
  final bool showPlayButton;
  final bool showHeartBurst;
  final bool fillContainer;
  final bool showShortsTimeline;
  final double shortsTimelineBottomOffset;
  final bool allowMuteToggle;
  final bool effectiveMuted;
  final int? durationSeconds;
  final VoidCallback onToggleMute;

  const VideoControlsOverlay({
    super.key,
    required this.controller,
    required this.isInitialized,
    required this.isLoading,
    required this.hasError,
    required this.showPlayButton,
    required this.showHeartBurst,
    required this.fillContainer,
    required this.showShortsTimeline,
    required this.shortsTimelineBottomOffset,
    required this.allowMuteToggle,
    required this.effectiveMuted,
    required this.durationSeconds,
    required this.onToggleMute,
  });

  String _formatFallbackDuration() {
    final total = durationSeconds ?? 0;
    if (total <= 0) return '';
    final mins = total ~/ 60;
    final secs = total % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final fallbackClock = _formatFallbackDuration();

    return Stack(
      fit: StackFit.expand,
      children: [
        VideoCenterOverlay(
          isLoading: isLoading,
          hasError: hasError,
          showPlayButton: showPlayButton,
        ),
        VideoHeartBurst(visible: showHeartBurst),
        if (!fillContainer && isInitialized && allowMuteToggle)
          Positioned(
            right: 10,
            bottom: 32,
            child: GestureDetector(
              onTap: onToggleMute,
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.black.withAlpha(165),
                ),
                child: Icon(
                  effectiveMuted
                      ? Icons.volume_off_rounded
                      : Icons.volume_up_rounded,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
          ),
        if (showShortsTimeline)
          Positioned(
            left: 12,
            right: 12,
            bottom: shortsTimelineBottomOffset,
            child: isInitialized && controller != null
                ? VideoTimelineBar(
                    controller: controller!,
                    fallbackDurationSeconds: durationSeconds,
                    activeColor: Colors.white,
                    showInlineTime: false,
                  )
                : Container(
                    height: 2,
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(65),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
          ),
        if (!fillContainer)
          if (isInitialized && controller != null)
            Positioned(
              left: 10,
              right: 10,
              bottom: 4,
              child: VideoTimelineBar(
                controller: controller!,
                fallbackDurationSeconds: durationSeconds,
                activeColor: AppColors.primary,
                showInlineTime: true,
              ),
            )
          else if (fallbackClock.isNotEmpty)
            Positioned(
              right: 10,
              bottom: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 7,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(165),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  fallbackClock,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
      ],
    );
  }
}
