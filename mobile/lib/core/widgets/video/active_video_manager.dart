import 'dart:async';

/// Coordinates active hardware video decoders so at most one platform
/// video controller holds native MediaCodec resources at a time.
abstract class ManagedVideoPlayer {
  Future<void> deactivateAndRelease({bool notifySync = false});
}

class ActiveVideoManager {
  static ManagedVideoPlayer? _activePlayer;
  static Future<void> _pendingRelease = Future<void>.value();
  static Zone? _ownerZone;

  static void _resetIfCrossZone() {
    final current = Zone.current;
    if (_ownerZone != null && !identical(_ownerZone, current)) {
      _activePlayer = null;
      _pendingRelease = Future<void>.value();
    }
    _ownerZone = current;
  }

  static void trackDisposal(Future<void> future) {
    _resetIfCrossZone();
    final safeFuture = future.catchError((_) {});
    late final Future<void> tracked;
    tracked = Future.wait<void>([_pendingRelease, safeFuture]).then((_) {});
    _pendingRelease = tracked;
    tracked.whenComplete(() {
      if (identical(_pendingRelease, tracked)) {
        _pendingRelease = Future<void>.value();
      }
    });
  }

  static Future<void> activate(ManagedVideoPlayer next) async {
    _resetIfCrossZone();
    final prev = _activePlayer;
    if (prev != null && prev != next) {
      _activePlayer = next;
      trackDisposal(prev.deactivateAndRelease(notifySync: true));
    } else {
      _activePlayer = next;
    }
    await _pendingRelease;
  }

  static void unregister(ManagedVideoPlayer state) {
    if (_activePlayer == state) {
      _activePlayer = null;
    }
  }

  static Future<void> releaseAll() async {
    _resetIfCrossZone();
    final prev = _activePlayer;
    _activePlayer = null;
    if (prev != null) {
      trackDisposal(prev.deactivateAndRelease(notifySync: true));
    }
    await _pendingRelease;
  }
}
