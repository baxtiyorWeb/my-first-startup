import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/feed/models/author.dart';
import 'package:mobile/features/messages/data/messages_controller.dart';
import 'package:mobile/features/messages/data/messages_repository.dart';
import 'package:mobile/features/messages/data/messages_stream_client.dart';
import 'package:mobile/features/messages/models/conversation.dart';

class FakeStream implements MessagesStream {
  @override
  void Function(String type, Map<String, dynamic> data)? onEvent;
  @override
  void Function()? onConnected;
  @override
  void Function()? onDisconnected;

  @override
  bool isConnected = false;

  bool started = false;

  @override
  void start() {
    started = true;
    isConnected = true;
    onConnected?.call();
  }

  @override
  void stop() {
    started = false;
    isConnected = false;
    onDisconnected?.call();
  }

  @override
  void dispose() {
    started = false;
    isConnected = false;
  }

  void emit(String type, Map<String, dynamic> data) => onEvent?.call(type, data);
}

class FakeMessagesRepository implements MessagesRepository {
  @override
  ApiClient? get apiClient => null;

  bool failSend = false;
  Completer<DirectMessage>? sendGate;
  int sendCount = 0;

  final Conversation conversation = Conversation(
    id: 'c1',
    peer: const Author(
      id: 'other',
      name: 'Madina',
      handle: '@madina',
      role: 'Dev',
    ),
    lastMessageText: '',
    lastMessageAt: DateTime(2026, 1, 1),
  );

  List<DirectMessage> stored = [];

  @override
  Future<List<Conversation>> getConversations() async => [conversation];

  @override
  Future<Conversation> getOrCreateDirectConversation(String handle) async =>
      conversation;

  @override
  Future<MessagesPage> getMessages(
    String conversationId, {
    String? cursor,
    int limit = 30,
  }) async {
    return MessagesPage(messages: List.of(stored));
  }

  @override
  Future<List<DirectMessage>> syncMissedMessages(String sinceIso) async =>
      const [];

  @override
  Future<DirectMessage> sendMessage(
    String conversationId,
    String content, {
    String? clientMessageId,
  }) async {
    if (sendGate != null) return sendGate!.future;
    if (failSend) throw Exception('Tarmoq uzildi');

    sendCount += 1;
    final message = DirectMessage(
      id: 'srv-$sendCount',
      conversationId: conversationId,
      senderId: 'me',
      text: content,
      createdAt: DateTime.now(),
      clientMessageId: clientMessageId,
    );
    stored.add(message);
    return message;
  }

  @override
  Future<void> markRead(String conversationId, {String? messageId}) async {}
}

void main() {
  group('MessagesController live updates', () {
    test('realtime echo replaces the optimistic bubble instead of duplicating it',
        () async {
      final repo = FakeMessagesRepository();
      final stream = FakeStream();
      final controller = MessagesController(repository: repo, stream: stream);
      await controller.setActiveUser('me');

      repo.sendGate = Completer<DirectMessage>();
      final sending = controller.sendMessage('c1', 'Salom');

      expect(controller.messagesFor('c1'), hasLength(1));
      final tempId = controller.messagesFor('c1').single.id;

      stream.emit('message:new', {
        'conversationId': 'c1',
        'message': {
          'id': 'srv-echo',
          'conversationId': 'c1',
          'senderId': 'me',
          'content': 'Salom',
          'createdAt': DateTime.now().toIso8601String(),
          'clientMessageId': tempId,
        },
      });

      expect(controller.messagesFor('c1'), hasLength(1));
      expect(controller.messagesFor('c1').single.id, 'srv-echo');

      repo.sendGate!.complete(
        DirectMessage(
          id: 'srv-echo',
          conversationId: 'c1',
          senderId: 'me',
          text: 'Salom',
          createdAt: DateTime.now(),
          clientMessageId: tempId,
        ),
      );
      await sending;

      expect(controller.messagesFor('c1'), hasLength(1));
      controller.dispose();
    });

    test('a failed send stays on screen as retryable and can be resent', () async {
      final repo = FakeMessagesRepository()..failSend = true;
      final controller = MessagesController(repository: repo, stream: FakeStream());
      await controller.setActiveUser('me');

      final sent = await controller.sendMessage('c1', 'Yuborilmadi');
      expect(sent, isFalse);

      final failed = controller.messagesFor('c1').single;
      expect(failed.isFailed, isTrue);
      expect(controller.lastSendError, isNotNull);

      repo.failSend = false;
      final retried = await controller.retryMessage('c1', failed.id);

      expect(retried, isTrue);
      final delivered = controller.messagesFor('c1').single;
      expect(delivered.isFailed, isFalse);
      expect(delivered.id, 'srv-1');
      controller.dispose();
    });

    test('incoming messages count as unread only when the chat is not open',
        () async {
      final repo = FakeMessagesRepository();
      final stream = FakeStream();
      final controller = MessagesController(repository: repo, stream: stream);
      await controller.setActiveUser('me');

      stream.emit('message:new', {
        'conversationId': 'c1',
        'message': {
          'id': 'm1',
          'conversationId': 'c1',
          'senderId': 'other',
          'content': 'Salom',
          'createdAt': DateTime.now().toIso8601String(),
        },
      });
      expect(controller.totalUnreadCount, 1);

      controller.setActiveConversation('c1');
      stream.emit('message:new', {
        'conversationId': 'c1',
        'message': {
          'id': 'm2',
          'conversationId': 'c1',
          'senderId': 'other',
          'content': 'Yana',
          'createdAt': DateTime.now().toIso8601String(),
        },
      });

      expect(controller.totalUnreadCount, 1);
      expect(controller.messagesFor('c1'), hasLength(2));
      controller.dispose();
    });

    test('typing events from the peer toggle the indicator, own events are ignored',
        () async {
      final controller = MessagesController(
        repository: FakeMessagesRepository(),
        stream: FakeStream(),
      );
      await controller.setActiveUser('me');
      final stream = controller.stream! as FakeStream;

      stream.emit('typing:update', {
        'conversationId': 'c1',
        'userId': 'other',
        'isTyping': true,
      });
      expect(controller.isPeerTyping('c1'), isTrue);

      stream.emit('typing:update', {
        'conversationId': 'c1',
        'userId': 'me',
        'isTyping': true,
      });
      expect(controller.isPeerTyping('c1'), isTrue,
          reason: 'own typing must not show a self indicator');

      stream.emit('typing:update', {
        'conversationId': 'c1',
        'userId': 'other',
        'isTyping': false,
      });
      expect(controller.isPeerTyping('c1'), isFalse);
      controller.dispose();
    });

    test('presence and read receipts flow into conversation state', () async {
      final repo = FakeMessagesRepository();
      final stream = FakeStream();
      final controller = MessagesController(repository: repo, stream: stream);
      await controller.setActiveUser('me');

      stream.emit('presence:update', {'userId': 'other', 'status': 'online'});
      expect(controller.conversations.single.isOnline, isTrue);

      final readAt = DateTime.now().toIso8601String();
      stream.emit('message:read', {
        'conversationId': 'c1',
        'lastReadAt': readAt,
      });

      stream.emit('connection:ack', {
        'onlineUserIds': <String>[],
      });
      expect(controller.conversations.single.isOnline, isFalse);
      controller.dispose();
    });
  });
}
