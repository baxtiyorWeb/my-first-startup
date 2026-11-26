import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../models/comment.dart';

class CommentThreadItem extends StatelessWidget {
  final Comment comment;
  final ValueChanged<Comment> onReplyTap;
  final ValueChanged<Comment> onLikeTap;
  final ValueChanged<Comment>? onReportTap;

  const CommentThreadItem({
    super.key,
    required this.comment,
    required this.onReplyTap,
    required this.onLikeTap,
    this.onReportTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSingleComment(comment, isDark, isReply: false),
        if (comment.replies.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(left: 18, top: 8),
            padding: const EdgeInsets.only(left: 14),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  width: 1.5,
                ),
              ),
            ),
            child: Column(
              children: comment.replies
                  .map(
                    (reply) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _buildSingleComment(reply, isDark, isReply: true),
                    ),
                  )
                  .toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildSingleComment(Comment item, bool isDark, {required bool isReply}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppAvatar(
          imageUrl: item.author.avatarUrl,
          name: item.author.name,
          size: isReply ? 26 : 32,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      item.author.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: isReply ? 12.5 : 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      ),
                    ),
                  ),
                  if (item.author.verified) ...[
                    const SizedBox(width: 4),
                    VerifiedBadge(size: isReply ? 12 : 13),
                  ],
                  const SizedBox(width: 6),
                  Text(
                    item.author.formattedHandle,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    DateFormatter.formatRelative(item.createdAt),
                    style: TextStyle(
                      fontSize: 10.5,
                      color: isDark ? AppColors.textSubMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                item.content,
                style: TextStyle(
                  fontSize: isReply ? 12.5 : 13,
                  height: 1.45,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  if (!isReply) ...[
                    GestureDetector(
                      onTap: () => onReplyTap(item),
                      child: const Text(
                        'Javob berish',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                  ],
                  GestureDetector(
                    onTap: () => onLikeTap(item),
                    child: Row(
                      children: [
                        Icon(
                          item.isLiked ? Icons.favorite : Icons.favorite_border,
                          size: 13.5,
                          color: item.isLiked ? AppColors.danger : AppColors.textMutedLight,
                        ),
                        if (item.likesCount > 0) ...[
                          const SizedBox(width: 4),
                          Text(
                            '${item.likesCount}',
                            style: TextStyle(
                              fontSize: 11,
                              color: item.isLiked ? AppColors.danger : AppColors.textMutedLight,
                              fontWeight: item.isLiked ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (onReportTap != null) ...[
                    const SizedBox(width: 16),
                    GestureDetector(
                      onTap: () => onReportTap!(item),
                      child: Icon(
                        Icons.flag_outlined,
                        size: 13,
                        color: isDark ? AppColors.textSubMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
