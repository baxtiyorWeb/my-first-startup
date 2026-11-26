import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../models/author.dart';
import '../models/post.dart';
import '../models/comment.dart';
import '../models/feed_category.dart';

class FeedPageResult {
  final List<Post> posts;
  final String? nextCursor;

  const FeedPageResult({
    required this.posts,
    this.nextCursor,
  });
}

abstract class FeedRepository {
  Future<FeedPageResult> getPostsPage({
    String? filterTab,
    String? sortBy,
    String? tag,
    String? category,
    String? cursor,
    int limit = 20,
  });
  Future<List<FeedCategory>> getCategories({String? kind});
  Future<FeedPageResult> getShortsPage({
    String filter = 'for_you',
    String? cursor,
    int limit = 20,
  });
  Future<List<Post>> getPosts({String? filterTab, String? sortBy, String? tag, String? cursor});
  Future<List<Post>> getShorts({String filter = 'for_you', String? cursor});
  Future<List<Post>> getBookmarks({int limit = 40});
  Future<Post> createPost({
    required Author author,
    required String content,
    String? title,
    String postType = 'thought',
    String? contentKind,
    String? topic,
    String? projectStage,
    String? lookingFor,
    String? projectUrl,
    String? videoUrl,
    int? videoDurationSeconds,
    List<String> mediaUrls = const [],
    List<String> tags = const [],
    List<String> tagIds = const [],
  });
  Future<Post?> updatePost(
    String postId, {
    String? title,
    required String content,
    List<String>? tags,
    List<String>? tagIds,
  });
  Future<bool> deletePost(String postId);
  Future<bool> toggleLike(String postId);
  Future<bool> toggleBookmark(String postId);
  Future<bool> toggleFollowAuthor(String handle);
  Future<int> recordView(String postId);
  Future<List<Comment>> getComments(String postId);
  Future<Comment> addComment(String postId, Author author, String content, {String? parentId});
  Future<void> toggleCommentLike(String postId, String commentId);
}

class FeedRepositoryImpl implements FeedRepository {
  final ApiClient _apiClient;

  FeedRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  ApiClient get apiClient => _apiClient;

  @override
  Future<FeedPageResult> getPostsPage({
    String? filterTab,
    String? sortBy,
    String? tag,
    String? category,
    String? cursor,
    int limit = 20,
  }) async {
    final queryParams = <String, String>{'limit': '$limit'};
    if (filterTab == 'project') {
      queryParams['type'] = 'project';
    } else if (filterTab == 'posts' || filterTab == 'thought') {
      queryParams['kind'] = 'thought';
    } else if (filterTab == 'articles') {
      queryParams['kind'] = 'article';
    } else if (filterTab == 'videos') {
      queryParams['kind'] = 'video';
    }
    if (tag != null && tag.trim().isNotEmpty) {
      queryParams['tag'] = tag.trim();
    }
    if (category != null && category.trim().isNotEmpty) {
      queryParams['category'] = category.trim().toLowerCase();
    }
    if (cursor != null && cursor.isNotEmpty) {
      queryParams['cursor'] = cursor;
    }

    final decoded = await _apiClient.get(
      ApiConstants.postsEndpoint,
      queryParameters: queryParams,
    );

    final rawList = decoded['data'] as List<dynamic>? ?? const [];
    final meta = decoded['meta'] as Map<String, dynamic>?;
    final posts = rawList
        .whereType<Map<String, dynamic>>()
        .map(Post.fromJson)
        .toList();

    return FeedPageResult(
      posts: _applyLocalSort(posts, filterTab, sortBy),
      nextCursor: meta?['nextCursor'] as String?,
    );
  }

  @override
  Future<List<FeedCategory>> getCategories({String? kind}) async {
    final decoded = await _apiClient.get(
      ApiConstants.postsCategoriesEndpoint,
      queryParameters: {
        if (kind != null && kind.isNotEmpty && kind != 'all') 'kind': kind,
      },
    );
    final rawList = decoded['data'] as List<dynamic>? ?? const [];
    return rawList
        .whereType<Map<String, dynamic>>()
        .map(FeedCategory.fromJson)
        .where((c) => c.slug.isNotEmpty)
        .toList();
  }

  @override
  Future<List<Post>> getPosts({
    String? filterTab,
    String? sortBy,
    String? tag,
    String? cursor,
  }) async {
    final page = await getPostsPage(
      filterTab: filterTab,
      sortBy: sortBy,
      tag: tag,
      cursor: cursor,
    );
    return page.posts;
  }

  @override
  Future<FeedPageResult> getShortsPage({
    String filter = 'for_you',
    String? cursor,
    int limit = 20,
  }) async {
    final queryParams = <String, String>{
      'filter': filter,
      'limit': '$limit',
      if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
    };
    final decoded = await _apiClient.get(
      ApiConstants.shortsEndpoint,
      queryParameters: queryParams,
    );
    final rawList = decoded['data'] as List<dynamic>? ?? const [];
    final meta = decoded['meta'] as Map<String, dynamic>?;
    return FeedPageResult(
      posts: rawList
          .whereType<Map<String, dynamic>>()
          .map(Post.fromJson)
          .toList(),
      nextCursor: meta?['nextCursor'] as String?,
    );
  }

  @override
  Future<List<Post>> getShorts({String filter = 'for_you', String? cursor}) async {
    final page = await getShortsPage(filter: filter, cursor: cursor);
    return page.posts;
  }

  @override
  Future<List<Post>> getBookmarks({int limit = 40}) async {
    final decoded = await _apiClient.get(
      ApiConstants.bookmarksEndpoint,
      queryParameters: {'limit': '$limit'},
    );
    final rawList = decoded['data'] as List<dynamic>? ?? const [];
    return rawList
        .whereType<Map<String, dynamic>>()
        .map(Post.fromJson)
        .toList();
  }

  List<Post> _applyLocalSort(List<Post> posts, String? filterTab, String? sortBy) {
    var result = List<Post>.from(posts);
    if (filterTab == 'shorts') {
      result = result.where((p) => p.isShort).toList();
    }
    if (sortBy == 'popular') {
      result.sort((a, b) => b.likesCount.compareTo(a.likesCount));
    } else if (sortBy == 'views') {
      result.sort((a, b) => b.viewsCount.compareTo(a.viewsCount));
    } else {
      result.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }
    return result;
  }

  @override
  Future<Post> createPost({
    required Author author,
    required String content,
    String? title,
    String postType = 'thought',
    String? contentKind,
    String? topic,
    String? projectStage,
    String? lookingFor,
    String? projectUrl,
    String? videoUrl,
    int? videoDurationSeconds,
    List<String> mediaUrls = const [],
    List<String> tags = const [],
    List<String> tagIds = const [],
  }) async {
    final payload = <String, dynamic>{
      'content': content,
      'postType': postType,
      'contentKind': contentKind ?? (videoUrl != null ? 'video' : 'thought'),
      if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      if (topic != null && topic.trim().isNotEmpty) 'category': topic.trim(),
      'projectStage': ?projectStage,
      'lookingFor': ?lookingFor,
      if (projectUrl != null && projectUrl.trim().isNotEmpty) 'projectUrl': projectUrl.trim(),
      if (videoUrl != null && videoUrl.trim().isNotEmpty) 'videoUrl': videoUrl.trim(),
      if (videoDurationSeconds != null && videoDurationSeconds > 0)
        'videoDurationSeconds': videoDurationSeconds,
      'mediaUrls': mediaUrls,
      'tags': tags,
      if (tagIds.isNotEmpty) 'tagIds': tagIds,
    };

    final decoded = await _apiClient.post(ApiConstants.postsEndpoint, body: payload);
    return Post.fromJson(decoded['data'] as Map<String, dynamic>);
  }

  @override
  Future<Post?> updatePost(
    String postId, {
    String? title,
    required String content,
    List<String>? tags,
    List<String>? tagIds,
  }) async {
    final decoded = await _apiClient.patch(
      '${ApiConstants.postsEndpoint}/$postId',
      body: {
        'content': content,
        'title': ?title,
        'tags': ?tags,
        'tagIds': ?tagIds,
      },
    );
    return Post.fromJson(decoded['data'] as Map<String, dynamic>);
  }

  @override
  Future<bool> deletePost(String postId) async {
    await _apiClient.delete('${ApiConstants.postsEndpoint}/$postId');
    return true;
  }

  @override
  Future<bool> toggleLike(String postId) async {
    final decoded = await _apiClient.post('${ApiConstants.postsEndpoint}/$postId/like');
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return (data['isLiked'] as bool?) ?? (data['liked'] as bool?) ?? false;
  }

  @override
  Future<bool> toggleBookmark(String postId) async {
    final decoded = await _apiClient.post('${ApiConstants.postsEndpoint}/$postId/bookmark');
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return (data['isSaved'] as bool?) ?? (data['saved'] as bool?) ?? false;
  }

  @override
  Future<bool> toggleFollowAuthor(String handle) async {
    final cleanHandle = handle.replaceFirst('@', '').trim();
    final decoded = await _apiClient.post('${ApiConstants.usersEndpoint}/$cleanHandle/follow');
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return (data['isFollowing'] as bool?) ?? (data['following'] as bool?) ?? false;
  }

  @override
  Future<int> recordView(String postId) async {
    try {
      final decoded = await _apiClient.post('${ApiConstants.postsEndpoint}/$postId/view');
      final data = decoded['data'] as Map<String, dynamic>? ?? const {};
      return (data['viewsCount'] as int?) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  @override
  Future<List<Comment>> getComments(String postId) async {
    final decoded = await _apiClient.get('${ApiConstants.postsEndpoint}/$postId/comments');
    final rawList = decoded['data'] as List<dynamic>? ?? const [];
    return rawList
        .whereType<Map<String, dynamic>>()
        .map(Comment.fromJson)
        .toList();
  }

  @override
  Future<Comment> addComment(
    String postId,
    Author author,
    String content, {
    String? parentId,
  }) async {
    final decoded = await _apiClient.post(
      '${ApiConstants.postsEndpoint}/$postId/comments',
      body: {
        'content': content,
        'parentId': ?parentId,
      },
    );
    return Comment.fromJson(decoded['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> toggleCommentLike(String postId, String commentId) async {
    await _apiClient.post('${ApiConstants.commentsEndpoint}/$commentId/like');
  }
}
