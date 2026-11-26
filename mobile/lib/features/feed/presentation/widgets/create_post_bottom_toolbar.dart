import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';

class CreatePostBottomToolbar extends StatelessWidget {
  final bool isDark;
  final bool isSubmitting;
  final VoidCallback onPickGallery;
  final VoidCallback onPickCamera;
  final VoidCallback onPickVideo;
  final VoidCallback onAddCustomTopic;
  final VoidCallback onDismissKeyboard;

  const CreatePostBottomToolbar({
    super.key,
    required this.isDark,
    required this.isSubmitting,
    required this.onPickGallery,
    required this.onPickCamera,
    required this.onPickVideo,
    required this.onAddCustomTopic,
    required this.onDismissKeyboard,
  });

  @override
  Widget build(BuildContext context) {
    final iconColor =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final hasKeyboard = MediaQuery.viewInsetsOf(context).bottom > 0;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 50,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              IconButton(
                onPressed: isSubmitting ? null : onPickGallery,
                icon: const Icon(Icons.image_outlined, size: 22),
                color: iconColor,
                tooltip: 'Rasm tanlash',
              ),
              IconButton(
                onPressed: isSubmitting ? null : onPickCamera,
                icon: const Icon(Icons.photo_camera_outlined, size: 22),
                color: iconColor,
                tooltip: 'Kamera',
              ),
              IconButton(
                onPressed: isSubmitting ? null : onPickVideo,
                icon: const Icon(Icons.video_library_outlined, size: 22),
                color: iconColor,
                tooltip: 'Video tanlash',
              ),
              IconButton(
                onPressed: isSubmitting ? null : onAddCustomTopic,
                icon: const Icon(Icons.tag_rounded, size: 22),
                color: iconColor,
                tooltip: 'Teglar',
              ),
              IconButton(
                onPressed: hasKeyboard ? onDismissKeyboard : null,
                icon: Icon(
                  Icons.keyboard_hide_rounded,
                  size: 21,
                  color: hasKeyboard
                      ? iconColor
                      : iconColor.withAlpha(80),
                ),
                tooltip: 'Klaviaturani yopish',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
