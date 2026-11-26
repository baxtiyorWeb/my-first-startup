import 'dart:io';
import 'package:material_ui/material_ui.dart';
import '../theme/app_colors.dart';

/// Memory-conscious media renderer computing bounded decode dimensions
/// (`cacheWidth`/`cacheHeight`) from device pixel ratio to avoid OOM jank.
class AppMediaImage extends StatelessWidget {
  final String source;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Color? errorColor;

  const AppMediaImage({
    super.key,
    required this.source,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.errorColor,
  });

  bool get _isNetwork =>
      source.startsWith('http://') || source.startsWith('https://');

  int? _resolveCacheDim(double? logicalSize, double dpr) {
    if (logicalSize == null || !logicalSize.isFinite || logicalSize <= 0) {
      return null;
    }
    return (logicalSize * dpr).round().clamp(64, 1440);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dpr = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2.0;
    final placeholderColor =
        isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated;

    final fallback = ColoredBox(
      color: placeholderColor,
      child: Center(
        child: Icon(
          Icons.broken_image_outlined,
          color: errorColor ??
              (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          size: 30,
        ),
      ),
    );

    if (_isNetwork) {
      return LayoutBuilder(
        builder: (context, constraints) {
          final targetW = width ??
              (constraints.hasBoundedWidth ? constraints.maxWidth : null);
          final targetH = height ??
              (constraints.hasBoundedHeight ? constraints.maxHeight : null);
          final cacheW =
              _resolveCacheDim(targetW, dpr) ??
              _resolveCacheDim(targetH, dpr) ??
              960;

          return Image.network(
            source,
            width: width,
            height: height,
            fit: fit,
            cacheWidth: cacheW,
            filterQuality: FilterQuality.medium,
            gaplessPlayback: true,
            errorBuilder: (_, _, _) => fallback,
            frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
              if (wasSynchronouslyLoaded) return child;
              return AnimatedOpacity(
                opacity: frame == null ? 0.0 : 1.0,
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                child: child,
              );
            },
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return ColoredBox(
                color: placeholderColor,
                child: child,
              );
            },
          );
        },
      );
    }

    final fileCacheW = _resolveCacheDim(width, dpr) ?? 960;
    return Image.file(
      File(source),
      width: width,
      height: height,
      fit: fit,
      cacheWidth: fileCacheW,
      filterQuality: FilterQuality.medium,
      gaplessPlayback: true,
      errorBuilder: (_, _, _) => fallback,
    );
  }
}
