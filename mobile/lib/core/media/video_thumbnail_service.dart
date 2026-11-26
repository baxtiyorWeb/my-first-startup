import 'dart:collection';
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter/services.dart';

/// Extracts and caches the first video keyframe via native Android
/// `MediaMetadataRetriever` without holding active MediaCodec decoders.
class VideoThumbnailService {
  static const MethodChannel _channel =
      MethodChannel('com.geters.mobile/video_thumbnail');
  static const int _maxCacheEntries = 50;

  static final LinkedHashMap<String, Uint8List> _cache =
      LinkedHashMap<String, Uint8List>();
  static final Map<String, Future<Uint8List?>> _inFlight = {};
  static final Set<String> _failedUrls = {};

  static String _cacheKey(String url, int maxWidth) =>
      '${url.trim()}|$maxWidth';

  /// Returns synchronously cached thumbnail bytes for [url] if available.
  static Uint8List? getCached(String url, {int maxWidth = 720}) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return null;
    final key = _cacheKey(trimmed, maxWidth);
    final existing = _cache.remove(key);
    if (existing != null) {
      _cache[key] = existing;
    }
    return existing;
  }

  /// Extracts (or retrieves from disk/memory cache) the first frame of [url].
  static Future<Uint8List?> getThumbnail(String url, {int maxWidth = 720}) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return Future<Uint8List?>.value(null);

    final parsed = Uri.tryParse(trimmed);
    if (parsed == null || !parsed.hasScheme) {
      return Future<Uint8List?>.value(null);
    }

    final key = _cacheKey(trimmed, maxWidth);
    final cached = getCached(trimmed, maxWidth: maxWidth);
    if (cached != null) return Future<Uint8List?>.value(cached);
    if (_failedUrls.contains(key)) return Future<Uint8List?>.value(null);

    final pending = _inFlight[key];
    if (pending != null) return pending;

    final future = _fetchNative(trimmed, maxWidth, key);
    _inFlight[key] = future;
    return future;
  }

  static Future<Uint8List?> _fetchNative(
    String url,
    int maxWidth,
    String key,
  ) async {
    try {
      final bytes = await _channel.invokeMethod<Uint8List>('getThumbnail', {
        'url': url,
        'maxWidth': maxWidth,
      });
      if (bytes != null && bytes.isNotEmpty) {
        _storeInCache(key, bytes);
        return bytes;
      }
      _failedUrls.add(key);
      return null;
    } catch (_) {
      return null;
    } finally {
      _inFlight.remove(key);
    }
  }

  static void _storeInCache(String key, Uint8List bytes) {
    _cache.remove(key);
    _cache[key] = bytes;
    while (_cache.length > _maxCacheEntries) {
      _cache.remove(_cache.keys.first);
    }
  }

  @visibleForTesting
  static void clearCache() {
    _cache.clear();
    _inFlight.clear();
    _failedUrls.clear();
  }
}
