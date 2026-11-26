import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/sse_parser.dart';

void main() {
  group('SseFrameParser', () {
    test('parses a single event', () {
      final parser = SseFrameParser();
      final events = parser.add(
        'event: message:new\ndata: {"conversationId":"c1"}\n\n',
      );

      expect(events, hasLength(1));
      expect(events.single.type, 'message:new');
      expect(events.single.json?['conversationId'], 'c1');
    });

    test('emits an event split across chunks only when complete', () {
      final parser = SseFrameParser();

      expect(parser.add('event: message:new\ndata: {"conv'), isEmpty);
      expect(parser.add('ersationId":"c1"}\n'), isEmpty);
      final events = parser.add('\n');

      expect(events, hasLength(1));
      expect(events.single.json?['conversationId'], 'c1');
    });

    test('handles CRLF line endings', () {
      final parser = SseFrameParser();
      final events = parser.add(
        'event: message:read\r\ndata: {"conversationId":"c2"}\r\n\r\n',
      );

      expect(events, hasLength(1));
      expect(events.single.type, 'message:read');
      expect(events.single.json?['conversationId'], 'c2');
    });

    test('ignores heartbeat comment frames', () {
      final parser = SseFrameParser();
      expect(parser.add(': ping\n\n'), isEmpty);

      final events = parser.add('event: typing:update\ndata: {"isTyping":true}\n\n');
      expect(events, hasLength(1));
      expect(events.single.type, 'typing:update');
    });

    test('parses several events from one chunk in order', () {
      final parser = SseFrameParser();
      final events = parser.add(
        'event: a\ndata: {"n":1}\n\n'
        'event: b\ndata: {"n":2}\n\n',
      );

      expect(events.map((e) => e.type), ['a', 'b']);
      expect(events.map((e) => e.json?['n']), [1, 2]);
    });

    test('joins multi-line data payloads', () {
      final parser = SseFrameParser();
      final events = parser.add('event: a\ndata: {"x":\ndata: 5}\n\n');

      expect(events, hasLength(1));
      expect(events.single.data, '{"x":\n5}');
      expect(events.single.json?['x'], 5);
    });

    test('drops frames without a recognizable payload', () {
      expect(SseFrameParser.parseFrame('event: a'), isNull);
      expect(SseFrameParser.parseFrame('data: {}'), isNull);
      expect(SseFrameParser.parseFrame(': comment only'), isNull);
    });

    test('ignores non-JSON payloads without throwing', () {
      final parser = SseFrameParser();
      final events = parser.add('event: a\ndata: not-json\n\n');

      expect(events, hasLength(1));
      expect(events.single.json, isNull);
    });
  });
}
