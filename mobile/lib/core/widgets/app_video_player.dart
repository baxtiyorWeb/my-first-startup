import 'dart:async';
import 'dart:typed_data';
import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';
import '../media/video_thumbnail_service.dart';
import 'video/active_video_manager.dart';
import 'video/video_controls_overlay.dart';
import 'video/video_poster_backdrop.dart';

/// Reusable network video player supporting both inline feed cards and
/// full-bleed vertical Shorts playback, interactive scrubbing timelines,
/// double-tap like burst, hold-to-pause, and safe error fallbacks.
class AppVideoPlayer extends StatefulWidget {
  final String url;
  final String? posterUrl;
  final int? durationSeconds;
  final bool isActive;
  final bool autoPlay;
  final bool looping;
  final bool fillContainer;
  final bool showShortsTimeline;
  final double shortsTimelineBottomOffset;
  final bool? muted;
  final double playbackSpeed;
  final VoidCallback? onDoubleTap;
  final VoidCallback? onCompleted;
  final double? height;
  final double borderRadius;

  const AppVideoPlayer({
    super.key,
    required this.url,
    this.posterUrl,
    this.durationSeconds,
    this.isActive = true,
    this.autoPlay = false,
    this.looping = false,
    this.fillContainer = false,
    this.showShortsTimeline = false,
    this.shortsTimelineBottomOffset = 6.0,
    this.muted,
    this.playbackSpeed = 1.0,
    this.onDoubleTap,
    this.onCompleted,
    this.height,
    this.borderRadius = 14,
  });

  static Future<void> releaseActive() => ActiveVideoManager.releaseAll();

  @override
  State<AppVideoPlayer> createState() => _AppVideoPlayerState();
}

class _AppVideoPlayerState extends State<AppVideoPlayer>
    implements ManagedVideoPlayer {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _isLoading = false;
  bool _hasError = false;
  bool _internalMuted = false;
  bool _isDisposed = false;
  bool _wasPlayingBeforeHold = false;
  bool _showHeartBurst = false;
  bool _hasNotifiedCompletion = false;
  int _initGeneration = 0;
  Timer? _heartTimer;
  Uint8List? _thumbnailBytes;

  bool get _effectiveMuted => widget.muted ?? _internalMuted;

  @override
  void initState() {
    super.initState();
    _loadThumbnailIfNeeded();
    if (widget.autoPlay && widget.isActive) {
      _initController(playOnReady: true, fromBuild: true);
    }
  }

  void _loadThumbnailIfNeeded() {
    if (widget.posterUrl != null && widget.posterUrl!.isNotEmpty) {
      _thumbnailBytes = null;
      return;
    }
    final requestedUrl = widget.url.trim();
    final cached = VideoThumbnailService.getCached(requestedUrl);
    if (cached != null) {
      _thumbnailBytes = cached;
      return;
    }
    VideoThumbnailService.getThumbnail(requestedUrl).then((bytes) {
      if (!mounted || _isDisposed) return;
      if (widget.url.trim() != requestedUrl || bytes == null) return;
      setState(() => _thumbnailBytes = bytes);
    });
  }

  @override
  void didUpdateWidget(covariant AppVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url || oldWidget.posterUrl != widget.posterUrl) {
      if (oldWidget.url != widget.url) _thumbnailBytes = null;
      _loadThumbnailIfNeeded();
    }

    if (oldWidget.url != widget.url) {
      _releaseController();
      if (widget.autoPlay && widget.isActive) {
        _initController(playOnReady: true, fromBuild: true);
      }
      return;
    }

    if (oldWidget.isActive != widget.isActive) {
      if (!widget.isActive) {
        _releaseController();
        return;
      }
      if (widget.autoPlay && _controller == null && !_isLoading) {
        _initController(playOnReady: true, fromBuild: true);
        return;
      }
    }

    final controller = _controller;
    if (controller == null || !_isInitialized) return;

    if (oldWidget.looping != widget.looping) {
      controller.setLooping(widget.looping);
    }
    if (oldWidget.muted != widget.muted) {
      controller.setVolume(_effectiveMuted ? 0.0 : 1.0);
    }
    if (oldWidget.playbackSpeed != widget.playbackSpeed) {
      controller.setPlaybackSpeed(widget.playbackSpeed).catchError((_) {});
    }
    if (oldWidget.isActive != widget.isActive && widget.isActive && widget.autoPlay) {
      controller.play();
    }
  }

  Future<void> _initController({
    bool playOnReady = false,
    bool fromBuild = false,
  }) async {
    final gen = ++_initGeneration;
    final parsed = Uri.tryParse(widget.url.trim());
    if (parsed == null || !parsed.hasScheme) {
      _isInitialized = false;
      _isLoading = false;
      _hasError = true;
      if (!fromBuild && mounted && !_isDisposed) setState(() {});
      return;
    }

    _isInitialized = false;
    _isLoading = true;
    _hasError = false;
    _hasNotifiedCompletion = false;
    if (!fromBuild && mounted && !_isDisposed) setState(() {});

    VideoPlayerController? controller;
    bool didInit = false;
    try {
      await ActiveVideoManager.activate(this);
      await _disposeLocalControllerOnly();
      if (_isDisposed || gen != _initGeneration) {
        ActiveVideoManager.unregister(this);
        return;
      }

      controller = VideoPlayerController.networkUrl(parsed);
      _controller = controller;
      controller.addListener(_onPlayerTick);

      await controller.initialize();
      didInit = true;
      if (_isDisposed || gen != _initGeneration || _controller != controller) {
        controller.removeListener(_onPlayerTick);
        if (_controller == controller) _controller = null;
        ActiveVideoManager.trackDisposal(controller.dispose());
        ActiveVideoManager.unregister(this);
        return;
      }

      await controller.setLooping(widget.looping);
      await controller.setVolume(_effectiveMuted ? 0.0 : 1.0);
      if (widget.playbackSpeed != 1.0) {
        await controller.setPlaybackSpeed(widget.playbackSpeed).catchError((_) {});
      }
      if ((playOnReady || widget.autoPlay) && widget.isActive) {
        await controller.play();
      }

      if (!mounted || _isDisposed || gen != _initGeneration) return;
      setState(() {
        _isLoading = false;
        _isInitialized = true;
        _hasError = false;
      });
    } catch (_) {
      if (controller != null) {
        controller.removeListener(_onPlayerTick);
        if (_controller == controller) _controller = null;
        if (didInit) {
          ActiveVideoManager.trackDisposal(controller.dispose());
        } else {
          controller.dispose().catchError((_) {});
        }
      }
      ActiveVideoManager.unregister(this);
      if (!mounted || _isDisposed || gen != _initGeneration) return;
      setState(() {
        _isLoading = false;
        _isInitialized = false;
        _hasError = true;
      });
    }
  }

  void _onPlayerTick() {
    if (!mounted || _isDisposed) return;
    final value = _controller?.value;
    if (value == null) return;
    if (value.hasError && !_hasError) {
      setState(() => _hasError = true);
    }
    if (widget.onCompleted != null &&
        value.isInitialized &&
        !value.isLooping &&
        value.duration > Duration.zero) {
      if (!_hasNotifiedCompletion &&
          value.position >= value.duration - const Duration(milliseconds: 200)) {
        _hasNotifiedCompletion = true;
        widget.onCompleted?.call();
      } else if (_hasNotifiedCompletion &&
          value.position < value.duration - const Duration(milliseconds: 500)) {
        _hasNotifiedCompletion = false;
      }
    }
  }

  Future<void> _disposeLocalControllerOnly({bool trackPending = false}) async {
    final controller = _controller;
    _controller = null;
    if (controller != null) {
      controller.removeListener(_onPlayerTick);
      final disposal = controller.dispose().catchError((_) {});
      if (trackPending) {
        ActiveVideoManager.trackDisposal(disposal);
        await disposal;
      }
    }
  }

  @override
  Future<void> deactivateAndRelease({bool notifySync = false}) async {
    final releaseGen = ++_initGeneration;
    final wasInitialized = _isInitialized;
    _isInitialized = false;
    _isLoading = false;
    _hasError = false;
    _wasPlayingBeforeHold = false;
    _hasNotifiedCompletion = false;
    if (notifySync && mounted && !_isDisposed) {
      Future<void>.microtask(() {
        if (mounted && !_isDisposed && releaseGen == _initGeneration) {
          setState(() {});
        }
      });
    }
    await _disposeLocalControllerOnly(trackPending: wasInitialized);
    if (!mounted || _isDisposed || releaseGen != _initGeneration) return;
    setState(() {
      _isInitialized = false;
      _isLoading = false;
      _hasError = false;
      _wasPlayingBeforeHold = false;
    });
  }

  Future<void> _releaseController() async {
    ActiveVideoManager.unregister(this);
    await deactivateAndRelease();
  }

  @override
  void dispose() {
    _isDisposed = true;
    _initGeneration++;
    final wasInitialized = _isInitialized;
    _heartTimer?.cancel();
    ActiveVideoManager.unregister(this);
    _disposeLocalControllerOnly(trackPending: wasInitialized);
    super.dispose();
  }

  void _handleTap() {
    if (_isLoading) return;
    if (_hasError || !_isInitialized || _controller == null) {
      _initController(playOnReady: true);
      return;
    }
    final c = _controller!;
    c.value.isPlaying ? c.pause() : c.play();
    setState(() {});
  }

  void _handleDoubleTap() {
    widget.onDoubleTap?.call();
    if (widget.onDoubleTap == null) return;
    _heartTimer?.cancel();
    setState(() => _showHeartBurst = true);
    _heartTimer = Timer(const Duration(milliseconds: 650), () {
      if (mounted) setState(() => _showHeartBurst = false);
    });
  }

  void _handleHoldStart(LongPressStartDetails _) {
    if (!widget.fillContainer || !_isInitialized || _controller == null) return;
    _wasPlayingBeforeHold = _controller!.value.isPlaying;
    if (_wasPlayingBeforeHold) {
      _controller!.pause();
      setState(() {});
    }
  }

  void _handleHoldEnd(LongPressEndDetails _) {
    if (!widget.fillContainer || !_isInitialized || _controller == null) return;
    if (_wasPlayingBeforeHold && widget.isActive) {
      _controller!.play();
      setState(() {});
    }
    _wasPlayingBeforeHold = false;
  }

  void _toggleMute() {
    final nextMuted = !_effectiveMuted;
    setState(() => _internalMuted = nextMuted);
    _controller?.setVolume(nextMuted ? 0.0 : 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final isPlaying = _isInitialized && (controller?.value.isPlaying ?? false);

    return VideoFrameShell(
      fillContainer: widget.fillContainer,
      height: widget.height,
      borderRadius: widget.borderRadius,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _handleTap,
        onDoubleTap: widget.onDoubleTap != null ? _handleDoubleTap : null,
        onLongPressStart: widget.fillContainer ? _handleHoldStart : null,
        onLongPressEnd: widget.fillContainer ? _handleHoldEnd : null,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (_isInitialized && controller != null)
              VideoSurface(controller: controller, fillContainer: widget.fillContainer)
            else
              VideoPosterBackdrop(
                posterUrl: widget.posterUrl,
                thumbnailBytes: _thumbnailBytes,
              ),
            VideoControlsOverlay(
              controller: controller,
              isInitialized: _isInitialized,
              isLoading: _isLoading,
              hasError: _hasError,
              showPlayButton:
                  !_isInitialized || (!isPlaying && !_wasPlayingBeforeHold),
              showHeartBurst: _showHeartBurst,
              fillContainer: widget.fillContainer,
              showShortsTimeline: widget.showShortsTimeline,
              shortsTimelineBottomOffset: widget.shortsTimelineBottomOffset,
              allowMuteToggle: widget.muted == null,
              effectiveMuted: _effectiveMuted,
              durationSeconds: widget.durationSeconds,
              onToggleMute: _toggleMute,
            ),
          ],
        ),
      ),
    );
  }
}
