import '../../../core/cache/local_cache_store.dart';
import '../models/post.dart';

/// Stateless helper routines for [FeedController] caching, filtering,
/// cursor-pagination deduplication, and immutable post list updates.
class FeedCacheHelper {
  FeedCacheHelper._();

  static Future<List<Post>?> readCachedPosts(
    LocalCacheStore store,
    String key,
  ) async {
    final cached = await store.readJson(key, allowStale: true);
    if (cached == null || cached.data is! List) return null;
    final decoded = (cached.data as List)
        .whereType<Map<String, dynamic>>()
        .map(Post.fromJson)
        .toList();
    return decoded.isEmpty ? null : decoded;
  }

  static Future<void> writeCachedPosts(
    LocalCacheStore store,
    String key,
    List<Post> posts, {
    Duration ttl = const Duration(minutes: 3),
  }) {
    return store.writeJson(
      key,
      posts.map((p) => p.toJson()).toList(),
      ttl: ttl,
    );
  }

  static List<Post> mergePaginated(List<Post> current, List<Post> incoming) {
    final existingIds = current.map((p) => p.id).toSet();
    return [
      ...current,
      ...incoming.where((p) => !existingIds.contains(p.id)),
    ];
  }

  static List<Post> filterByTopic(List<Post> resolved, String? topicFilter) {
    if (topicFilter == null || topicFilter.isEmpty) return resolved;
    final q = topicFilter.toLowerCase();
    return resolved.where((p) {
      return p.tagItems.any((t) =>
              t.slug.toLowerCase() == q ||
              t.name.toLowerCase() == q ||
              t.slug.toLowerCase().contains(q) ||
              t.name.toLowerCase().contains(q)) ||
          (p.topic != null && p.topic!.toLowerCase().contains(q)) ||
          p.tags.any((t) => t.toLowerCase().contains(q)) ||
          p.content.toLowerCase().contains(q) ||
          (p.title != null && p.title!.toLowerCase().contains(q));
    }).toList();
  }

  static List<Post> collectBookmarked({
    required Iterable<Post> sources,
    required Post Function(Post) resolve,
  }) {
    final byId = <String, Post>{};
    for (final p in sources) {
      final resolved = resolve(p);
      if (resolved.isSaved) {
        byId.putIfAbsent(resolved.id, () => resolved);
      }
    }
    return byId.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  static List<Post> updateAuthorFollow(
    List<Post> list,
    String handle,
    bool nextFollow,
  ) {
    final clean = handle.replaceFirst('@', '').toLowerCase();
    return list.map((p) {
      if (p.author.handle.replaceFirst('@', '').toLowerCase() != clean) {
        return p;
      }
      return p.copyWith(author: p.author.copyWith(isFollowing: nextFollow));
    }).toList();
  }

  static List<Post> incrementComment(List<Post> list, String postId) {
    return list
        .map(
          (p) => p.id == postId
              ? p.copyWith(commentsCount: p.commentsCount + 1)
              : p,
        )
        .toList();
  }

  static List<Post> updateViews(List<Post> list, String postId, int views) {
    return list
        .map((p) => p.id == postId ? p.copyWith(viewsCount: views) : p)
        .toList();
  }
}
