import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/feed/models/post.dart';
import 'package:mobile/features/messages/models/conversation.dart';

void main() {
  group('Post.fromJson', () {
    test('maps the backend category field onto the topic filter', () {
      final post = Post.fromJson(const {
        'id': 'p1',
        'content': 'Salom dunyo',
        'createdAt': '2026-01-01T00:00:00.000Z',
        'category': 'dasturlash',
        'tags': ['flutter'],
      });

      expect(post.topic, 'dasturlash');
      expect(post.tags, ['flutter']);
    });

    test('keeps a legacy cached topic when category is absent', () {
      final post = Post.fromJson(const {
        'id': 'p2',
        'content': 'Eski kesh',
        'topic': 'ai',
      });

      expect(post.topic, 'ai');
    });

    test('reads interaction and short-video flags from the API payload', () {
      final post = Post.fromJson(const {
        'id': 'p3',
        'content': 'Video',
        'videoUrl': 'https://cdn.example/v.mp4',
        'videoDurationSeconds': 42,
        'isShort': true,
        'isLiked': true,
        'isSaved': true,
        'likesCount': 7,
        'author': {
          'id': 'u1',
          'name': 'Sardor',
          'handle': '@sardor',
          'role': 'Dev',
          'isFollowing': true,
        },
      });

      expect(post.isShort, isTrue);
      expect(post.isLiked, isTrue);
      expect(post.isSaved, isTrue);
      expect(post.likesCount, 7);
      expect(post.author.isFollowing, isTrue);
    });
  });

  group('Conversation.fromJson', () {
    test('maps ConversationDTO including last message and unread count', () {
      final conv = Conversation.fromJson(const {
        'id': 'c1',
        'peerUser': {
          'id': 'u2',
          'name': 'Madina',
          'handle': '@madina',
          'role': 'Designer',
          'verified': true,
          'isOnline': true,
        },
        'lastMessage': {
          'id': 'm1',
          'content': 'Salom!',
          'senderId': 'u2',
          'createdAt': '2026-02-01T10:00:00.000Z',
          'isFromMe': false,
        },
        'unreadCount': 3,
        'updatedAt': '2026-02-01T10:00:00.000Z',
      });

      expect(conv.id, 'c1');
      expect(conv.peer.name, 'Madina');
      expect(conv.peer.handle, '@madina');
      expect(conv.peer.verified, isTrue);
      expect(conv.lastMessageText, 'Salom!');
      expect(conv.unreadCount, 3);
      expect(conv.isOnline, isTrue);
      expect(conv.lastMessageAt.toUtc().year, 2026);
    });

    test('handles a brand new conversation with no last message', () {
      final conv = Conversation.fromJson(const {
        'id': 'c2',
        'peerUser': {'id': 'u3', 'name': 'Aziz', 'handle': '@aziz'},
        'lastMessage': null,
        'unreadCount': 0,
        'updatedAt': '2026-02-02T09:30:00.000Z',
      });

      expect(conv.lastMessageText, '');
      expect(conv.unreadCount, 0);
      expect(conv.peer.verified, isFalse);
    });
  });

  group('DirectMessage.fromJson', () {
    test('maps content to text and keeps the server timestamp', () {
      final msg = DirectMessage.fromJson(const {
        'id': 'm9',
        'conversationId': 'c1',
        'senderId': 'u2',
        'content': 'Xabar matni',
        'createdAt': '2026-03-01T08:15:00.000Z',
      });

      expect(msg.id, 'm9');
      expect(msg.text, 'Xabar matni');
      expect(msg.senderId, 'u2');
      expect(msg.createdAt.toUtc().month, 3);
    });
  });
}
