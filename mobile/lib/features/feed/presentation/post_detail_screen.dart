import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/report_bottom_sheet.dart';
import '../../auth/data/auth_controller.dart';
import '../data/feed_controller.dart';
import '../models/author.dart';
import '../models/comment.dart';
import '../models/post.dart';
import 'widgets/comment_thread_widget.dart';
import 'widgets/post_action_bar.dart';
import 'widgets/post_detail_comment_composer.dart';
import 'widgets/post_detail_content_card.dart';

class PostDetailScreen extends StatefulWidget {
  final String postId;
  final FeedController feedController;
  final AuthController authController;
  final ValueChanged<Author>? onAuthorTap;

  const PostDetailScreen({
    super.key,
    required this.postId,
    required this.feedController,
    required this.authController,
    this.onAuthorTap,
  });

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final TextEditingController _commentController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  List<Comment> _comments = [];
  bool _isLoadingComments = true;
  bool _isSending = false;
  Comment? _replyingTo;

  @override
  void initState() {
    super.initState();
    widget.feedController.recordView(widget.postId);
    _loadComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadComments({bool silent = false}) async {
    if (!silent) {
      setState(() => _isLoadingComments = true);
    }
    try {
      final data =
          await widget.feedController.repository.getComments(widget.postId);
      if (mounted) {
        setState(() {
          _comments = data;
          _isLoadingComments = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingComments = false);
        if (!silent) {
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
    }
  }

  Future<void> _handleSend() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _isSending) return;
    setState(() => _isSending = true);
    try {
      await widget.feedController.repository.addComment(
        widget.postId,
        widget.authController.currentAuthor,
        text,
        parentId: _replyingTo?.id,
      );
      widget.feedController.incrementCommentCount(widget.postId);
      _commentController.clear();
      _replyingTo = null;
      _focusNode.unfocus();
      await _loadComments(silent: true);
    } catch (e) {
      if (mounted) {
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
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentUser = widget.authController.currentUser;

    return ListenableBuilder(
      listenable: widget.feedController,
      builder: (context, _) {
        final Post? post = widget.feedController.findPostById(widget.postId);
        if (post == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Post')),
            body: const Center(child: Text('Post topilmadi yoki o\'chirilgan')),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Muhokama'),
            actions: [
              IconButton(
                onPressed: () =>
                    SocialActionFeedback.share(context, widget.feedController, post),
                icon: const Icon(Icons.share_outlined, size: 20),
              ),
              IconButton(
                onPressed: () => ReportBottomSheet.show(
                  context,
                  targetType: 'post',
                  authorName: post.author.name,
                  snippet: ContentUtils.excerpt(post.content, maxLength: 90),
                ),
                icon: const Icon(Icons.flag_outlined, size: 20),
              ),
            ],
          ),
          body: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(),
                  children: [
                    PostDetailContentCard(
                      post: post,
                      feedController: widget.feedController,
                      authController: widget.authController,
                      onAuthorTap: widget.onAuthorTap,
                      onCommentTap: () => _focusNode.requestFocus(),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Munozaralar (${post.commentsCount})',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_isLoadingComments)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (_comments.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Text(
                            'Hozircha izohlar yo\'q. Birinchi bo\'lib fikr bildiring!',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                            ),
                          ),
                        ),
                      )
                    else
                      ..._comments.map(
                        (c) => Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: CommentThreadItem(
                            comment: c,
                            onReplyTap: (item) {
                              setState(() => _replyingTo = item);
                              _focusNode.requestFocus();
                            },
                            onLikeTap: (item) async {
                              try {
                                await widget.feedController.repository
                                    .toggleCommentLike(post.id, item.id);
                                await _loadComments(silent: true);
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
                            },
                            onReportTap: (item) => ReportBottomSheet.show(
                              context,
                              targetType: 'comment',
                              authorName: item.author.name,
                              snippet: ContentUtils.excerpt(
                                item.content,
                                maxLength: 80,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              PostDetailCommentComposer(
                controller: _commentController,
                focusNode: _focusNode,
                currentUserName: currentUser.name,
                currentUserAvatarUrl: currentUser.avatarUrl,
                replyingTo: _replyingTo,
                isSending: _isSending,
                onCancelReply: () => setState(() => _replyingTo = null),
                onSend: _handleSend,
              ),
            ],
          ),
        );
      },
    );
  }
}
