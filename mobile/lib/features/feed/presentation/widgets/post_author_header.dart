import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../../../core/widgets/report_bottom_sheet.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../../auth/data/auth_controller.dart';
import '../../data/feed_controller.dart';
import '../../models/author.dart';
import '../../models/post.dart';
import '../create_post_screen.dart';
import 'post_action_bar.dart';

class PostAuthorHeader extends StatelessWidget {
  final Post post;
  final String cleanContent;
  final bool isOwnPost;
  final bool isDark;
  final FeedController feedController;
  final AuthController authController;
  final ValueChanged<Author>? onAuthorTap;

  const PostAuthorHeader({
    super.key,
    required this.post,
    required this.cleanContent,
    required this.isOwnPost,
    required this.isDark,
    required this.feedController,
    required this.authController,
    this.onAuthorTap,
  });

  Future<void> _handleDelete(BuildContext context) async {
    final ok = await AppConfirmDialog.show(
      context,
      title: 'Postni o\'chirish',
      message:
          'Haqiqatan ham ushbu postni o\'chirmoqchimisiz? Bu amalni ortga qaytarib bo\'lmaydi.',
      confirmLabel: 'O\'chirish',
      isDanger: true,
    );
    if (!ok) return;
    try {
      await feedController.deletePost(post.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Post o\'chirildi'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Postni o\'chirishda xatolik: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _handleFollowToggle(BuildContext context) async {
    try {
      final next = await feedController.toggleFollowAuthor(post.author.handle);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              next
                  ? '${post.author.name} obunalarga qo\'shildi'
                  : '${post.author.name} obunadan chiqarildi',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.dangerSurface,
          ),
        );
    }
  }

  void _onSelected(BuildContext context, String val) {
    if (val == 'share') {
      SocialActionFeedback.share(context, feedController, post);
    } else if (val == 'save') {
      SocialActionFeedback.toggleBookmark(context, feedController, post);
    } else if (val == 'follow') {
      _handleFollowToggle(context);
    } else if (val == 'edit') {
      CreatePostScreen.open(
        context,
        feedController: feedController,
        authController: authController,
        editingPost: post,
      );
    } else if (val == 'delete') {
      _handleDelete(context);
    } else if (val == 'report') {
      ReportBottomSheet.show(
        context,
        targetId: post.id,
        targetType: 'post',
        authorName: post.author.name,
        snippet: ContentUtils.excerpt(cleanContent, maxLength: 90),
        apiClient: authController.apiClient,
      );
    } else if (val == 'report_user') {
      ReportBottomSheet.show(
        context,
        targetId: post.author.id,
        targetType: 'user',
        authorName: post.author.name,
        snippet: post.author.formattedHandle,
        apiClient: authController.apiClient,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 14, 8, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => onAuthorTap?.call(post.author),
            child: AppAvatar(
              imageUrl: post.author.avatarUrl,
              name: post.author.name,
              size: 40,
              isOnline: isOwnPost,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: GestureDetector(
              onTap: () => onAuthorTap?.call(post.author),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          post.author.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      if (post.author.verified) ...[
                        const SizedBox(width: 5),
                        const VerifiedBadge(size: 16),
                      ],
                    ],
                  ),
                  const SizedBox(height: 1.5),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          post.author.formattedHandle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? AppColors.textMutedDark
                                : AppColors.textMutedLight,
                          ),
                        ),
                      ),
                      Text(
                        ' · ${DateFormatter.formatRelative(post.createdAt)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          LiquidGlassDropdown<String>(
            onSelected: (val) => _onSelected(context, val),
            options: [
              const LiquidGlassMenuOption(
                value: 'share',
                label: 'Ulashish',
                icon: Icons.share_outlined,
              ),
              if (!isOwnPost)
                LiquidGlassMenuOption(
                  value: 'follow',
                  label: post.author.isFollowing
                      ? 'Kuzatishni to\'xtatish'
                      : 'Kuzatish',
                  icon: post.author.isFollowing
                      ? Icons.person_remove_outlined
                      : Icons.person_add_outlined,
                ),
              LiquidGlassMenuOption(
                value: 'save',
                label: post.isSaved
                    ? 'Saqlanganlardan o\'chirish'
                    : 'Saqlab qo\'yish',
                icon: post.isSaved ? Icons.bookmark : Icons.bookmark_border,
              ),
              if (isOwnPost) ...[
                const LiquidGlassMenuOption(
                  value: 'edit',
                  label: 'Tahrirlash',
                  icon: Icons.edit_outlined,
                ),
                const LiquidGlassMenuOption(
                  value: 'delete',
                  label: 'O\'chirish',
                  icon: Icons.delete_outline,
                  color: AppColors.danger,
                ),
              ] else ...[
                const LiquidGlassMenuOption(
                  value: 'report',
                  label: 'Postga shikoyat qilish',
                  icon: Icons.flag_outlined,
                ),
                const LiquidGlassMenuOption(
                  value: 'report_user',
                  label: 'Muallifni shikoyat qilish',
                  icon: Icons.person_off_outlined,
                  color: AppColors.danger,
                ),
              ],
            ],
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Icon(
                Icons.more_horiz,
                size: 19,
                color:
                    isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
