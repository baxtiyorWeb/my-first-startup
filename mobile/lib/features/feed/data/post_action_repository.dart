import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sync/pending_action.dart';

class PostActionOutcome {
  final String idempotencyKey;
  final String postId;
  final SocialActionType type;
  final String status; // 'synced' | 'not_found' | 'failed'
  final bool? isLiked;
  final int? likesCount;
  final bool? isSaved;
  final int? sharesCount;
  final String? error;

  const PostActionOutcome({
    required this.idempotencyKey,
    required this.postId,
    required this.type,
    this.status = 'synced',
    this.isLiked,
    this.likesCount,
    this.isSaved,
    this.sharesCount,
    this.error,
  });

  bool get isSynced => status == 'synced';
  bool get isNotFound => status == 'not_found';
}

/// Repository dedicated to idempotent social actions and batch synchronization.
class PostActionRepository {
  final ApiClient _apiClient;

  PostActionRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  Future<PostActionOutcome> applyLike(
    String postId, {
    bool? desiredState,
    required String idempotencyKey,
  }) async {
    final decoded = await _apiClient.post(
      '${ApiConstants.postsEndpoint}/$postId/like',
      headers: {'Idempotency-Key': idempotencyKey},
      body: {
        'desiredState': ?desiredState,
        'idempotencyKey': idempotencyKey,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return PostActionOutcome(
      idempotencyKey: idempotencyKey,
      postId: postId,
      type: SocialActionType.like,
      isLiked: (data['isLiked'] as bool?) ?? (data['liked'] as bool?),
      likesCount: data['likesCount'] as int?,
    );
  }

  Future<PostActionOutcome> applyBookmark(
    String postId, {
    bool? desiredState,
    required String idempotencyKey,
  }) async {
    final decoded = await _apiClient.post(
      '${ApiConstants.postsEndpoint}/$postId/bookmark',
      headers: {'Idempotency-Key': idempotencyKey},
      body: {
        'desiredState': ?desiredState,
        'idempotencyKey': idempotencyKey,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return PostActionOutcome(
      idempotencyKey: idempotencyKey,
      postId: postId,
      type: SocialActionType.bookmark,
      isSaved: (data['isSaved'] as bool?) ?? (data['saved'] as bool?),
    );
  }

  Future<PostActionOutcome> recordShare(
    String postId, {
    required String idempotencyKey,
  }) async {
    final decoded = await _apiClient.post(
      '${ApiConstants.postsEndpoint}/$postId/share',
      headers: {'Idempotency-Key': idempotencyKey},
      body: {'idempotencyKey': idempotencyKey},
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return PostActionOutcome(
      idempotencyKey: idempotencyKey,
      postId: postId,
      type: SocialActionType.share,
      sharesCount: data['sharesCount'] as int?,
    );
  }

  Future<List<PostActionOutcome>> syncBatch(List<PendingAction> actions) async {
    final decoded = await _apiClient.post(
      ApiConstants.actionsSyncEndpoint,
      body: {
        'actions': actions
            .map(
              (a) => {
                'idempotencyKey': a.idempotencyKey,
                'postId': a.postId,
                'action': a.type.name,
                if (a.desiredState != null) 'desiredState': a.desiredState,
                'clientTimestamp': a.createdAt.toIso8601String(),
              },
            )
            .toList(),
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final rawResults = data['results'] as List<dynamic>? ?? const [];
    return rawResults.whereType<Map<String, dynamic>>().map((r) {
      return PostActionOutcome(
        idempotencyKey: r['idempotencyKey'] as String? ?? '',
        postId: r['postId'] as String? ?? '',
        type: SocialActionType.fromWire(r['action'] as String? ?? 'like'),
        status: r['status'] as String? ?? 'synced',
        isLiked: (r['isLiked'] as bool?) ?? (r['liked'] as bool?),
        likesCount: r['likesCount'] as int?,
        isSaved: (r['isSaved'] as bool?) ?? (r['saved'] as bool?),
        sharesCount: r['sharesCount'] as int?,
        error: r['error'] as String?,
      );
    }).toList();
  }
}
