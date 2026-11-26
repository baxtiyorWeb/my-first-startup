import 'dart:async';
import 'dart:math';
import 'package:material_ui/material_ui.dart';
import '../../features/feed/data/post_action_repository.dart';
import '../network/api_client.dart';
import 'offline_action_queue.dart';
import 'pending_action.dart';

typedef ActionSyncedCallback = void Function(
  PendingAction action,
  PostActionOutcome outcome,
);
typedef ActionFailedCallback = void Function(
  PendingAction action,
  String error,
  bool isNotFound,
);

/// Reliable offline synchronization engine featuring:
/// - debounce coalescing
/// - exponential backoff + jitter
/// - batch sync with per-item fallback
/// - app lifecycle resume auto-flush
/// - zero dangling timers when idle or disposed
class ActionSyncEngine with WidgetsBindingObserver {
  final OfflineActionQueue queue;
  final PostActionRepository repository;
  final ActionSyncedCallback? onActionSynced;
  final ActionFailedCallback? onActionPermanentlyFailed;
  final VoidCallback? onQueueChanged;
  final Random _random;

  Timer? _debounceTimer;
  Timer? _retryTimer;
  bool _isSyncing = false;
  bool _resyncRequested = false;
  bool _isDisposed = false;
  bool _observerAttached = false;

  ActionSyncEngine({
    required this.queue,
    required this.repository,
    this.onActionSynced,
    this.onActionPermanentlyFailed,
    this.onQueueChanged,
    Random? random,
  }) : _random = random ?? Random() {
    try {
      WidgetsBinding.instance.addObserver(this);
      _observerAttached = true;
    } catch (_) {}
  }

  bool get isSyncing => _isSyncing;

  /// Computes capped exponential backoff with +/-20% jitter.
  Duration calculateBackoffDelay(int retryNumber) {
    final safeRetry = retryNumber.clamp(1, 10);
    final expSeconds = min(60, 2 * (1 << (safeRetry - 1)));
    final jitterFactor = 0.8 + (_random.nextDouble() * 0.4);
    final ms = (expSeconds * 1000 * jitterFactor).round().clamp(500, 72000);
    return Duration(milliseconds: ms);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_isDisposed) {
      syncNow();
    }
  }

  void scheduleSync({Duration debounce = const Duration(milliseconds: 180)}) {
    if (_isDisposed) return;
    _debounceTimer?.cancel();
    _debounceTimer = Timer(debounce, () {
      _debounceTimer = null;
      if (!_isDisposed) {
        syncNow();
      }
    });
  }

  Future<void> syncNow({bool ignoreBackoff = false}) async {
    if (_isDisposed) return;
    if (_isSyncing) {
      _resyncRequested = true;
      return;
    }

    _isSyncing = true;
    _debounceTimer?.cancel();
    _debounceTimer = null;
    _retryTimer?.cancel();
    _retryTimer = null;

    try {
      await queue.ensureLoaded();
      final ready = queue.takeReadyActions(
        limit: 50,
        ignoreBackoff: ignoreBackoff,
      );
      if (ready.isEmpty) {
        _scheduleNextBackoffIfNeeded();
        return;
      }

      await queue.markSyncing(ready.map((e) => e.idempotencyKey));
      onQueueChanged?.call();

      List<PostActionOutcome> outcomes;
      try {
        outcomes = await repository.syncBatch(ready);
      } catch (e) {
        if (e is ApiException && (e.statusCode == 404 || e.statusCode == 501)) {
          outcomes = await _replayIndividually(ready);
        } else {
          await _handleBatchTransportError(ready, e);
          return;
        }
      }

      final byKey = {for (final o in outcomes) o.idempotencyKey: o};
      final succeededKeys = <String>[];

      for (final item in ready) {
        final outcome = byKey[item.idempotencyKey];
        if (outcome == null) {
          await queue.markRetry(
            item.idempotencyKey,
            calculateBackoffDelay(item.retryCount + 1),
            'Server javobi to\'liq emas',
          );
          continue;
        }

        if (outcome.isSynced) {
          succeededKeys.add(item.idempotencyKey);
          onActionSynced?.call(item, outcome);
        } else if (outcome.isNotFound) {
          succeededKeys.add(item.idempotencyKey);
          onActionPermanentlyFailed?.call(
            item,
            outcome.error ?? 'Post topilmadi',
            true,
          );
        } else {
          final err = outcome.error ?? 'Amalni sinxronizatsiya qilib bo\'lmadi';
          if (item.retryCount + 1 >= OfflineActionQueue.maxRetries) {
            await queue.markFailed(item.idempotencyKey, err);
            onActionPermanentlyFailed?.call(item, err, false);
          } else {
            await queue.markRetry(
              item.idempotencyKey,
              calculateBackoffDelay(item.retryCount + 1),
              err,
            );
          }
        }
      }

      if (succeededKeys.isNotEmpty) {
        await queue.markSucceeded(succeededKeys);
      }
    } finally {
      _isSyncing = false;
      onQueueChanged?.call();
      if (_resyncRequested && !_isDisposed) {
        _resyncRequested = false;
        await syncNow();
      } else {
        _scheduleNextBackoffIfNeeded();
      }
    }
  }

  Future<List<PostActionOutcome>> _replayIndividually(
    List<PendingAction> items,
  ) async {
    final results = <PostActionOutcome>[];
    for (final item in items) {
      try {
        late final PostActionOutcome res;
        switch (item.type) {
          case SocialActionType.like:
            res = await repository.applyLike(
              item.postId,
              desiredState: item.desiredState,
              idempotencyKey: item.idempotencyKey,
            );
            break;
          case SocialActionType.bookmark:
            res = await repository.applyBookmark(
              item.postId,
              desiredState: item.desiredState,
              idempotencyKey: item.idempotencyKey,
            );
            break;
          case SocialActionType.share:
            res = await repository.recordShare(
              item.postId,
              idempotencyKey: item.idempotencyKey,
            );
            break;
        }
        results.add(res);
      } catch (e) {
        if (e is ApiException && e.statusCode == 404) {
          results.add(
            PostActionOutcome(
              idempotencyKey: item.idempotencyKey,
              postId: item.postId,
              type: item.type,
              status: 'not_found',
              error: e.message,
            ),
          );
        } else {
          rethrow;
        }
      }
    }
    return results;
  }

  Future<void> _handleBatchTransportError(
    List<PendingAction> items,
    Object error,
  ) async {
    if (error is ApiException && error.statusCode == 401) {
      // Keep items pending cleanly until user re-authenticates
      for (final item in items) {
        await queue.markRetry(
          item.idempotencyKey,
          const Duration(seconds: 30),
          error.message,
        );
      }
      return;
    }

    if (error is ApiException && error.isPermanentRejection) {
      for (final item in items) {
        await queue.markFailed(item.idempotencyKey, error.message);
        onActionPermanentlyFailed?.call(
          item,
          error.message,
          error.statusCode == 404,
        );
      }
      return;
    }

    final retryErr = isConnectivityFailure(error)
        ? 'Internet aloqasi yo\'q, keyinroq qayta uriniladi'
        : error.toString();
    for (final item in items) {
      await queue.markRetry(
        item.idempotencyKey,
        calculateBackoffDelay(item.retryCount + 1),
        retryErr,
      );
    }
  }

  void _scheduleNextBackoffIfNeeded() {
    if (_isDisposed) return;
    _retryTimer?.cancel();
    _retryTimer = null;

    final nextAt = queue.earliestNextRetryAt();
    if (nextAt == null) return;

    final waitMs = nextAt.difference(DateTime.now()).inMilliseconds;
    final delay = Duration(milliseconds: waitMs <= 0 ? 500 : waitMs);
    _retryTimer = Timer(delay, () {
      _retryTimer = null;
      if (!_isDisposed) syncNow();
    });
  }

  void cancelScheduledTimers() {
    _debounceTimer?.cancel();
    _debounceTimer = null;
    _retryTimer?.cancel();
    _retryTimer = null;
  }

  void dispose() {
    _isDisposed = true;
    cancelScheduledTimers();
    if (_observerAttached) {
      try {
        WidgetsBinding.instance.removeObserver(this);
      } catch (_) {}
    }
  }
}
