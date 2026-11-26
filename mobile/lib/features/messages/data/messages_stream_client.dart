import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import '../../../core/network/sse_parser.dart';

/// Contract used by [MessagesController] so tests can drive events directly.
abstract class MessagesStream {
  void Function(String type, Map<String, dynamic> data)? onEvent;
  void Function()? onConnected;
  void Function()? onDisconnected;

  bool get isConnected;

  void start();
  void stop();
  void dispose();
}

/// Streams `/api/messages/stream` over HTTP.
///
/// Uses a streamed `http` request rather than `EventSource` because the
/// endpoint authenticates with an `Authorization: Bearer` header, which
/// EventSource cannot send. Reconnects with capped exponential backoff.
class MessagesStreamClient implements MessagesStream {
  final String baseUrl;
  final String? Function() tokenProvider;
  final http.Client Function() clientFactory;

  @override
  void Function(String type, Map<String, dynamic> data)? onEvent;
  @override
  void Function()? onConnected;
  @override
  void Function()? onDisconnected;

  final SseFrameParser _parser = SseFrameParser();
  final Random _random;

  http.Client? _client;
  StreamSubscription<String>? _subscription;
  Timer? _retryTimer;
  bool _connected = false;
  bool _stopped = true;
  bool _disposed = false;
  int _attempt = 0;

  MessagesStreamClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client Function()? clientFactory,
    Random? random,
  })  : clientFactory = clientFactory ?? http.Client.new,
        _random = random ?? Random();

  @override
  bool get isConnected => _connected;

  @override
  void start() {
    if (_disposed || !_stopped) return;
    _stopped = false;
    _attempt = 0;
    _open();
  }

  @override
  void stop() {
    _stopped = true;
    _retryTimer?.cancel();
    _retryTimer = null;
    _closeConnection();
    _setConnected(false);
  }

  @override
  void dispose() {
    _disposed = true;
    stop();
  }

  Future<void> _open() async {
    if (_disposed || _stopped || _connected) return;

    final token = tokenProvider();
    if (token == null || token.isEmpty) {
      _scheduleReconnect();
      return;
    }

    _closeConnection();
    final client = clientFactory();
    _client = client;

    try {
      final request = http.Request(
        'GET',
        Uri.parse('$baseUrl/messages/stream'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'text/event-stream';
      request.headers['Cache-Control'] = 'no-cache';

      final response = await client.send(request);
      if (response.statusCode != 200) {
        throw http.ClientException(
          'SSE ulanishi rad etildi (HTTP ${response.statusCode})',
        );
      }
      if (_stopped || _disposed) {
        await response.stream.drain<void>().catchError((_) {});
        client.close();
        return;
      }

      _attempt = 0;
      _parser.reset();
      _setConnected(true);

      _subscription = response.stream
          .transform(utf8.decoder)
          .listen(
            _handleChunk,
            onError: (Object _) => _handleClosed(),
            onDone: _handleClosed,
            cancelOnError: true,
          );
    } catch (_) {
      _handleClosed();
    }
  }

  void _handleChunk(String chunk) {
    for (final event in _parser.add(chunk)) {
      final payload = event.json;
      if (payload == null) continue;
      onEvent?.call(event.type, payload);
    }
  }

  void _handleClosed() {
    if (_disposed) return;
    _closeConnection();
    _setConnected(false);
    onDisconnected?.call();
    if (!_stopped) _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (_stopped || _disposed) return;
    _retryTimer?.cancel();
    final delay = _backoff(_attempt);
    _attempt += 1;
    _retryTimer = Timer(delay, _open);
  }

  /// 1s, 2s, 4s … capped at 30s, with ±20% jitter to avoid a reconnect storm.
  Duration _backoff(int attempt) {
    final cappedSeconds = min(30, 1 << min(attempt, 5));
    final jitter = 0.8 + (_random.nextDouble() * 0.4);
    final ms = (cappedSeconds * 1000 * jitter).round().clamp(500, 30000);
    return Duration(milliseconds: ms);
  }

  void _closeConnection() {
    _subscription?.cancel();
    _subscription = null;
    _client?.close();
    _client = null;
    _parser.reset();
  }

  void _setConnected(bool value) {
    if (_connected == value) return;
    _connected = value;
    if (value) onConnected?.call();
  }
}
