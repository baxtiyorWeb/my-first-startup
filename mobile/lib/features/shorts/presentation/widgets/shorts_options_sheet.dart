import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../../core/widgets/report_bottom_sheet.dart';
import '../../../auth/data/auth_controller.dart';
import '../../../feed/data/feed_controller.dart';
import '../../../feed/models/post.dart';
import '../../../feed/presentation/create_post_screen.dart';
import '../../../feed/presentation/widgets/post_action_bar.dart';
import 'shorts_playback_card.dart';

class ShortsOptionsSheet {
  static const List<double> allSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  static String formatSpeed(double speed) {
    if (speed == 1.0) return '1x';
    if (speed == 2.0) return '2x';
    if (speed == 1.5) return '1.5x';
    return '${speed}x';
  }

  static Future<void> show(
    BuildContext context, {
    required Post post,
    required bool isOwnPost,
    required double initialSpeed,
    required bool initialAutoAdvance,
    required ValueChanged<double> onSpeedChanged,
    required ValueChanged<bool> onAutoAdvanceChanged,
    required FeedController feedController,
    required AuthController authController,
    ValueChanged<String>? onPostTap,
  }) async {
    double currentSpeed = initialSpeed;
    bool currentAutoAdvance = initialAutoAdvance;
    final messenger = ScaffoldMessenger.of(context);

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final isDark = Theme.of(ctx).brightness == Brightness.dark;
            final surfaceColor =
                isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
            final elevatedColor = isDark
                ? AppColors.surfaceDarkElevated
                : AppColors.surfaceLightElevated;
            final borderColor =
                isDark ? AppColors.borderDark : AppColors.borderLight;
            final textPrimary =
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
            final textSecondary = isDark
                ? AppColors.textSecondaryDark
                : AppColors.textSecondaryLight;

            return Material(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppTheme.radiusXl),
              ),
              clipBehavior: Clip.antiAlias,
              child: Container(
                padding: EdgeInsets.fromLTRB(
                  16,
                  10,
                  16,
                  MediaQuery.paddingOf(ctx).bottom + 16,
                ),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: borderColor)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(
                          color: borderColor,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Text(
                          'Video sozlamalari',
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () => Navigator.of(sheetCtx).pop(),
                          style: IconButton.styleFrom(
                            backgroundColor: elevatedColor,
                            foregroundColor: textSecondary,
                            minimumSize: const Size(34, 34),
                            padding: EdgeInsets.zero,
                          ),
                          icon: const Icon(Icons.close_rounded, size: 18),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ShortsPlaybackCard(
                      currentSpeed: currentSpeed,
                      currentAutoAdvance: currentAutoAdvance,
                      allSpeeds: allSpeeds,
                      formatSpeed: formatSpeed,
                      onSelectSpeed: (speed) {
                        currentSpeed = speed;
                        onSpeedChanged(speed);
                        setSheetState(() {});
                      },
                      onToggleAutoAdvance: (val) {
                        currentAutoAdvance = val;
                        onAutoAdvanceChanged(val);
                        setSheetState(() {});
                      },
                    ),
                    const SizedBox(height: 12),
                    Material(
                      color: elevatedColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
                        side: BorderSide(color: borderColor),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        children: [
                          _SheetActionRow(
                            icon: Icons.article_outlined,
                            label: 'To\'liq post va muhokama',
                            showChevron: true,
                            isDark: isDark,
                            onTap: () {
                              Navigator.of(sheetCtx).pop();
                              onPostTap?.call(post.id);
                            },
                          ),
                          Divider(
                            height: 1,
                            thickness: 1,
                            indent: 58,
                            color: borderColor,
                          ),
                          _SheetActionRow(
                            icon: Icons.link_rounded,
                            label: 'Havolani nusxalash',
                            isDark: isDark,
                            onTap: () {
                              Navigator.of(sheetCtx).pop();
                              SocialActionFeedback.share(
                                context,
                                feedController,
                                post,
                              );
                            },
                          ),
                          Divider(
                            height: 1,
                            thickness: 1,
                            indent: 58,
                            color: borderColor,
                          ),
                          if (isOwnPost) ...[
                            _SheetActionRow(
                              icon: Icons.edit_outlined,
                              label: 'Tahrirlash',
                              isDark: isDark,
                              onTap: () {
                                Navigator.of(sheetCtx).pop();
                                CreatePostScreen.open(
                                  context,
                                  feedController: feedController,
                                  authController: authController,
                                  editingPost: post,
                                );
                              },
                            ),
                            Divider(
                              height: 1,
                              thickness: 1,
                              indent: 58,
                              color: borderColor,
                            ),
                            _SheetActionRow(
                              icon: Icons.delete_outline_rounded,
                              label: 'O\'chirish',
                              isDanger: true,
                              isDark: isDark,
                              onTap: () async {
                                Navigator.of(sheetCtx).pop();
                                final confirmed = await AppConfirmDialog.show(
                                  context,
                                  title: 'Shortni o\'chirish',
                                  message:
                                      'Haqiqatan ham ushbu video postni o\'chirmoqchimisiz?',
                                  confirmLabel: 'O\'chirish',
                                  isDanger: true,
                                );
                                if (confirmed) {
                                  await feedController.deletePost(post.id);
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text('Short o\'chirildi'),
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                }
                              },
                            ),
                          ] else
                            _SheetActionRow(
                              icon: Icons.flag_outlined,
                              label: 'Shikoyat qilish',
                              isDanger: true,
                              isDark: isDark,
                              onTap: () {
                                Navigator.of(sheetCtx).pop();
                                ReportBottomSheet.show(
                                  context,
                                  targetType: 'post',
                                  authorName: post.author.name,
                                  snippet: ContentUtils.excerpt(
                                    ContentUtils.stripHtml(post.content),
                                    maxLength: 90,
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _SheetActionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDanger;
  final bool showChevron;
  final bool isDark;
  final VoidCallback onTap;

  const _SheetActionRow({
    required this.icon,
    required this.label,
    this.isDanger = false,
    this.showChevron = false,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textMuted =
        isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final iconBg = isDanger
        ? AppColors.danger.withAlpha(24)
        : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight);
    final fgColor = isDanger ? AppColors.danger : textPrimary;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: fgColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: fgColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (showChevron)
              Icon(Icons.chevron_right_rounded, size: 20, color: textMuted),
          ],
        ),
      ),
    );
  }
}
