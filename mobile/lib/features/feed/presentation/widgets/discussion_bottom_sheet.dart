import 'package:material_ui/material_ui.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/keyboard_inset_padding.dart';
import '../../../../core/widgets/report_bottom_sheet.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../data/feed_controller.dart';
import '../../models/author.dart';
import '../../models/comment.dart';
import '../../models/post.dart';
import 'comment_thread_widget.dart';

class DiscussionBottomSheet extends StatefulWidget {
  final Post post;
  final FeedController feedController;
  final Author currentAuthor;
  final ApiClient? apiClient;

  const DiscussionBottomSheet({
    super.key,
    required this.post,
    required this.feedController,
    required this.currentAuthor,
    this.apiClient,
  });

  static Future<void> show(
    BuildContext context, {
    required Post post,
    required FeedController feedController,
    required Author currentAuthor,
    ApiClient? apiClient,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DiscussionBottomSheet(
        post: post,
        feedController: feedController,
        currentAuthor: currentAuthor,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<DiscussionBottomSheet> createState() => _DiscussionBottomSheetState();
}

class _DiscussionBottomSheetState extends State<DiscussionBottomSheet> {
  final TextEditingController _commentController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  List<Comment> _comments = [];
  bool _isLoading = true;
  bool _isSending = false;
  Comment? _replyingTo;

  @override
  void initState() {
    super.initState();
    _loadComments();
    widget.feedController.recordView(widget.post.id);
  }

  @override
  void dispose() {
    _commentController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadComments({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    final results = await widget.feedController.repository.getComments(widget.post.id);
    if (mounted) {
      setState(() {
        _comments = results;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleSend() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _isSending) return;
    setState(() => _isSending = true);
    try {
      await widget.feedController.repository.addComment(
        widget.post.id,
        widget.currentAuthor,
        text,
        parentId: _replyingTo?.id,
      );
      widget.feedController.incrementCommentCount(widget.post.id);
      _commentController.clear();
      _replyingTo = null;
      _focusNode.unfocus();
      await _loadComments(silent: true);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _handleCommentLike(Comment c) async {
    await widget.feedController.repository.toggleCommentLike(widget.post.id, c.id);
    await _loadComments(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final maxHeight = MediaQuery.sizeOf(context).height * 0.88;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radiusXl)),
        border: Border(top: BorderSide(color: borderColor)),
      ),
      child: Column(
        children: [
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: borderColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 12, 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Munozaralar',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      Text(
                        '${_comments.length} ta asosiy fikr',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, size: 20),
                  color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                ),
              ],
            ),
          ),
          Divider(color: borderColor, height: 1),
          Container(
            padding: const EdgeInsets.all(12),
            color: isDark ? AppColors.surfaceDarkElevated : AppColors.backgroundLight,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppAvatar(
                  imageUrl: widget.post.author.avatarUrl,
                  name: widget.post.author.name,
                  size: 30,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.post.author.name,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            ),
                          ),
                          if (widget.post.author.verified) ...[
                            const SizedBox(width: 4),
                            const VerifiedBadge(size: 13),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.post.title ?? ContentUtils.excerpt(widget.post.content),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _comments.isEmpty
                    ? Center(
                        child: Text(
                          'Hozircha izohlar yo\'q.\nBirinchi bo\'lib fikr bildiring!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            fontSize: 13,
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                        physics: const BouncingScrollPhysics(),
                        itemCount: _comments.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 16),
                        itemBuilder: (context, index) => CommentThreadItem(
                          comment: _comments[index],
                          onReplyTap: (c) {
                            setState(() => _replyingTo = c);
                            _focusNode.requestFocus();
                          },
                          onLikeTap: _handleCommentLike,
                          onReportTap: (c) => ReportBottomSheet.show(
                            context,
                            targetId: c.id,
                            targetType: 'comment',
                            authorName: c.author.name,
                            snippet: ContentUtils.excerpt(c.content, maxLength: 80),
                            apiClient: widget.apiClient,
                          ),
                        ),
                      ),
          ),
          if (_replyingTo != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: isDark ? AppColors.primarySurfaceDark : AppColors.primarySurface,
              child: Row(
                children: [
                  const Icon(Icons.reply, size: 16, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${_replyingTo!.author.name} ga javob yozilmoqda',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => setState(() => _replyingTo = null),
                    child: const Icon(Icons.close, size: 16, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          KeyboardInsetPadding(
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: AppAvatar(
                        name: widget.currentAuthor.name,
                        imageUrl: widget.currentAuthor.avatarUrl,
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
                          border: Border.all(color: borderColor),
                        ),
                        child: TextField(
                          controller: _commentController,
                          focusNode: _focusNode,
                          minLines: 1,
                          maxLines: 4,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                          decoration: InputDecoration(
                            hintText: _replyingTo != null ? 'Javobingiz...' : 'Fikr bildiring...',
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _handleSend(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ValueListenableBuilder<TextEditingValue>(
                      valueListenable: _commentController,
                      builder: (context, value, _) {
                        final hasText = value.text.trim().isNotEmpty;
                        final canSend = hasText && !_isSending;
                        final disabledBg = isDark
                            ? AppColors.surfaceDarkElevated
                            : AppColors.surfaceLightSubtle;
                        return IconButton(
                          onPressed: canSend ? _handleSend : null,
                          style: IconButton.styleFrom(
                            backgroundColor: hasText || _isSending ? AppColors.primary : disabledBg,
                            disabledBackgroundColor: disabledBg,
                            foregroundColor: AppColors.onPrimary,
                            disabledForegroundColor:
                                isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            shape: const CircleBorder(),
                            padding: const EdgeInsets.all(10),
                          ),
                          icon: _isSending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    color: AppColors.onPrimary,
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
          ),
        ],
      ),
    );
  }
}
