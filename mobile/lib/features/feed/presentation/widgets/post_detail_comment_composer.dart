import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/keyboard_inset_padding.dart';
import '../../models/comment.dart';

class PostDetailCommentComposer extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String currentUserName;
  final String? currentUserAvatarUrl;
  final Comment? replyingTo;
  final bool isSending;
  final VoidCallback onCancelReply;
  final VoidCallback onSend;

  const PostDetailCommentComposer({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.currentUserName,
    this.currentUserAvatarUrl,
    required this.replyingTo,
    required this.isSending,
    required this.onCancelReply,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return KeyboardInsetPadding(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (replyingTo != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: isDark ? AppColors.primarySurfaceDark : AppColors.primarySurface,
              child: Row(
                children: [
                  const Icon(Icons.reply, size: 16, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${replyingTo!.author.name} ga javob yozilmoqda',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: onCancelReply,
                    borderRadius: BorderRadius.circular(12),
                    child: const Padding(
                      padding: EdgeInsets.all(2),
                      child: Icon(Icons.close, size: 16, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
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
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 3),
                    child: AppAvatar(
                      name: currentUserName,
                      imageUrl: currentUserAvatarUrl,
                      size: 34,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.surfaceDarkElevated
                            : AppColors.surfaceLightElevated,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      child: TextField(
                        controller: controller,
                        focusNode: focusNode,
                        minLines: 1,
                        maxLines: 4,
                        style: TextStyle(
                          fontSize: 13.5,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                        ),
                        decoration: InputDecoration(
                          hintText: replyingTo != null
                              ? 'Javobingiz...'
                              : 'Muhokamaga qo\'shiling...',
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => onSend(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: controller,
                    builder: (context, value, _) {
                      final hasText = value.text.trim().isNotEmpty;
                      final canSend = hasText && !isSending;
                      return IconButton(
                        onPressed: canSend ? onSend : null,
                        style: IconButton.styleFrom(
                          backgroundColor: hasText || isSending
                              ? AppColors.primary
                              : (isDark
                                  ? AppColors.surfaceDarkElevated
                                  : AppColors.surfaceLightSubtle),
                          disabledBackgroundColor: isDark
                              ? AppColors.surfaceDarkElevated
                              : AppColors.surfaceLightSubtle,
                          foregroundColor: Colors.white,
                          disabledForegroundColor: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                          shape: const CircleBorder(),
                          padding: const EdgeInsets.all(10),
                        ),
                        icon: isSending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.send_rounded, size: 18),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
