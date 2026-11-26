import 'dart:convert';

/// Minimal, dependency-free Server-Sent Events frame parser.
///
/// Kept separate from the transport so chunk-boundary and line-ending
/// behaviour can be unit tested without a socket.
class SseEvent {
  final String type;
  final String data;

  const SseEvent(this.type, this.data);

  /// Parsed JSON payload, or null when the frame is not a JSON object.
  Map<String, dynamic>? get json {
    try {
      final decoded = jsonDecode(data);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }
}

/// Accumulates SSE chunks and yields complete events.
///
/// Handles events split across chunks, `\r\n` line endings and heartbeat
/// comment frames (`: ping`), all of which the backend emits.
class SseFrameParser {
  String _buffer = '';

  List<SseEvent> add(String chunk) {
    if (chunk.isEmpty) return const [];
    _buffer += chunk;
    if (_buffer.contains('\r')) {
      _buffer = _buffer.replaceAll('\r\n', '\n');
    }

    final events = <SseEvent>[];
    while (true) {
      final boundary = _buffer.indexOf('\n\n');
      if (boundary < 0) break;
      final frame = _buffer.substring(0, boundary);
      _buffer = _buffer.substring(boundary + 2);
      final event = parseFrame(frame);
      if (event != null) events.add(event);
    }
    return events;
  }

  void reset() {
    _buffer = '';
  }

  /// Parses a single frame body (`event:` / `data:` lines).
  static SseEvent? parseFrame(String frame) {
    String? type;
    final dataLines = <String>[];

    for (final rawLine in frame.split('\n')) {
      final line = rawLine.trimRight();
      if (line.isEmpty || line.startsWith(':')) continue;

      final colon = line.indexOf(':');
      final field = colon < 0 ? line : line.substring(0, colon);
      var value = colon < 0 ? '' : line.substring(colon + 1);
      if (value.startsWith(' ')) value = value.substring(1);

      if (field == 'event') {
        type = value;
      } else if (field == 'data') {
        dataLines.add(value);
      }
      // `id:` and `retry:` are not emitted by this backend.
    }

    if (type == null || dataLines.isEmpty) return null;
    return SseEvent(type, dataLines.join('\n'));
  }
}
