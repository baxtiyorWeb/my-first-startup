import 'package:material_ui/material_ui.dart';
import '../../../core/sync/action_sync_engine.dart';
import '../../../core/sync/offline_action_queue.dart';
import '../../../core/sync/pending_action.dart';
import '../models/post.dart';
import 'post_action_repository.dart';
import 'post_action_service.dart';

class PostInteractionState {
  final bool isLiked;
  final int likesCount;
  final bool isSaved;
  final int sharesCount;
  final int commentsCount;
  final int viewsCount;

  const PostInteractionState({
    required this.isLiked,
    required this.likesCount,
    required this.isSaved,
    required this.sharesCount,
    required this.commentsCount,
    required this.viewsCount,
  });

  factory PostInteractionState.fromPost(Post p) {
    return PostInteractionState(
      isLiked: p.isLiked,
      likesCount: p.likesCount,
      isSaved: p.isSaved,
      sharesCount: p.sharesCount,
      commentsCount: p.commentsCount,
      viewsCount: p.viewsCount,
    );
  }

  PostInteractionState copyWith({
    bool? isLiked,
    int? likesCount,
    bool? isSaved,
    int? sharesCount,
    int? commentsCount,
    int? viewsCount,
  }) {
    return PostInteractionState(
      isLiked: isLiked ?? this.isLiked,
      likesCount: likesCount ?? this.likesCount,
      isSaved: isSaved ?? this.isSaved,
      sharesCount: sharesCount ?? this.sharesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      viewsCount: viewsCount ?? this.viewsCount,
    );
  }
}

/// Unified, offline-first social interaction controller shared across
/// General Feed, Shorts, PostDetail, Bookmarks, Explore, Search, and Profile.
class PostActionController extends ChangeNotifier {
  final PostActionRepository repository;
  final PostActionService service;
  final OfflineActionQueue queue;
  late final ActionSyncEngine syncEngine;

  final Map<String, PostInteractionState> _states = {};
  final Map<String, PostInteractionState> _rollbackSnapshots = {};
  final Map<String, Post> _bookmarkedSnapshots = {};

  int _seqCounter = 0;
  String? _lastFeedbackMessage;

  PostActionController({
    required this.repository,
    PostActionService? service,
    OfflineActionQueue? queue,
  })  : service = service ?? PostActionService(),
        queue = queue ?? OfflineActionQueue() {
    syncEngine = ActionSyncEngine(
      queue: this.queue,
      repository: repository,
      onActionSynced: _handleActionSynced,
      onActionPermanentlyFailed: _handleActionFailed,
      onQueueChanged: notifyListeners,
    );
  }

  int get pendingSyncCount => queue.activeCount;
  List<PendingAction> get failedActions => queue.failedItems;
  String? get lastFeedbackMessage => _lastFeedbackMessage;
  List<Post> get offlineBookmarkedPosts =>
      _bookmarkedSnapshots.values.map(resolvePost).toList();

  void clearLastFeedback() {
    _lastFeedbackMessage = null;
  }

  Future<void> setActiveUser(String? userId) async {
    syncEngine.cancelScheduledTimers();
    _states.clear();
    _rollbackSnapshots.clear();
    _bookmarkedSnapshots.clear();
    _lastFeedbackMessage = null;
    await queue.setUserScope(userId);
    notifyListeners();
    if (queue.activeCount > 0) {
      syncEngine.scheduleSync(debounce: const Duration(milliseconds: 250));
    }
  }

  Future<void> clearUserState(String? userId) async {
    syncEngine.cancelScheduledTimers();
    _states.clear();
    _rollbackSnapshots.clear();
    _bookmarkedSnapshots.clear();
    _lastFeedbackMessage = null;
    await queue.clearScope(userId);
    notifyListeners();
  }

  String _nextIdempotencyKey(String postId, SocialActionType type) {
    _seqCounter += 1;
    final now = DateTime.now().microsecondsSinceEpoch;
    return '${type.name}_${postId}_${now}_$_seqCounter';
  }

  /// Merges server/cached posts without overriding active un-synced user actions.
  void ingestPosts(List<Post> incoming) {
    bool changed = false;
    for (final post in incoming) {
      final existing = _states[post.id];
      final hasLikePending = queue.hasActiveOverride(post.id, SocialActionType.like);
      final hasSavePending =
          queue.hasActiveOverride(post.id, SocialActionType.bookmark);
      final hasSharePending =
          queue.hasActiveOverride(post.id, SocialActionType.share);

      final next = PostInteractionState(
        isLiked: hasLikePending && existing != null ? existing.isLiked : post.isLiked,
        likesCount:
            hasLikePending && existing != null ? existing.likesCount : post.likesCount,
        isSaved: hasSavePending && existing != null ? existing.isSaved : post.isSaved,
        sharesCount: hasSharePending && existing != null
            ? existing.sharesCount
            : post.sharesCount,
        commentsCount: existing != null && existing.commentsCount > post.commentsCount
            ? existing.commentsCount
            : post.commentsCount,
        viewsCount: existing != null && existing.viewsCount > post.viewsCount
            ? existing.viewsCount
            : post.viewsCount,
      );

      if (existing == null ||
          existing.isLiked != next.isLiked ||
          existing.likesCount != next.likesCount ||
          existing.isSaved != next.isSaved ||
          existing.sharesCount != next.sharesCount ||
          existing.commentsCount != next.commentsCount ||
          existing.viewsCount != next.viewsCount) {
        _states[post.id] = next;
        changed = true;
      }

      if (next.isSaved) {
        _bookmarkedSnapshots[post.id] = post.copyWith(
          isLiked: next.isLiked,
          likesCount: next.likesCount,
          isSaved: true,
          sharesCount: next.sharesCount,
          commentsCount: next.commentsCount,
          viewsCount: next.viewsCount,
        );
      } else if (!hasSavePending) {
        _bookmarkedSnapshots.remove(post.id);
      }
    }
    if (changed) notifyListeners();
  }

  Post resolvePost(Post post) {
    final s = _states[post.id];
    if (s == null) return post;
    return post.copyWith(
      isLiked: s.isLiked,
      likesCount: s.likesCount,
      isSaved: s.isSaved,
      sharesCount: s.sharesCount,
      commentsCount: s.commentsCount,
      viewsCount: s.viewsCount,
    );
  }

  Future<bool> toggleLike(Post post) async {
    final resolved = resolvePost(post);
    final current = _states[post.id] ?? PostInteractionState.fromPost(resolved);
    final key = '${post.id}:like';
    _rollbackSnapshots.putIfAbsent(key, () => current);

    final nextLiked = !current.isLiked;
    final nextCount = nextLiked
        ? current.likesCount + 1
        : (current.likesCount > 0 ? current.likesCount - 1 : 0);

    _states[post.id] = current.copyWith(
      isLiked: nextLiked,
      likesCount: nextCount,
    );
    notifyListeners();

    final now = DateTime.now();
    await queue.enqueue(
      PendingAction(
        idempotencyKey: _nextIdempotencyKey(post.id, SocialActionType.like),
        postId: post.id,
        type: SocialActionType.like,
        desiredState: nextLiked,
        createdAt: now,
        nextRetryAt: now,
      ),
    );
    syncEngine.scheduleSync();
    return nextLiked;
  }

  Future<bool> toggleBookmark(Post post) async {
    final resolved = resolvePost(post);
    final current = _states[post.id] ?? PostInteractionState.fromPost(resolved);
    final key = '${post.id}:bookmark';
    _rollbackSnapshots.putIfAbsent(key, () => current);

    final nextSaved = !current.isSaved;
    final updated = current.copyWith(isSaved: nextSaved);
    _states[post.id] = updated;
    if (nextSaved) {
      _bookmarkedSnapshots[post.id] = resolved.copyWith(isSaved: true);
    } else {
      _bookmarkedSnapshots.remove(post.id);
    }
    notifyListeners();

    final now = DateTime.now();
    await queue.enqueue(
      PendingAction(
        idempotencyKey: _nextIdempotencyKey(post.id, SocialActionType.bookmark),
        postId: post.id,
        type: SocialActionType.bookmark,
        desiredState: nextSaved,
        createdAt: now,
        nextRetryAt: now,
      ),
    );
    syncEngine.scheduleSync();
    return nextSaved;
  }

  Future<ShareDispatchResult> sharePost(Post post) async {
    final resolved = resolvePost(post);
    final dispatch = await service.sharePost(resolved);

    final current = _states[post.id] ?? PostInteractionState.fromPost(resolved);
    final key = '${post.id}:share';
    _rollbackSnapshots.putIfAbsent(key, () => current);

    _states[post.id] = current.copyWith(sharesCount: current.sharesCount + 1);
    notifyListeners();

    final now = DateTime.now();
    await queue.enqueue(
      PendingAction(
        idempotencyKey: _nextIdempotencyKey(post.id, SocialActionType.share),
        postId: post.id,
        type: SocialActionType.share,
        createdAt: now,
        nextRetryAt: now,
      ),
    );
    syncEngine.scheduleSync();
    return dispatch;
  }

  void incrementCommentCount(String postId) {
    final current = _states[postId];
    if (current == null) return;
    _states[postId] = current.copyWith(commentsCount: current.commentsCount + 1);
    notifyListeners();
  }

  void updateViewsCount(String postId, int viewsCount) {
    final current = _states[postId];
    if (current == null || viewsCount <= current.viewsCount) return;
    _states[postId] = current.copyWith(viewsCount: viewsCount);
    notifyListeners();
  }

  void _handleActionSynced(PendingAction action, PostActionOutcome outcome) {
    final current = _states[action.postId];
    // Do not overwrite optimistic state if another newer action is queued behind it
    final hasTrailingOverride =
        action.type != SocialActionType.share &&
        queue.pendingItems.any(
          (p) => p.postId == action.postId && p.type == action.type,
        );
    if (current == null || hasTrailingOverride) return;

    _rollbackSnapshots.remove('${action.postId}:${action.type.name}');
    _states[action.postId] = current.copyWith(
      isLiked: outcome.isLiked ?? current.isLiked,
      likesCount: outcome.likesCount ?? current.likesCount,
      isSaved: outcome.isSaved ?? current.isSaved,
      sharesCount: outcome.sharesCount ?? current.sharesCount,
    );
    notifyListeners();
  }

  void _handleActionFailed(
    PendingAction action,
    String error,
    bool isNotFound,
  ) {
    final snapshotKey = '${action.postId}:${action.type.name}';
    final rollback = _rollbackSnapshots.remove(snapshotKey);
    final current = _states[action.postId];
    if (rollback != null && current != null) {
      switch (action.type) {
        case SocialActionType.like:
          _states[action.postId] = current.copyWith(
            isLiked: rollback.isLiked,
            likesCount: rollback.likesCount,
          );
          break;
        case SocialActionType.bookmark:
          _states[action.postId] = current.copyWith(isSaved: rollback.isSaved);
          if (!rollback.isSaved) _bookmarkedSnapshots.remove(action.postId);
          break;
        case SocialActionType.share:
          _states[action.postId] = current.copyWith(
            sharesCount: rollback.sharesCount,
          );
          break;
      }
    }
    _lastFeedbackMessage = isNotFound
        ? 'Post o\'chirilgan yoki topilmadi'
        : 'Sinxronizatsiya amalga oshmadi: $error';
    notifyListeners();
  }

  @override
  void dispose() {
    syncEngine.dispose();
    super.dispose();
  }
}
