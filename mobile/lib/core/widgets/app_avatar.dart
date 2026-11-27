import 'package:material_ui/material_ui.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'verified_badge.dart';

class AppAvatar extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double size;
  final bool isVerified;
  final bool isOnline;
  final Color? ringColor;
  final VoidCallback? onTap;

  const AppAvatar({
    super.key,
    this.imageUrl,
    required this.name,
    this.size = 38,
    this.isVerified = false,
    this.isOnline = false,
    this.ringColor,
    this.onTap,
  });

  // Dark enough for the white initials on top (all stops ≥ 4.5:1).
  static const List<List<Color>> _fallbackGradients = [
    [Color(0xFF0D9488), Color(0xFF115E59)],
    [Color(0xFF6346D9), Color(0xFF4E37B3)],
    [Color(0xFF008257), Color(0xFF006444)],
    [Color(0xFF3E4144), Color(0xFF0F1419)],
  ];

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'U';
  }

  List<Color> get _gradientPair =>
      _fallbackGradients[name.hashCode.abs() % _fallbackGradients.length];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dpr = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2.0;
    final decodeDim = (size * dpr).round().clamp(48, 320);
    final trimmedUrl = imageUrl?.trim() ?? '';
    final lowerUrl = trimmedUrl.toLowerCase();
    final isSvg = lowerUrl.contains('.svg') || lowerUrl.contains('/svg');
    final hasImage = trimmedUrl.startsWith('http') && !isSvg;

    Widget avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: _gradientPair,
        ),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: hasImage
          ? Image.network(
              trimmedUrl,
              fit: BoxFit.cover,
              cacheWidth: decodeDim,
              cacheHeight: decodeDim,
              filterQuality: FilterQuality.medium,
              gaplessPlayback: true,
              errorBuilder: (_, _, _) => _buildFallback(),
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return _buildFallback();
              },
            )
          : _buildFallback(),
    );

    if (ringColor != null) {
      avatar = Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: ringColor!, width: 1.8),
        ),
        child: avatar,
      );
    }

    if (isOnline) {
      final dotSize = (size * 0.28).clamp(8.0, 13.0);
      avatar = Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          Positioned(
            right: -1,
            bottom: -1,
            child: Container(
              width: dotSize,
              height: dotSize,
              decoration: BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
                border: Border.all(
                  color: ringColor ?? (isDark ? AppColors.surfaceDark : Colors.white),
                  width: 2,
                ),
              ),
            ),
          ),
        ],
      );
    } else if (isVerified) {
      avatar = Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          Positioned(
            right: -1,
            bottom: -1,
            child: VerifiedBadge(size: size * 0.38),
          ),
        ],
      );
    }

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: avatar);
    }
    return avatar;
  }

  Widget _buildFallback() {
    return Center(
      child: Text(
        _initials,
        style: AppTypography.captionMedium.copyWith(
          color: Colors.white,
          fontSize: size * 0.38,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
