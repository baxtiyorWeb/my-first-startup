import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

/// Static Slate loading placeholder for the feed so initial loading
/// feels structured without running GPU-heavy continuous animations.
class FeedLoadingSkeleton extends StatelessWidget {
  const FeedLoadingSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final boneColor =
        isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Column(
      children: List.generate(3, (index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cardColor,
            border: Border(
              top: BorderSide(color: borderColor, width: 1),
              bottom: BorderSide(color: borderColor, width: 1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: boneColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Bone(width: 128, height: 12, color: boneColor),
                      const SizedBox(height: 6),
                      _Bone(width: 84, height: 10, color: boneColor),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _Bone(width: double.infinity, height: 12, color: boneColor),
              const SizedBox(height: 8),
              _Bone(width: 240, height: 12, color: boneColor),
              if (index == 0) ...[
                const SizedBox(height: 14),
                Container(
                  height: 164,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: boneColor,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                ),
              ],
              const SizedBox(height: 14),
              Row(
                children: [
                  _Bone(width: 46, height: 12, color: boneColor),
                  const SizedBox(width: 20),
                  _Bone(width: 46, height: 12, color: boneColor),
                  const SizedBox(width: 20),
                  _Bone(width: 46, height: 12, color: boneColor),
                ],
              ),
            ],
          ),
        );
      }),
    );
  }
}

class _Bone extends StatelessWidget {
  final double width;
  final double height;
  final Color color;

  const _Bone({
    required this.width,
    required this.height,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}
