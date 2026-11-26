enum SocialActionType {
  like,
  bookmark,
  share;

  static SocialActionType fromWire(String raw) {
    switch (raw) {
      case 'like':
        return SocialActionType.like;
      case 'bookmark':
        return SocialActionType.bookmark;
      case 'share':
        return SocialActionType.share;
      default:
        return SocialActionType.like;
    }
  }
}

enum PendingActionStatus {
  pending,
  syncing,
  failed;

  static PendingActionStatus fromWire(String raw) {
    switch (raw) {
      case 'syncing':
        return PendingActionStatus.syncing;
      case 'failed':
        return PendingActionStatus.failed;
      default:
        return PendingActionStatus.pending;
    }
  }
}

/// Immutable durable representation of a user-initiated social action
/// awaiting confirmation from the backend synchronization endpoint.
class PendingAction {
  final String idempotencyKey;
  final String postId;
  final SocialActionType type;
  final bool? desiredState;
  final DateTime createdAt;
  final int retryCount;
  final DateTime nextRetryAt;
  final PendingActionStatus status;
  final String? lastError;

  const PendingAction({
    required this.idempotencyKey,
    required this.postId,
    required this.type,
    this.desiredState,
    required this.createdAt,
    this.retryCount = 0,
    required this.nextRetryAt,
    this.status = PendingActionStatus.pending,
    this.lastError,
  });

  bool isReadyAt(DateTime now) =>
      status == PendingActionStatus.pending && !nextRetryAt.isAfter(now);

  PendingAction copyWith({
    String? idempotencyKey,
    bool? desiredState,
    DateTime? createdAt,
    int? retryCount,
    DateTime? nextRetryAt,
    PendingActionStatus? status,
    String? lastError,
    bool clearLastError = false,
  }) {
    return PendingAction(
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
      postId: postId,
      type: type,
      desiredState: desiredState ?? this.desiredState,
      createdAt: createdAt ?? this.createdAt,
      retryCount: retryCount ?? this.retryCount,
      nextRetryAt: nextRetryAt ?? this.nextRetryAt,
      status: status ?? this.status,
      lastError: clearLastError ? null : (lastError ?? this.lastError),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'idempotencyKey': idempotencyKey,
      'postId': postId,
      'type': type.name,
      if (desiredState != null) 'desiredState': desiredState,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
      'nextRetryAt': nextRetryAt.toIso8601String(),
      'status': status.name,
      if (lastError != null) 'lastError': lastError,
    };
  }

  factory PendingAction.fromJson(Map<String, dynamic> json) {
    final created = DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
        DateTime.now();
    return PendingAction(
      idempotencyKey: json['idempotencyKey'] as String? ?? '',
      postId: json['postId'] as String? ?? '',
      type: SocialActionType.fromWire(json['type'] as String? ?? 'like'),
      desiredState: json['desiredState'] as bool?,
      createdAt: created,
      retryCount: json['retryCount'] as int? ?? 0,
      nextRetryAt:
          DateTime.tryParse(json['nextRetryAt']?.toString() ?? '') ?? created,
      status: PendingActionStatus.fromWire(
        json['status'] as String? ?? 'pending',
      ),
      lastError: json['lastError'] as String?,
    );
  }
}
