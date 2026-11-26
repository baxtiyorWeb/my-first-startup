import 'package:material_ui/material_ui.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/network/upload_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../../auth/data/auth_controller.dart';
import '../../../tags/models/tag_item.dart';
import '../../data/feed_controller.dart';
import '../../models/post.dart';
import 'create_post_media_section.dart';

List<TagItem> initialTagsForPost(Post post) {
  if (post.tagItems.isNotEmpty) {
    return post.tagItems.take(AppConstants.maxPostTags).toList();
  }
  final raw = post.tags.isNotEmpty
      ? post.tags
      : (post.topic != null && post.topic!.trim().isNotEmpty
          ? [post.topic!.trim()]
          : const <String>[]);
  final result = <TagItem>[];
  for (final item in raw.take(AppConstants.maxPostTags)) {
    final clean = item.replaceFirst('#', '').trim();
    if (clean.isEmpty) continue;
    result.add(
      TagItem(
        id: '',
        name: clean,
        slug: clean.toLowerCase().replaceAll(RegExp(r'\s+'), '-'),
      ),
    );
  }
  return result;
}

class CreatePostAuthorRow extends StatelessWidget {
  final String userName;
  final String? userAvatarUrl;
  final String userHandle;
  final PostVisibilityOption selectedVisibility;
  final bool isDark;
  final ValueChanged<PostVisibilityOption> onVisibilityChanged;

  const CreatePostAuthorRow({
    super.key,
    required this.userName,
    required this.userAvatarUrl,
    required this.userHandle,
    required this.selectedVisibility,
    required this.isDark,
    required this.onVisibilityChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AppAvatar(name: userName, imageUrl: userAvatarUrl, size: 38),
        const SizedBox(width: 10),
        Text(
          userHandle,
          style: TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
            color:
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
        const SizedBox(width: 10),
        LiquidGlassDropdown<PostVisibilityOption>(
          selectedValue: selectedVisibility,
          onSelected: onVisibilityChanged,
          options: AppConstants.postVisibilities
              .map(
                (opt) => LiquidGlassMenuOption<PostVisibilityOption>(
                  value: opt,
                  label: opt.label,
                  icon: opt.icon,
                ),
              )
              .toList(),
          child: LiquidGlassContainer(
            borderRadius: AppTheme.radiusFull,
            blurSigma: 14,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  selectedVisibility.icon,
                  size: 14,
                  color: isDark
                      ? AppColors.textSecondaryDark
                      : AppColors.textSecondaryLight,
                ),
                const SizedBox(width: 5),
                Text(
                  selectedVisibility.label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(width: 2),
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 15,
                  color:
                      isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

Future<void> submitCreateOrEditPost({
  required FeedController feedController,
  required AuthController authController,
  required UploadService uploadService,
  required Post? editingPost,
  required String content,
  required List<TagItem> selectedTags,
  required List<DraftMediaItem> mediaItems,
}) async {
  final tagNames = selectedTags.map((t) => t.name).where((n) => n.isNotEmpty).toList();
  final tagIds = selectedTags.map((t) => t.id).where((id) => id.isNotEmpty).toList();

  if (editingPost != null) {
    await feedController.updatePost(
      editingPost.id,
      title: editingPost.title,
      content: content,
      tags: tagNames,
      tagIds: tagIds,
    );
    return;
  }

  final uploadedImageUrls = <String>[];
  String? uploadedVideoUrl;
  int? uploadedVideoDurationSeconds;
  final token = authController.authToken;

  for (final item in mediaItems) {
    if (item.pendingFile != null) {
      if (item.isVideo) {
        final res = await uploadService.uploadVideo(
          item.pendingFile!,
          folder: 'shorts',
          authToken: token,
        );
        uploadedVideoUrl ??= res.url;
        uploadedVideoDurationSeconds ??= res.durationSeconds;
      } else {
        final res = await uploadService.uploadImage(
          item.pendingFile!,
          folder: 'posts',
          authToken: token,
        );
        uploadedImageUrls.add(res.url);
      }
    } else {
      uploadedImageUrls.add(item.source);
    }
  }

  await feedController.createPost(
    author: authController.currentAuthor,
    content: content,
    postType: 'thought',
    contentKind: uploadedVideoUrl != null ? 'video' : 'thought',
    topic: tagNames.isNotEmpty ? tagNames.first : null,
    videoUrl: uploadedVideoUrl,
    videoDurationSeconds: uploadedVideoDurationSeconds,
    mediaUrls: uploadedImageUrls,
    tags: tagNames,
    tagIds: tagIds,
  );
}

class CreatePostSubmitButton extends StatelessWidget {
  final TextEditingController controller;
  final bool isEditing;
  final bool isSubmitting;
  final VoidCallback onSubmit;

  const CreatePostSubmitButton({
    super.key,
    required this.controller,
    required this.isEditing,
    required this.isSubmitting,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) {
        final ready = value.text.trim().length >= 5;
        return AnimatedOpacity(
          opacity: ready || isSubmitting ? 1.0 : 0.72,
          duration: const Duration(milliseconds: 140),
          child: LiquidGlassContainer(
            borderRadius: AppTheme.radiusFull,
            tintColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            onTap: isSubmitting ? null : onSubmit,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isSubmitting)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                else ...[
                  Icon(
                    isEditing ? Icons.check_rounded : Icons.send_outlined,
                    size: 15,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isEditing ? 'Saqlash' : 'Chop etish',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
