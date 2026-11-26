import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';

class VideoTimelineBar extends StatefulWidget {
  final VideoPlayerController controller;
  final int? fallbackDurationSeconds;
  final Color activeColor;
  final bool showInlineTime;

  const VideoTimelineBar({
    super.key,
    required this.controller,
    required this.fallbackDurationSeconds,
    required this.activeColor,
    required this.showInlineTime,
  });

  @override
  State<VideoTimelineBar> createState() => _VideoTimelineBarState();
}

class _VideoTimelineBarState extends State<VideoTimelineBar> {
  bool _isDragging = false;
  double? _dragFraction;

  String _formatClock(Duration d) {
    final total = d.inSeconds.clamp(0, 86400);
    final mins = total ~/ 60;
    final secs = total % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  void _seekFromDx(double dx, double width) {
    if (width <= 0) return;
    final fraction = (dx / width).clamp(0.0, 1.0);
    setState(() => _dragFraction = fraction);

    final totalMs = _resolvedDuration().inMilliseconds;
    if (totalMs > 0) {
      widget.controller.seekTo(
        Duration(milliseconds: (totalMs * fraction).round()),
      );
    }
  }

  Duration _resolvedDuration() {
    final ctrlDur = widget.controller.value.duration;
    if (ctrlDur.inMilliseconds > 0) return ctrlDur;
    final fallback = widget.fallbackDurationSeconds ?? 0;
    return Duration(seconds: fallback > 0 ? fallback : 0);
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<VideoPlayerValue>(
      valueListenable: widget.controller,
      builder: (context, value, _) {
        final duration = _resolvedDuration();
        final totalMs = duration.inMilliseconds;
        final posMs =
            value.position.inMilliseconds.clamp(0, totalMs > 0 ? totalMs : 0);
        final progress = _dragFraction ??
            (totalMs > 0 ? (posMs / totalMs).clamp(0.0, 1.0) : 0.0);

        int bufferedMs = 0;
        for (final range in value.buffered) {
          if (range.end.inMilliseconds > bufferedMs) {
            bufferedMs = range.end.inMilliseconds;
          }
        }
        final bufferedProgress =
            totalMs > 0 ? (bufferedMs / totalMs).clamp(0.0, 1.0) : 0.0;

        final displayPosition = totalMs > 0
            ? Duration(milliseconds: (totalMs * progress).round())
            : Duration.zero;
        final timeLabel =
            '${_formatClock(displayPosition)} / ${_formatClock(duration)}';

        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!widget.showInlineTime && _isDragging)
              Center(
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(190),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withAlpha(45)),
                  ),
                  child: Text(
                    timeLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ),
            Row(
              children: [
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final width = constraints.maxWidth;
                      final thumbSize = _isDragging ? 14.0 : 8.0;
                      final trackHeight = _isDragging ? 5.5 : 3.0;
                      final activeWidth = width * progress;
                      final bufferedWidth = width * bufferedProgress;

                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTapDown: (d) => _seekFromDx(d.localPosition.dx, width),
                        onHorizontalDragStart: (d) {
                          setState(() => _isDragging = true);
                          _seekFromDx(d.localPosition.dx, width);
                        },
                        onHorizontalDragUpdate: (d) =>
                            _seekFromDx(d.localPosition.dx, width),
                        onHorizontalDragEnd: (_) {
                          setState(() {
                            _isDragging = false;
                            _dragFraction = null;
                          });
                        },
                        onHorizontalDragCancel: () {
                          setState(() {
                            _isDragging = false;
                            _dragFraction = null;
                          });
                        },
                        child: SizedBox(
                          height: 22,
                          child: Stack(
                            alignment: Alignment.centerLeft,
                            children: [
                              Container(
                                height: trackHeight,
                                width: width,
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(65),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                              ),
                              Container(
                                height: trackHeight,
                                width: bufferedWidth,
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(115),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                              ),
                              Container(
                                height: trackHeight,
                                width: activeWidth,
                                decoration: BoxDecoration(
                                  color: widget.activeColor,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                              ),
                              Positioned(
                                left: (activeWidth - thumbSize / 2).clamp(
                                  0.0,
                                  (width - thumbSize).clamp(0.0, width),
                                ),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 120),
                                  width: thumbSize,
                                  height: thumbSize,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: widget.activeColor.withAlpha(200),
                                      width: 1.5,
                                    ),
                                    boxShadow: const [
                                      BoxShadow(
                                        color: Colors.black38,
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                if (widget.showInlineTime) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withAlpha(155),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      timeLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        );
      },
    );
  }
}
