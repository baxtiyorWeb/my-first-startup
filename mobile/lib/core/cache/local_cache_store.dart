import 'dart:collection';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheReadResult<T> {
  final T data;
  final bool isStale;
  final DateTime updatedAt;

  const CacheReadResult({
    required this.data,
    required this.isStale,
    required this.updatedAt,
  });
}

class _MemoryCacheEntry {
  final Object data;
  final int updatedAtMs;
  final int ttlMs;

  const _MemoryCacheEntry({
    required this.data,
    required this.updatedAtMs,
    required this.ttlMs,
  });

  bool isStaleAt(int nowMs) => nowMs > updatedAtMs + ttlMs;
}

/// User-scoped two-tier (L1 LRU memory + L2 SharedPreferences) cache
/// supporting stale-while-revalidate and strict user isolation on logout.
class LocalCacheStore {
  static const String _prefix = 'geters_cache_v1_';
  static const String _indexPrefix = 'geters_cache_idx_v1_';

  final int maxMemoryEntries;
  final LinkedHashMap<String, _MemoryCacheEntry> _memory =
      LinkedHashMap<String, _MemoryCacheEntry>();
  final Future<SharedPreferences> Function() _prefsProvider;

  String _userScope;

  LocalCacheStore({
    String userScope = 'guest',
    this.maxMemoryEntries = 80,
    Future<SharedPreferences> Function()? prefsProvider,
  })  : _userScope = _normalizeScope(userScope),
        _prefsProvider = prefsProvider ?? SharedPreferences.getInstance;

  String get userScope => _userScope;

  static String _normalizeScope(String? scope) {
    final trimmed = scope?.trim() ?? '';
    return trimmed.isEmpty ? 'guest' : trimmed;
  }

  String _diskKey(String scope, String key) => '$_prefix${scope}_$key';

  String _indexKey(String scope) => '$_indexPrefix$scope';

  void setUserScope(String? scope) {
    final normalized = _normalizeScope(scope);
    if (_userScope == normalized) return;
    _userScope = normalized;
    _memory.clear();
  }

  CacheReadResult<dynamic>? peekMemory(
    String key, {
    bool allowStale = true,
  }) {
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final memEntry = _memory.remove(key);
    if (memEntry == null) return null;
    final stale = memEntry.isStaleAt(nowMs);
    if (!allowStale && stale) return null;
    _memory[key] = memEntry;
    return CacheReadResult(
      data: memEntry.data,
      isStale: stale,
      updatedAt: DateTime.fromMillisecondsSinceEpoch(memEntry.updatedAtMs),
    );
  }

  Future<CacheReadResult<dynamic>?> readJson(
    String key, {
    bool allowStale = true,
  }) async {
    final memHit = peekMemory(key, allowStale: allowStale);
    if (memHit != null) return memHit;
    final nowMs = DateTime.now().millisecondsSinceEpoch;

    try {
      final prefs = await _prefsProvider();
      final raw = prefs.getString(_diskKey(_userScope, key));
      if (raw == null || raw.isEmpty) return null;

      final decoded = json.decode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      final updatedAtMs = (decoded['u'] as int?) ?? 0;
      final ttlMs = (decoded['t'] as int?) ?? 0;
      final data = decoded['d'];
      if (data == null || updatedAtMs <= 0) return null;

      final stale = nowMs > updatedAtMs + ttlMs;
      if (!allowStale && stale) return null;

      _putMemory(
        key,
        _MemoryCacheEntry(data: data as Object, updatedAtMs: updatedAtMs, ttlMs: ttlMs),
      );
      return CacheReadResult(
        data: data,
        isStale: stale,
        updatedAt: DateTime.fromMillisecondsSinceEpoch(updatedAtMs),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> writeJson(
    String key,
    Object data, {
    Duration ttl = const Duration(minutes: 5),
  }) async {
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final ttlMs = ttl.inMilliseconds.clamp(100, 7 * 24 * 60 * 60 * 1000);
    _putMemory(
      key,
      _MemoryCacheEntry(data: data, updatedAtMs: nowMs, ttlMs: ttlMs),
    );

    final scopeAtWrite = _userScope;
    try {
      final prefs = await _prefsProvider();
      final payload = json.encode({'u': nowMs, 't': ttlMs, 'd': data});
      await prefs.setString(_diskKey(scopeAtWrite, key), payload);
      final keys = List<String>.from(prefs.getStringList(_indexKey(scopeAtWrite)) ?? const []);
      if (!keys.contains(key)) {
        keys.add(key);
        await prefs.setStringList(_indexKey(scopeAtWrite), keys);
      }
    } catch (_) {
      // Ignore storage failures in test harness
    }
  }

  Future<void> invalidate(String key) async {
    _memory.remove(key);
    try {
      final prefs = await _prefsProvider();
      await prefs.remove(_diskKey(_userScope, key));
    } catch (_) {}
  }

  Future<void> invalidatePrefix(String prefix) async {
    final memKeys = _memory.keys.where((k) => k.startsWith(prefix)).toList();
    for (final k in memKeys) {
      _memory.remove(k);
    }
    try {
      final prefs = await _prefsProvider();
      final idxKey = _indexKey(_userScope);
      final keys = List<String>.from(prefs.getStringList(idxKey) ?? const []);
      final remaining = <String>[];
      for (final key in keys) {
        if (key.startsWith(prefix)) {
          await prefs.remove(_diskKey(_userScope, key));
        } else {
          remaining.add(key);
        }
      }
      await prefs.setStringList(idxKey, remaining);
    } catch (_) {}
  }

  Future<void> clearCurrentUser() async {
    await clearUserScope(_userScope);
  }

  Future<void> clearUserScope(String scope) async {
    final normalized = _normalizeScope(scope);
    if (normalized == _userScope) {
      _memory.clear();
    }
    try {
      final prefs = await _prefsProvider();
      final idxKey = _indexKey(normalized);
      final indexedKeys = prefs.getStringList(idxKey) ?? const [];
      for (final key in indexedKeys) {
        await prefs.remove(_diskKey(normalized, key));
      }
      await prefs.remove(idxKey);

      final diskPrefix = '$_prefix${normalized}_';
      for (final k in prefs.getKeys().toList()) {
        if (k.startsWith(diskPrefix)) {
          await prefs.remove(k);
        }
      }
    } catch (_) {}
  }

  Future<void> clearAll() async {
    _memory.clear();
    try {
      final prefs = await _prefsProvider();
      for (final k in prefs.getKeys().toList()) {
        if (k.startsWith(_prefix) || k.startsWith(_indexPrefix)) {
          await prefs.remove(k);
        }
      }
    } catch (_) {}
  }

  void _putMemory(String key, _MemoryCacheEntry entry) {
    _memory.remove(key);
    while (_memory.length >= maxMemoryEntries) {
      _memory.remove(_memory.keys.first);
    }
    _memory[key] = entry;
  }
}
