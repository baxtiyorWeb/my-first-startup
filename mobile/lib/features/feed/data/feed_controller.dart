import 'package:material_ui/material_ui.dart';
import '../../../core/cache/local_cache_store.dart';
import '../../../core/network/api_client.dart';
import '../models/author.dart';
import '../models/post.dart';
import 'feed_cache_helper.dart';
import 'feed_repository.dart';
import 'post_action_controller.dart';
import 'post_action_repository.dart';
import 'post_action_service.dart';

class FeedController extends ChangeNotifier {
  final FeedRepository _repository;
  final LocalCacheStore _cacheStore;
  final PostActionController actionController;
  final bool _ownsActionController;

  List<Post> _rawPosts = [];
  List<Post> _rawShorts = [];
  List<Post> _rawBookmarks = [];
  String? _postsNextCursor;
  String? _shortsNextCursor;

  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _isShortsLoading = false;
  bool _isLoadingMoreShorts = false;
  bool _isBookmarksLoading = false;
  String? _errorMessage;
  String? _shortsErrorMessage;
  String _activeTab = 'all';
  String _activeSort = 'latest';
  String _activeShortsFilter = 'for_you';
  String? _selectedTopicFilter;

  FeedController(
    this._repository, {
    LocalCacheStore? cacheStore,
    PostActionController? actionController,
    bool autoLoad = true,
  })  : _cacheStore = cacheStore ?? LocalCacheStore(),
        _ownsActionController = actionController == null,
        actionController = actionController ??
            PostActionController(
              repository: PostActionRepository(
                apiClient: _repository is FeedRepositoryImpl ? _repository.apiClient : ApiClient(),
              ),
            ) {
    this.actionController.addListener(notifyListeners);
    if (autoLoad) {
      loadPosts();
    } else {
      _isLoading = false;
    }
  }

  FeedRepository get repository => _repository;
  LocalCacheStore get cacheStore => _cacheStore;
  List<Post> get posts => _rawPosts.map(actionController.resolvePost).toList();
  List<Post> get shorts => _rawShorts.map(actionController.resolvePost).toList();
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMorePosts => _postsNextCursor != null && _postsNextCursor!.isNotEmpty;
  bool get isShortsLoading => _isShortsLoading;
  bool get isLoadingMoreShorts => _isLoadingMoreShorts;
  bool get hasMoreShorts => _shortsNextCursor != null && _shortsNextCursor!.isNotEmpty;
  bool get isBookmarksLoading => _isBookmarksLoading;
  String? get errorMessage => _errorMessage;
  String? get shortsErrorMessage => _shortsErrorMessage;
  String get activeTab => _activeTab;
  String get activeSort => _activeSort;
  String get activeShortsFilter => _activeShortsFilter;
  String? get selectedTopicFilter => _selectedTopicFilter;
  int get pendingSyncCount => actionController.pendingSyncCount;

  Post resolvePost(Post post) => actionController.resolvePost(post);

  Post? findPostById(String postId) {
    for (final list in [_rawPosts, _rawShorts, _rawBookmarks]) {
      for (final p in list) {
        if (p.id == postId) return actionController.resolvePost(p);
      }
    }
    return null;
  }

  List<Post> get visiblePosts => FeedCacheHelper.filterByTopic(posts, _selectedTopicFilter);

  List<Post> get bookmarkedPosts => FeedCacheHelper.collectBookmarked(
        sources: [
          ..._rawBookmarks,
          ..._rawPosts,
          ..._rawShorts,
          ...actionController.offlineBookmarkedPosts,
        ],
        resolve: actionController.resolvePost,
      );

  List<Post> get projectPosts => posts.where((p) => p.isProject).toList();

  List<Post> postsByAuthor(String handle) {
    final clean = handle.replaceFirst('@', '').toLowerCase();
    return posts.where((p) => p.author.handle.replaceFirst('@', '').toLowerCase() == clean).toList();
  }

  Future<void> setActiveUser(String? userId) async {
    final nextScope = (userId == null || userId.isEmpty) ? 'guest' : userId;
    final switching = _cacheStore.userScope != nextScope;
    _cacheStore.setUserScope(nextScope);
    if (switching) {
      _resetInMemoryLists();
      notifyListeners();
    }
    await actionController.setActiveUser(nextScope);
  }

  Future<void> clearUserData(String? userId) async {
    final scope = (userId == null || userId.isEmpty) ? _cacheStore.userScope : userId;
    _resetInMemoryLists();
    await _cacheStore.clearUserScope(scope);
    _cacheStore.setUserScope('guest');
    await actionController.clearUserState(scope);
    notifyListeners();
  }

  void _resetInMemoryLists() {
    _rawPosts = [];
    _rawShorts = [];
    _rawBookmarks = [];
    _postsNextCursor = null;
    _shortsNextCursor = null;
  }

  Future<void> loadPosts({bool forceRefresh = false}) async {
    final cacheKey = 'posts_${_activeTab}_${_activeSort}_${_selectedTopicFilter ?? 'all'}';
    if (!forceRefresh && _rawPosts.isEmpty) {
      final cached = await FeedCacheHelper.readCachedPosts(_cacheStore, cacheKey);
      if (cached != null) {
        actionController.ingestPosts(cached);
        _rawPosts = cached;
        _isLoading = false;
        notifyListeners();
      }
    }
    if (_rawPosts.isEmpty) {
      _isLoading = true;
      notifyListeners();
    }
    _errorMessage = null;
    try {
      final page = await _repository.getPostsPage(
        filterTab: _activeTab, sortBy: _activeSort, tag: _selectedTopicFilter, limit: 20,
      );
      actionController.ingestPosts(page.posts);
      _rawPosts = page.posts;
      _postsNextCursor = page.nextCursor;
      await FeedCacheHelper.writeCachedPosts(_cacheStore, cacheKey, page.posts);
      actionController.syncEngine.syncNow();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMorePosts() async {
    if (_isLoadingMore || _postsNextCursor == null || _postsNextCursor!.isEmpty) return;
    _isLoadingMore = true;
    notifyListeners();
    try {
      final page = await _repository.getPostsPage(
        filterTab: _activeTab, sortBy: _activeSort, tag: _selectedTopicFilter, cursor: _postsNextCursor, limit: 20,
      );
      actionController.ingestPosts(page.posts);
      _rawPosts = FeedCacheHelper.mergePaginated(_rawPosts, page.posts);
      _postsNextCursor = page.nextCursor;
    } catch (_) {
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  Future<void> loadShorts({String? filter, bool forceRefresh = false}) async {
    if (filter != null) _activeShortsFilter = filter;
    final cacheKey = 'shorts_$_activeShortsFilter';
    if (!forceRefresh && _rawShorts.isEmpty) {
      final memHit = _cacheStore.peekMemory(cacheKey, allowStale: true);
      if (memHit != null && memHit.data is List) {
        final decoded = (memHit.data as List).whereType<Map<String, dynamic>>().map(Post.fromJson).toList();
        if (decoded.isNotEmpty) {
          actionController.ingestPosts(decoded);
          _rawShorts = decoded;
          _isShortsLoading = false;
          notifyListeners();
        }
      }
    }
    if (_rawShorts.isEmpty) {
      _isShortsLoading = true;
      notifyListeners();
      if (!forceRefresh) {
        final cached = await FeedCacheHelper.readCachedPosts(_cacheStore, cacheKey);
        if (cached != null) {
          actionController.ingestPosts(cached);
          _rawShorts = cached;
          _isShortsLoading = false;
          notifyListeners();
        }
      }
    }
    _shortsErrorMessage = null;
    try {
      final page = await _repository.getShortsPage(filter: _activeShortsFilter, limit: 20);
      actionController.ingestPosts(page.posts);
      _rawShorts = page.posts;
      _shortsNextCursor = page.nextCursor;
      await FeedCacheHelper.writeCachedPosts(_cacheStore, cacheKey, page.posts);
      actionController.syncEngine.syncNow();
    } catch (e) {
      _shortsErrorMessage = e.toString();
    } finally {
      _isShortsLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreShorts() async {
    if (_isLoadingMoreShorts || _shortsNextCursor == null || _shortsNextCursor!.isEmpty) return;
    _isLoadingMoreShorts = true;
    notifyListeners();
    try {
      final page = await _repository.getShortsPage(
        filter: _activeShortsFilter,
        cursor: _shortsNextCursor,
        limit: 20,
      );
      actionController.ingestPosts(page.posts);
      _rawShorts = FeedCacheHelper.mergePaginated(_rawShorts, page.posts);
      _shortsNextCursor = page.nextCursor;
    } catch (_) {
    } finally {
      _isLoadingMoreShorts = false;
      notifyListeners();
    }
  }

  Future<void> loadBookmarks({bool forceRefresh = false}) async {
    const cacheKey = 'bookmarks_list';
    if (!forceRefresh && _rawBookmarks.isEmpty) {
      final cached = await FeedCacheHelper.readCachedPosts(_cacheStore, cacheKey);
      if (cached != null) {
        actionController.ingestPosts(cached);
        _rawBookmarks = cached;
        notifyListeners();
      }
    }
    _isBookmarksLoading = true;
    notifyListeners();
    try {
      final saved = await _repository.getBookmarks(limit: 40);
      actionController.ingestPosts(saved);
      _rawBookmarks = saved;
      await FeedCacheHelper.writeCachedPosts(_cacheStore, cacheKey, saved);
    } catch (_) {
    } finally {
      _isBookmarksLoading = false;
      notifyListeners();
    }
  }

  void setFilterTab(String tab) {
    if (_activeTab == tab) return;
    _activeTab = tab;
    _rawPosts = [];
    _postsNextCursor = null;
    loadPosts();
  }

  void setSortBy(String sort) {
    if (_activeSort == sort) return;
    _activeSort = sort;
    _rawPosts = [];
    _postsNextCursor = null;
    loadPosts();
  }

  void setTopicFilter(String? topic) {
    final next = _selectedTopicFilter == topic ? null : topic;
    if (_selectedTopicFilter == next) return;
    _selectedTopicFilter = next;
    _rawPosts = [];
    _postsNextCursor = null;
    loadPosts();
  }

  Future<Post> createPost({
    required Author author, required String content, String? title,
    String postType = 'thought', String? contentKind, String? topic,
    String? projectStage, String? lookingFor, String? projectUrl,
    String? videoUrl, int? videoDurationSeconds,
    List<String> mediaUrls = const [], List<String> tags = const [], List<String> tagIds = const [],
  }) async {
    final created = await _repository.createPost(
      author: author, content: content, title: title, postType: postType,
      contentKind: contentKind, topic: topic, projectStage: projectStage,
      lookingFor: lookingFor, projectUrl: projectUrl, videoUrl: videoUrl,
      videoDurationSeconds: videoDurationSeconds, mediaUrls: mediaUrls, tags: tags, tagIds: tagIds,
    );
    await _cacheStore.invalidatePrefix('posts_');
    await loadPosts(forceRefresh: true);
    if (created.isShort) {
      await _cacheStore.invalidatePrefix('shorts_');
      await loadShorts(forceRefresh: true);
    }
    return created;
  }

  Future<void> updatePost(
    String postId, {String? title, required String content, List<String>? tags, List<String>? tagIds}
  ) async {
    await _repository.updatePost(postId, title: title, content: content, tags: tags, tagIds: tagIds);
    await _cacheStore.invalidatePrefix('posts_');
    await _cacheStore.invalidatePrefix('shorts_');
    await loadPosts(forceRefresh: true);
  }

  Future<void> deletePost(String postId) async {
    await _repository.deletePost(postId);
    _rawPosts.removeWhere((p) => p.id == postId);
    _rawShorts.removeWhere((p) => p.id == postId);
    _rawBookmarks.removeWhere((p) => p.id == postId);
    await _cacheStore.invalidatePrefix('posts_');
    await _cacheStore.invalidatePrefix('shorts_');
    await _cacheStore.invalidatePrefix('bookmarks_');
    notifyListeners();
  }

  Future<bool> toggleLike(String postId) async {
    final target = findPostById(postId);
    if (target == null) return false;
    return actionController.toggleLike(target);
  }

  Future<bool> toggleBookmark(String postId) async {
    final target = findPostById(postId);
    if (target == null) return false;
    final nextSaved = await actionController.toggleBookmark(target);
    await _cacheStore.invalidatePrefix('bookmarks_');
    return nextSaved;
  }

  Future<ShareDispatchResult> sharePost(Post post) => actionController.sharePost(post);

  void incrementCommentCount(String postId) {
    _rawPosts = FeedCacheHelper.incrementComment(_rawPosts, postId);
    _rawShorts = FeedCacheHelper.incrementComment(_rawShorts, postId);
    actionController.incrementCommentCount(postId);
    notifyListeners();
  }

  Future<bool> toggleFollowAuthor(String handle) async {
    final nextFollow = await _repository.toggleFollowAuthor(handle);
    _rawPosts = FeedCacheHelper.updateAuthorFollow(_rawPosts, handle, nextFollow);
    _rawShorts = FeedCacheHelper.updateAuthorFollow(_rawShorts, handle, nextFollow);
    notifyListeners();
    return nextFollow;
  }

  Future<void> recordView(String postId) async {
    final views = await _repository.recordView(postId);
    if (views <= 0) return;
    _rawPosts = FeedCacheHelper.updateViews(_rawPosts, postId, views);
    _rawShorts = FeedCacheHelper.updateViews(_rawShorts, postId, views);
    actionController.updateViewsCount(postId, views);
    notifyListeners();
  }

  @override
  void dispose() {
    actionController.removeListener(notifyListeners);
    if (_ownsActionController) actionController.dispose();
    super.dispose();
  }
}
