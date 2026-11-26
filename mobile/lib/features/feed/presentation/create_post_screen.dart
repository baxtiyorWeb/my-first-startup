import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/upload_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/data/auth_controller.dart';
import '../../tags/data/tags_controller.dart';
import '../../tags/data/tags_repository.dart';
import '../../tags/models/tag_item.dart';
import '../../tags/presentation/widgets/dynamic_tag_selector.dart';
import '../data/feed_controller.dart';
import '../models/post.dart';
import 'widgets/create_post_bottom_toolbar.dart';
import 'widgets/create_post_header_bar.dart';
import 'widgets/create_post_media_section.dart';

class CreatePostScreen extends StatefulWidget {
  final FeedController feedController;
  final AuthController authController;
  final TagsController? tagsController;
  final UploadService? uploadService;
  final Post? editingPost;
  final bool openImagePickerOnStart;
  final bool openVideoPickerOnStart;

  const CreatePostScreen({
    super.key,
    required this.feedController,
    required this.authController,
    this.tagsController,
    this.uploadService,
    this.editingPost,
    this.openImagePickerOnStart = false,
    this.openVideoPickerOnStart = false,
  });

  static Future<bool?> open(
    BuildContext context, {
    required FeedController feedController,
    required AuthController authController,
    TagsController? tagsController,
    UploadService? uploadService,
    Post? editingPost,
    bool openImagePickerOnStart = false,
    bool openVideoPickerOnStart = false,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => CreatePostScreen(
          feedController: feedController,
          authController: authController,
          tagsController: tagsController,
          uploadService: uploadService,
          editingPost: editingPost,
          openImagePickerOnStart: openImagePickerOnStart,
          openVideoPickerOnStart: openVideoPickerOnStart,
        ),
      ),
    );
  }

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final TextEditingController _contentController = TextEditingController();
  final FocusNode _contentFocusNode = FocusNode();
  final FocusNode _tagFocusNode = FocusNode();
  final ImagePicker _picker = ImagePicker();
  late final UploadService _uploadService;
  late final TagsController _tagsController;
  late final bool _ownsTagsController;

  final List<DraftMediaItem> _mediaItems = [];
  final List<TagItem> _selectedTags = [];
  PostVisibilityOption _selectedVisibility = AppConstants.postVisibilities.first;
  bool _isSubmitting = false;
  bool _focusScheduled = false;
  Animation<double>? _routeAnimation;

  bool get _isEditing => widget.editingPost != null;

  @override
  void initState() {
    super.initState();
    _uploadService = widget.uploadService ?? UploadServiceImpl();
    _ownsTagsController = widget.tagsController == null;
    _tagsController = widget.tagsController ??
        TagsController(
          repository: TagsRepositoryImpl(apiClient: widget.authController.apiClient),
          cacheStore: widget.feedController.cacheStore,
        );
    if (_tagsController.trendingTags.isEmpty && !_tagsController.isLoadingTrending) {
      _tagsController.loadTrending();
    }
    final edit = widget.editingPost;
    if (edit != null) {
      _contentController.text = edit.content;
      _selectedTags.addAll(initialTagsForPost(edit));
      _mediaItems.addAll(
        edit.mediaUrls.take(AppConstants.maxPostMediaCount).map((u) => DraftMediaItem(source: u)),
      );
    } else if (widget.openImagePickerOnStart || widget.openVideoPickerOnStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        widget.openImagePickerOnStart ? _pickFromGallery() : _pickVideo();
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_focusScheduled || _isEditing || widget.openImagePickerOnStart || widget.openVideoPickerOnStart) {
      return;
    }
    _focusScheduled = true;
    final anim = ModalRoute.of(context)?.animation;
    if (anim != null && anim.status != AnimationStatus.completed) {
      _routeAnimation = anim;
      anim.addStatusListener(_onRouteAnimationStatus);
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_isSubmitting) _contentFocusNode.requestFocus();
      });
    }
  }

  void _onRouteAnimationStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) {
      _routeAnimation?.removeStatusListener(_onRouteAnimationStatus);
      _routeAnimation = null;
      if (mounted && !_isSubmitting) _contentFocusNode.requestFocus();
    }
  }

  @override
  void dispose() {
    _routeAnimation?.removeStatusListener(_onRouteAnimationStatus);
    _contentController.dispose();
    _contentFocusNode.dispose();
    _tagFocusNode.dispose();
    if (_ownsTagsController) _tagsController.dispose();
    super.dispose();
  }

  Future<void> _pickFromGallery() async {
    if (_mediaItems.length >= AppConstants.maxPostMediaCount) {
      _showSnack('Ko\'pi bilan ${AppConstants.maxPostMediaCount} ta rasm biriktirish mumkin');
      return;
    }
    try {
      final picked = await _picker.pickMultiImage(
        imageQuality: 85,
        limit: AppConstants.maxPostMediaCount - _mediaItems.length,
      );
      if (picked.isNotEmpty) await _stageSelectedFiles(picked);
    } catch (_) {
      _showSnack('Galereyadan rasm tanlashda xatolik yuz berdi');
    }
  }

  Future<void> _pickFromCamera() async {
    if (_mediaItems.length >= AppConstants.maxPostMediaCount) {
      _showSnack('Ko\'pi bilan ${AppConstants.maxPostMediaCount} ta rasm biriktirish mumkin');
      return;
    }
    try {
      final photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
      if (photo != null) await _stageSelectedFiles([photo]);
    } catch (_) {
      _showSnack('Kamerani ishga tushirishda xatolik yuz berdi');
    }
  }

  Future<void> _pickVideo() async {
    if (_mediaItems.length >= AppConstants.maxPostMediaCount) {
      _showSnack('Ko\'pi bilan ${AppConstants.maxPostMediaCount} ta fayl biriktirish mumkin');
      return;
    }
    try {
      final video = await _picker.pickVideo(source: ImageSource.gallery);
      if (video == null || !mounted) return;
      await _uploadService.validateVideo(video);
      if (!mounted) return;
      setState(() {
        _mediaItems.add(DraftMediaItem(source: video.path, pendingFile: video, isVideo: true));
      });
    } on UploadException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Video tanlashda xatolik yuz berdi');
    }
  }

  Future<void> _stageSelectedFiles(List<XFile> files) async {
    try {
      for (final file in files) {
        if (_mediaItems.length >= AppConstants.maxPostMediaCount) break;
        await _uploadService.validateImage(file);
        if (!mounted) return;
        setState(() => _mediaItems.add(DraftMediaItem(source: file.path, pendingFile: file)));
      }
    } on UploadException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Rasmni tanlashda xatolik yuz berdi');
    }
  }

  void _showSnack(String message, {Color? bg}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: bg == AppColors.success
                ? const TextStyle(
                    color: AppColors.onSuccess,
                    fontWeight: FontWeight.w600,
                  )
                : null,
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: bg,
        ),
      );
  }

  Future<void> _handleSubmit() async {
    if (_isSubmitting) return;
    final content = _contentController.text.trim();
    if (content.length < 5) {
      _showSnack('Post matni kamida 5 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    _contentFocusNode.unfocus();
    _tagFocusNode.unfocus();
    setState(() => _isSubmitting = true);
    try {
      await submitCreateOrEditPost(
        feedController: widget.feedController,
        authController: widget.authController,
        uploadService: _uploadService,
        editingPost: widget.editingPost,
        content: content,
        selectedTags: _selectedTags,
        mediaItems: _mediaItems,
      );
      await _tagsController.loadTrending(forceRefresh: true);
      if (mounted) {
        Navigator.of(context).pop(true);
        _showSnack(
          _isEditing ? 'Post yangilandi!' : 'Postingiz muvaffaqiyatli chop etildi!',
          bg: AppColors.success,
        );
      }
    } on UploadException catch (e) {
      _showSnack(e.message);
    } catch (e) {
      _showSnack(e.toString());
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentUser = widget.authController.currentUser;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () {
            _contentFocusNode.unfocus();
            _tagFocusNode.unfocus();
            Navigator.of(context).pop();
          },
          icon: const Icon(Icons.arrow_back_rounded, size: 22),
        ),
        titleSpacing: 4,
        title: Text(_isEditing ? 'Postni tahrirlash' : 'Post yaratish'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: CreatePostSubmitButton(
                controller: _contentController, isEditing: _isEditing,
                isSubmitting: _isSubmitting, onSubmit: _handleSubmit,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const BouncingScrollPhysics(),
              children: [
                const SizedBox(height: 8),
                CreatePostAuthorRow(
                  userName: currentUser.name, userAvatarUrl: currentUser.avatarUrl,
                  userHandle: currentUser.handle, selectedVisibility: _selectedVisibility,
                  isDark: isDark, onVisibilityChanged: (opt) => setState(() => _selectedVisibility = opt),
                ),
                const SizedBox(height: 16),
                TextField(
                  key: const ValueKey('create_post_content_field'),
                  controller: _contentController, focusNode: _contentFocusNode,
                  maxLines: null, minLines: 7, maxLength: AppConstants.maxPostContentLength,
                  cursorColor: AppColors.primary,
                  style: TextStyle(fontSize: 16, height: 1.5, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  decoration: InputDecoration(
                    hintText: 'Nima haqida ulashmoqchisiz? (fikrlar, yangiliklar, g\'oyalar...)',
                    hintStyle: TextStyle(fontSize: 16, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                    filled: false, border: InputBorder.none, enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none, contentPadding: EdgeInsets.zero, counterText: '',
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 6, bottom: 12),
                    child: ValueListenableBuilder<TextEditingValue>(
                      valueListenable: _contentController,
                      builder: (context, value, _) {
                        final count = value.text.length;
                        final atLimit = count >= AppConstants.maxPostContentLength;
                        return Text(
                          '$count / ${AppConstants.maxPostContentLength}',
                          style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w500,
                            color: atLimit ? AppColors.danger : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight, height: 1),
                const SizedBox(height: 18),
                if (!_isEditing) ...[
                  CreatePostMediaSection(
                    mediaItems: _mediaItems, isSubmitting: _isSubmitting, isDark: isDark,
                    onPickGallery: _pickFromGallery, onPickCamera: _pickFromCamera,
                    onPickVideo: _pickVideo, onRemoveAt: (idx) => setState(() => _mediaItems.removeAt(idx)),
                  ),
                  const SizedBox(height: 24),
                ],
                DynamicTagSelector(
                  controller: _tagsController, selectedTags: _selectedTags, focusNode: _tagFocusNode,
                  onChanged: (next) => setState(() => _selectedTags..clear()..addAll(next)),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
          CreatePostBottomToolbar(
            isDark: isDark, isSubmitting: _isSubmitting,
            onPickGallery: _pickFromGallery, onPickCamera: _pickFromCamera, onPickVideo: _pickVideo,
            onAddCustomTopic: () => _tagFocusNode.requestFocus(),
            onDismissKeyboard: () { _contentFocusNode.unfocus(); _tagFocusNode.unfocus(); },
          ),
        ],
      ),
    );
  }
}
