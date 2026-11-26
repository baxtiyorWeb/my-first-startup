import 'dart:async';
import 'dart:collection';
import 'package:material_ui/material_ui.dart';
import '../../../core/cache/local_cache_store.dart';
import '../../../core/network/api_client.dart';
import '../models/tag_item.dart';
import 'tags_repository.dart';

class _CachedQueryEntry {
  final TagSuggestResponse response;
  final DateTime cachedAt;
  const _CachedQueryEntry(this.response, this.cachedAt);
}

class TagsController extends ChangeNotifier {
  static const String _trendingCacheKey = 'trending_tags_v1';
  static const int _maxQueryCacheEntries = 64;
  static const Duration _queryCacheTtl = Duration(seconds: 45);
  static const Duration _debounceDelay = Duration(milliseconds: 250);

  final TagsRepository _repository;
  final LocalCacheStore? _cacheStore;

  final LinkedHashMap<String, _CachedQueryEntry> _queryCache =
      LinkedHashMap<String, _CachedQueryEntry>();

  List<TagItem> _trending = const [];
  bool _isLoadingTrending = false;
  String? _trendingError;

  String _searchQuery = '';
  TagSuggestResponse _suggestState = TagSuggestResponse.empty();
  bool _isSearching = false;
  int _searchSequence = 0;
  Timer? _debounceTimer;

  bool _isCreating = false;
  String? _createError;
  bool _disposed = false;

  TagsController({
    TagsRepository? repository,
    this._cacheStore,
  })  : _repository = repository ?? TagsRepositoryImpl();

  List<TagItem> get trendingTags => _trending;
  bool get isLoadingTrending => _isLoadingTrending;
  String? get trendingError => _trendingError;

  String get searchQuery => _searchQuery;
  List<TagItem> get suggestions =>
      _searchQuery.trim().isEmpty ? _trending : _suggestState.items;
  bool get exactMatch => _suggestState.exactMatch;
  bool get canCreateForCurrentQuery =>
      _searchQuery.trim().length >= 2 &&
      !_suggestState.exactMatch &&
      _suggestState.canCreate;
  String get normalizedCandidate =>
      (_suggestState.normalizedCandidate?.isNotEmpty ?? false)
          ? _suggestState.normalizedCandidate!
          : _cleanCandidate(_searchQuery);
  bool get isSearching => _isSearching;
  bool get isCreating => _isCreating;
  String? get createError => _createError;

  Future<void> loadTrending({bool forceRefresh = false}) async {
    if (_isLoadingTrending) return;
    _trendingError = null;

    if (!forceRefresh && _trending.isEmpty && _cacheStore != null) {
      final cached = await _cacheStore.readJson(_trendingCacheKey);
      if (_disposed) return;
      final cachedList = _decodeCachedTags(cached?.data);
      if (cachedList.isNotEmpty) {
        _trending = cachedList;
        notifyListeners();
        if (cached != null && !cached.isStale) return;
      }
    }

    _isLoadingTrending = true;
    notifyListeners();

    try {
      final fresh = await _repository.getTrendingTags(limit: 12);
      if (_disposed) return;
      _trending = fresh;
      _trendingError = null;
      if (_cacheStore != null) {
        unawaited(
          _cacheStore.writeJson(
            _trendingCacheKey,
            fresh.map((t) => t.toJson()).toList(),
            ttl: const Duration(minutes: 3),
          ),
        );
      }
    } catch (e) {
      if (_disposed) return;
      if (_trending.isEmpty) {
        _trendingError = e is ApiException
            ? e.message
            : 'Teglarni yuklashda xatolik yuz berdi';
      }
    } finally {
      if (!_disposed) {
        _isLoadingTrending = false;
        notifyListeners();
      }
    }
  }

  void updateSearchQuery(String rawQuery) {
    _searchQuery = rawQuery;
    _createError = null;
    _debounceTimer?.cancel();

    final trimmed = _cleanCandidate(rawQuery);
    if (trimmed.isEmpty) {
      _searchSequence++;
      _isSearching = false;
      _suggestState = TagSuggestResponse.empty();
      notifyListeners();
      return;
    }

    final cacheKey = trimmed.toLowerCase();
    final cached = _queryCache[cacheKey];
    if (cached != null &&
        DateTime.now().difference(cached.cachedAt) < _queryCacheTtl) {
      // Refresh LRU position and render instantaneously.
      _queryCache.remove(cacheKey);
      _queryCache[cacheKey] = cached;
      _suggestState = cached.response;
      _isSearching = false;
      notifyListeners();
      return;
    }

    _isSearching = true;
    notifyListeners();

    final seq = ++_searchSequence;
    _debounceTimer = Timer(_debounceDelay, () {
      _runSuggestQuery(trimmed, seq);
    });
  }

  Future<void> _runSuggestQuery(String query, int seq) async {
    try {
      final response = await _repository.suggestTags(query, limit: 10);
      if (_disposed || seq != _searchSequence) return;
      _putQueryCache(query.toLowerCase(), response);
      _suggestState = response;
    } catch (_) {
      if (_disposed || seq != _searchSequence) return;
      _suggestState = _buildOfflineFallback(query);
    } finally {
      if (!_disposed && seq == _searchSequence) {
        _isSearching = false;
        notifyListeners();
      }
    }
  }

  Future<TagItem?> createTag(String rawName) async {
    final candidate = _cleanCandidate(rawName);
    if (candidate.length < 2 || _isCreating) return null;

    _isCreating = true;
    _createError = null;
    notifyListeners();

    try {
      final created = await _repository.createTag(candidate);
      if (_disposed) return created;

      _queryCache.clear();
      _mergeTagIntoTrending(created);
      _suggestState = TagSuggestResponse(
        query: candidate,
        items: [created],
        exactMatch: true,
        canCreate: false,
        normalizedCandidate: created.name,
      );
      return created;
    } catch (e) {
      if (!_disposed) {
        _createError = e is ApiException
            ? e.message
            : 'Teg yaratib bo‘lmadi';
      }
      return null;
    } finally {
      if (!_disposed) {
        _isCreating = false;
        notifyListeners();
      }
    }
  }

  void clearSearch() {
    _debounceTimer?.cancel();
    _searchSequence++;
    _searchQuery = '';
    _suggestState = TagSuggestResponse.empty();
    _isSearching = false;
    _createError = null;
    notifyListeners();
  }

  void clearCreateError() {
    if (_createError == null) return;
    _createError = null;
    notifyListeners();
  }

  TagSuggestResponse _buildOfflineFallback(String query) {
    final lower = query.toLowerCase();
    final matches = _trending
        .where((t) =>
            t.name.toLowerCase().contains(lower) ||
            t.slug.toLowerCase().contains(lower))
        .toList();
    final exact = matches.any((t) =>
        t.name.toLowerCase() == lower || t.slug.toLowerCase() == lower);
    return TagSuggestResponse(
      query: query,
      items: matches,
      exactMatch: exact,
      canCreate: !exact && query.length >= 2 && query.length <= 40,
      normalizedCandidate: query,
    );
  }

  void _mergeTagIntoTrending(TagItem tag) {
    final existingIdx = _trending.indexWhere((t) => t == tag);
    final updated = List<TagItem>.from(_trending);
    if (existingIdx >= 0) {
      updated[existingIdx] = tag;
    } else {
      updated.insert(0, tag);
    }
    _trending = updated;
  }

  void _putQueryCache(String key, TagSuggestResponse response) {
    _queryCache.remove(key);
    while (_queryCache.length >= _maxQueryCacheEntries) {
      _queryCache.remove(_queryCache.keys.first);
    }
    _queryCache[key] = _CachedQueryEntry(response, DateTime.now());
  }

  static List<TagItem> _decodeCachedTags(Object? raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(TagItem.fromJson)
        .where((t) => t.name.isNotEmpty)
        .toList();
  }

  static String _cleanCandidate(String raw) =>
      raw.trim().replaceFirst(RegExp(r'^#+'), '').replaceAll(RegExp(r'\s+'), ' ');

  @override
  void dispose() {
    _disposed = true;
    _debounceTimer?.cancel();
    super.dispose();
  }
}
