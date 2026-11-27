import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../auth/data/auth_controller.dart';
import '../../data/feed_controller.dart';
import '../../models/author.dart';
import '../../models/post.dart';
import 'discussion_bottom_sheet.dart';
import 'post_action_bar.dart';
import 'post_author_header.dart';
import 'post_media_section.dart';

export 'post_grid_card.dart';

class PostCard extends StatefulWidget {
  final Post post;
  final FeedController feedController;
  final AuthController authController;
  final VoidCallback? onPostTap;
  final ValueChanged<Author>? onAuthorTap;
  final ValueChanged<String>? onTagTap;

  const PostCard({
    super.key,
    required this.post,
    required this.feedController,
    required this.authController,
    this.onPostTap,
    this.onAuthorTap,
    this.onTagTap,
  });

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  bool _isExpanded = false;

  bool get _isOwnPost =>
      widget.post.author.id == widget.authController.currentUser.id ||
      widget.post.author.handle == widget.authController.currentUser.handle;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolved = widget.feedController.resolvePost(widget.post);
    final cleanContent = ContentUtils.stripHtml(resolved.content);
    final isLongContent = cleanContent.length > 200;
    final fallbackTags = resolved.tagItems.isEmpty
        ? ContentUtils.extractDisplayTags(
            explicitTags: resolved.tags,
            content: cleanContent,
            topic: resolved.topic,
            projectStage: resolved.projectStage,
          )
        : const <String>[];

    return RepaintBoundary(
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          border: Border(
            top: BorderSide(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              width: 1,
            ),
            bottom: BorderSide(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              width: 1,
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PostAuthorHeader(
              post: resolved,
              cleanContent: cleanContent,
              isOwnPost: _isOwnPost,
              isDark: isDark,
              feedController: widget.feedController,
              authController: widget.authController,
              onAuthorTap: widget.onAuthorTap,
            ),
            GestureDetector(
              onTap: widget.onPostTap,
              behavior: HitTestBehavior.opaque,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (resolved.title != null && resolved.title!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 6, 14, 4),
                      child: Text(
                        resolved.title!,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          height: 1.3,
                          letterSpacing: -0.2,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cleanContent,
                          maxLines: _isExpanded ? null : (isLongContent ? 4 : null),
                          overflow: _isExpanded
                              ? null
                              : (isLongContent ? TextOverflow.ellipsis : null),
                          style: TextStyle(
                            fontSize: 13.5,
                            height: 1.5,
                            color: isDark
                                ? AppColors.textSecondaryDark
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                        if (isLongContent)
                          GestureDetector(
                            onTap: () => setState(() => _isExpanded = !_isExpanded),
                            child: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                _isExpanded ? 'Yashirish' : 'Ko\'proq o\'qish',
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            PostMediaSection(post: resolved, isDark: isDark),
            if (resolved.tagItems.isNotEmpty || fallbackTags.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: resolved.tagItems.isNotEmpty
                      ? resolved.tagItems
                          .map((t) => _TagPill(
                                label: '#${t.name}',
                                isDark: isDark,
                                onTap: widget.onTagTap != null
                                    ? () => widget.onTagTap!(t.slug)
                                    : null,
                              ))
                          .toList()
                      : fallbackTags
                          .map((tag) => _TagPill(
                                label: tag,
                                isDark: isDark,
                                onTap: widget.onTagTap != null
                                    ? () => widget.onTagTap!(
                                          tag.replaceFirst('#', ''),
                                        )
                                    : null,
                              ))
                          .toList(),
                ),
              ),
            const SizedBox(height: 10),
            Divider(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              height: 1,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 6),
              child: PostInlineActionBar(
                post: resolved,
                feedController: widget.feedController,
                onCommentTap: () => DiscussionBottomSheet.show(
                  context,
                  post: resolved,
                  feedController: widget.feedController,
                  currentAuthor: widget.authController.currentAuthor,
                  apiClient: widget.authController.apiClient,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TagPill extends StatelessWidget {
  final String label;
  final bool isDark;
  final VoidCallback? onTap;

  const _TagPill({required this.label, required this.isDark, this.onTap});

  @override
  Widget build(BuildContext context) {
    final pill = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
        ),
      ),
    );
    if (onTap == null) return pill;
    return GestureDetector(onTap: onTap, child: pill);
  }
}
