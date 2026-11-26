import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'pending_action.dart';

/// Durable SharedPreferences-backed queue with user-scope isolation,
/// toggle coalescing, and interrupted-sync recovery on app restart.
class OfflineActionQueue {
  static const int maxRetries = 5;
  static const String _keyPrefix = 'geters_sync_queue_v1_';

  final Future<SharedPreferences> Function() _prefsProvider;
  final List<PendingAction> _items = [];

  String _userScope;
  bool _loaded = false;
  Future<void>? _loadingFuture;

  OfflineActionQueue({
    String userScope = 'guest',
    Future<SharedPreferences> Function()? prefsProvider,
  })  : _userScope = _normalizeScope(userScope),
        _prefsProvider = prefsProvider ?? SharedPreferences.getInstance;

  String get userScope => _userScope;
  bool get isLoaded => _loaded;
  List<PendingAction> get allItems => List.unmodifiable(_items);
  List<PendingAction> get pendingItems => List.unmodifiable(
        _items.where((i) => i.status == PendingActionStatus.pending),
      );
  List<PendingAction> get syncingItems => List.unmodifiable(
        _items.where((i) => i.status == PendingActionStatus.syncing),
      );
  List<PendingAction> get failedItems => List.unmodifiable(
        _items.where((i) => i.status == PendingActionStatus.failed),
      );
  int get activeCount =>
      _items.where((i) => i.status != PendingActionStatus.failed).length;

  static String _normalizeScope(String? scope) {
    final trimmed = scope?.trim() ?? '';
    return trimmed.isEmpty ? 'guest' : trimmed;
  }

  String _storageKey(String scope) => '$_keyPrefix$scope';

  Future<void> setUserScope(String? scope) async {
    final next = _normalizeScope(scope);
    if (_userScope == next && _loaded) return;
    _userScope = next;
    _items.clear();
    _loaded = false;
    _loadingFuture = null;
    await ensureLoaded();
  }

  Future<void> ensureLoaded() {
    if (_loaded) return Future<void>.value();
    return _loadingFuture ??= _loadFromDisk();
  }

  Future<void> _loadFromDisk() async {
    try {
      final prefs = await _prefsProvider();
      final raw = prefs.getString(_storageKey(_userScope));
      _items.clear();
      bool recoveredSyncing = false;
      if (raw != null && raw.isNotEmpty) {
        final decoded = json.decode(raw);
        if (decoded is List) {
          for (final entry in decoded) {
            if (entry is Map<String, dynamic>) {
              var item = PendingAction.fromJson(entry);
              if (item.postId.isEmpty || item.idempotencyKey.isEmpty) continue;
              if (item.status == PendingActionStatus.syncing) {
                item = item.copyWith(status: PendingActionStatus.pending);
                recoveredSyncing = true;
              }
              _items.add(item);
            }
          }
        }
      }
      _loaded = true;
      if (recoveredSyncing) {
        await _persist();
      }
    } catch (_) {
      _loaded = true;
    } finally {
      _loadingFuture = null;
    }
  }

  bool hasActiveOverride(String postId, SocialActionType type) {
    return _items.any(
      (i) =>
          i.postId == postId &&
          i.type == type &&
          i.status != PendingActionStatus.failed,
    );
  }

  /// Enqueues an action, coalescing repeated pending toggle states
  /// for the same (postId, type) while preserving in-flight syncing items.
  Future<void> enqueue(PendingAction action) async {
    await ensureLoaded();
    if (action.type != SocialActionType.share) {
      final replaceIndex = _items.indexWhere(
        (i) =>
            i.postId == action.postId &&
            i.type == action.type &&
            i.status != PendingActionStatus.syncing,
      );
      if (replaceIndex >= 0) {
        _items[replaceIndex] = action;
      } else {
        _items.add(action);
      }
    } else {
      final dup = _items.any((i) => i.idempotencyKey == action.idempotencyKey);
      if (!dup) _items.add(action);
    }
    await _persist();
  }

  List<PendingAction> takeReadyActions({
    int limit = 50,
    DateTime? now,
    bool ignoreBackoff = false,
  }) {
    if (ignoreBackoff) {
      return _items
          .where((i) => i.status == PendingActionStatus.pending)
          .take(limit)
          .toList();
    }
    final ts = now ?? DateTime.now();
    return _items.where((i) => i.isReadyAt(ts)).take(limit).toList();
  }

  DateTime? earliestNextRetryAt() {
    DateTime? earliest;
    for (final item in _items) {
      if (item.status != PendingActionStatus.pending) continue;
      if (earliest == null || item.nextRetryAt.isBefore(earliest)) {
        earliest = item.nextRetryAt;
      }
    }
    return earliest;
  }

  Future<void> markSyncing(Iterable<String> keys) async {
    await ensureLoaded();
    final keySet = keys.toSet();
    bool changed = false;
    for (var i = 0; i < _items.length; i++) {
      if (keySet.contains(_items[i].idempotencyKey) &&
          _items[i].status != PendingActionStatus.syncing) {
        _items[i] = _items[i].copyWith(status: PendingActionStatus.syncing);
        changed = true;
      }
    }
    if (changed) await _persist();
  }

  Future<void> markSucceeded(Iterable<String> keys) async {
    await ensureLoaded();
    final keySet = keys.toSet();
    final before = _items.length;
    _items.removeWhere((i) => keySet.contains(i.idempotencyKey));
    if (_items.length != before) {
      await _persist();
    }
  }

  Future<void> markRetry(
    String idempotencyKey,
    Duration delay,
    String error,
  ) async {
    await ensureLoaded();
    final idx = _items.indexWhere((i) => i.idempotencyKey == idempotencyKey);
    if (idx < 0) return;
    final nextRetries = _items[idx].retryCount + 1;
    if (nextRetries >= maxRetries) {
      await markFailed(idempotencyKey, error);
      return;
    }
    _items[idx] = _items[idx].copyWith(
      retryCount: nextRetries,
      status: PendingActionStatus.pending,
      nextRetryAt: DateTime.now().add(delay),
      lastError: error,
    );
    await _persist();
  }

  Future<void> markFailed(String idempotencyKey, String error) async {
    await ensureLoaded();
    final idx = _items.indexWhere((i) => i.idempotencyKey == idempotencyKey);
    if (idx < 0) return;
    _items[idx] = _items[idx].copyWith(
      status: PendingActionStatus.failed,
      lastError: error,
    );
    await _persist();
  }

  Future<void> retryFailed() async {
    await ensureLoaded();
    final now = DateTime.now();
    bool changed = false;
    for (var i = 0; i < _items.length; i++) {
      if (_items[i].status == PendingActionStatus.failed) {
        _items[i] = _items[i].copyWith(
          status: PendingActionStatus.pending,
          retryCount: 0,
          nextRetryAt: now,
          clearLastError: true,
        );
        changed = true;
      }
    }
    if (changed) await _persist();
  }

  Future<void> clearScope(String? scope) async {
    final target = _normalizeScope(scope);
    if (target == _userScope) {
      _items.clear();
      _loaded = true;
    }
    try {
      final prefs = await _prefsProvider();
      await prefs.remove(_storageKey(target));
    } catch (_) {}
  }

  Future<void> _persist() async {
    try {
      final prefs = await _prefsProvider();
      final encoded = json.encode(_items.map((e) => e.toJson()).toList());
      await prefs.setString(_storageKey(_userScope), encoded);
    } catch (_) {
      // Ignore storage errors in unit tests if mock prefs missing
    }
  }
}
