import 'dart:typed_data';
import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';
import '../../theme/app_colors.dart';
import '../app_media_image.dart';

class VideoSurface extends StatelessWidget {
  final VideoPlayerController controller;
  final bool fillContainer;

  const VideoSurface({
    super.key,
    required this.controller,
    required this.fillContainer,
  });

  @override
  Widget build(BuildContext context) {
    if (fillContainer) {
      final size = controller.value.size;
      return SizedBox.expand(
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: size.width > 0 ? size.width : 9,
            height: size.height > 0 ? size.height : 16,
            child: VideoPlayer(controller),
          ),
        ),
      );
    }
    final aspectRatio =
        controller.value.aspectRatio > 0 ? controller.value.aspectRatio : 16 / 9;
    return Center(
      child: AspectRatio(aspectRatio: aspectRatio, child: VideoPlayer(controller)),
    );
  }
}

class VideoFrameShell extends StatelessWidget {
  final bool fillContainer;
  final double? height;
  final double borderRadius;
  final Widget child;

  const VideoFrameShell({
    super.key,
    required this.fillContainer,
    required this.height,
    required this.borderRadius,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (fillContainer) {
      return borderRadius > 0
          ? ClipRRect(borderRadius: BorderRadius.circular(borderRadius), child: child)
          : child;
    }
    return Container(
      width: double.infinity,
      height: height ?? 220,
      decoration: BoxDecoration(
        color: const Color(0xFF000000),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}

class VideoPosterBackdrop extends StatelessWidget {
  final String? posterUrl;
  final Uint8List? thumbnailBytes;

  const VideoPosterBackdrop({
    super.key,
    required this.posterUrl,
    required this.thumbnailBytes,
  });

  @override
  Widget build(BuildContext context) {
    if (posterUrl != null && posterUrl!.isNotEmpty) {
      return AppMediaImage(source: posterUrl!, fit: BoxFit.cover);
    }
    if (thumbnailBytes != null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          Image.memory(
            thumbnailBytes!,
            fit: BoxFit.cover,
            gaplessPlayback: true,
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withAlpha(35),
                  Colors.transparent,
                  Colors.black.withAlpha(90),
                ],
              ),
            ),
          ),
        ],
      );
    }
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F1419),
            Color(0xFF2F3336),
            Color(0xFF000000),
          ],
        ),
      ),
    );
  }
}

class VideoCenterOverlay extends StatelessWidget {
  final bool isLoading;
  final bool hasError;
  final bool showPlayButton;

  const VideoCenterOverlay({
    super.key,
    required this.isLoading,
    required this.hasError,
    required this.showPlayButton,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: Colors.white,
          strokeWidth: 2.5,
        ),
      );
    }
    if (hasError) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withAlpha(140),
                border: Border.all(color: Colors.white.withAlpha(80)),
              ),
              child: const Icon(
                Icons.refresh_rounded,
                color: Colors.white,
                size: 26,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Videoni yuklashda xatolik · Qayta urinish',
              style: TextStyle(
                color: Colors.white,
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }
    if (!showPlayButton) return const SizedBox.shrink();

    return Center(
      child: Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.black.withAlpha(125),
          border: Border.all(color: Colors.white.withAlpha(90)),
        ),
        child: const Icon(
          Icons.play_arrow_rounded,
          color: Colors.white,
          size: 36,
        ),
      ),
    );
  }
}

class VideoHeartBurst extends StatelessWidget {
  final bool visible;

  const VideoHeartBurst({super.key, required this.visible});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: AnimatedScale(
          scale: visible ? 1.15 : 0.0,
          duration: const Duration(milliseconds: 220),
          curve: Curves.elasticOut,
          child: AnimatedOpacity(
            opacity: visible ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 180),
            child: const Icon(
              Icons.favorite_rounded,
              color: AppColors.like,
              size: 86,
              shadows: [Shadow(color: Colors.black45, blurRadius: 16)],
            ),
          ),
        ),
      ),
    );
  }
}
