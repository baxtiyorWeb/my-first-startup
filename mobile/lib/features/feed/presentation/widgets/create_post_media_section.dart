import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_media_image.dart';
import '../../../../core/widgets/dashed_border_box.dart';
import '../../../../core/widgets/media_lightbox.dart';

class DraftMediaItem {
  final String source;
  final XFile? pendingFile;
  final bool isVideo;

  const DraftMediaItem({
    required this.source,
    this.pendingFile,
    this.isVideo = false,
  });
}

class CreatePostMediaSection extends StatelessWidget {
  final List<DraftMediaItem> mediaItems;
  final bool isSubmitting;
  final bool isDark;
  final VoidCallback onPickGallery;
  final VoidCallback onPickCamera;
  final VoidCallback onPickVideo;
  final ValueChanged<int> onRemoveAt;

  const CreatePostMediaSection({
    super.key,
    required this.mediaItems,
    required this.isSubmitting,
    required this.isDark,
    required this.onPickGallery,
    required this.onPickCamera,
    required this.onPickVideo,
    required this.onRemoveAt,
  });

  @override
  Widget build(BuildContext context) {
    final secondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 98,
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: DashedBorderBox(
                  color: isDark
                      ? AppColors.borderDarkElevated
                      : AppColors.surfaceLightSubtle,
                  backgroundColor:
                      isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: 14,
                  onTap: isSubmitting ? null : onPickGallery,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_photo_alternate_outlined,
                          size: 24,
                          color: secondary,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Rasm qo\'shish\n(${mediaItems.length}/${AppConstants.maxPostMediaCount})',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                            color: secondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 1,
                child: _MediaOptionTile(
                  icon: Icons.photo_camera_outlined,
                  label: 'Kamera',
                  onTap: isSubmitting ? null : onPickCamera,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 1,
                child: _MediaOptionTile(
                  icon: Icons.video_library_outlined,
                  label: 'Video',
                  onTap: isSubmitting ? null : onPickVideo,
                  isDark: isDark,
                ),
              ),
            ],
          ),
        ),
        if (mediaItems.isNotEmpty) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 76,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: mediaItems.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                return Stack(
                  children: [
                    GestureDetector(
                      onTap: () => MediaLightbox.show(
                        context,
                        urls: mediaItems.map((m) => m.source).toList(),
                        initialIndex: index,
                      ),
                      child: Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark
                                ? AppColors.borderDark
                                : AppColors.borderLight,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: mediaItems[index].isVideo
                            ? Container(
                                color: AppColors.surfaceDark,
                                child: const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.play_circle_filled_rounded,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'VIDEO',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : AppMediaImage(
                                source: mediaItems[index].source,
                                fit: BoxFit.cover,
                              ),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: () => onRemoveAt(index),
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: Colors.black.withAlpha(185),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close,
                            size: 13,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _MediaOptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool isDark;

  const _MediaOptionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final secondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    return Material(
      color: isDark ? AppColors.surfaceDark : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 24, color: secondary),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: secondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
