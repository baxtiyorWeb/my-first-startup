import '../../../core/network/api_client.dart';
import '../models/conversation.dart';

class MessagesPage {
  final List<DirectMessage> messages;
  final DateTime? peerLastReadAt;

  const MessagesPage({required this.messages, this.peerLastReadAt});
}

/// Talks to the platform's real messaging API
/// (`/api/messages/*`), which is the same surface the web client uses.
abstract class MessagesRepository {
  ApiClient? get apiClient => null;
  Future<List<Conversation>> getConversations();
  Future<Conversation> getOrCreateDirectConversation(String handle);
  Future<MessagesPage> getMessages(
    String conversationId, {
    String? cursor,
    int limit = 30,
  });

  /// Messages received after [sinceIso], used to fill the gap after a dropped
  /// realtime connection.
  Future<List<DirectMessage>> syncMissedMessages(String sinceIso);

  Future<DirectMessage> sendMessage(
    String conversationId,
    String content, {
    String? clientMessageId,
  });
  Future<void> markRead(String conversationId, {String? messageId});
}

class MessagesRepositoryImpl implements MessagesRepository {
  final ApiClient _apiClient;

  MessagesRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  @override
  ApiClient? get apiClient => _apiClient;

  @override
  Future<List<Conversation>> getConversations() async {
    final decoded = await _apiClient.get('/messages/conversations');
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['conversations'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(Conversation.fromJson)
        .where((c) => c.id.isNotEmpty)
        .toList();
  }

  @override
  Future<Conversation> getOrCreateDirectConversation(String handle) async {
    final cleanHandle = handle.replaceFirst('@', '').trim();
    final decoded = await _apiClient.post(
      '/messages/conversations',
      body: {'recipientHandle': cleanHandle},
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['conversation'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException('Suhbat ma’lumotlari qaytarilmadi');
    }
    return Conversation.fromJson(raw);
  }

  @override
  Future<MessagesPage> getMessages(
    String conversationId, {
    String? cursor,
    int limit = 30,
  }) async {
    final decoded = await _apiClient.get(
      '/messages/conversations/$conversationId/messages',
      queryParameters: {
        'limit': '$limit',
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['messages'] as List<dynamic>? ?? const [];
    return MessagesPage(
      messages: raw
          .whereType<Map<String, dynamic>>()
          .map(DirectMessage.fromJson)
          .toList(),
      peerLastReadAt: _parseDate(data['peerLastReadAt']),
    );
  }

  @override
  Future<List<DirectMessage>> syncMissedMessages(String sinceIso) async {
    final decoded = await _apiClient.get(
      '/messages/sync',
      queryParameters: {'since': sinceIso},
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['messages'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(DirectMessage.fromJson)
        .toList();
  }

  @override
  Future<DirectMessage> sendMessage(
    String conversationId,
    String content, {
    String? clientMessageId,
  }) async {
    final decoded = await _apiClient.post(
      '/messages/conversations/$conversationId/messages',
      body: {
        'content': content,
        if (clientMessageId != null && clientMessageId.isNotEmpty)
          'clientMessageId': clientMessageId,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['message'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException('Xabar yuborilmadi');
    }
    // Own outgoing messages stay unread until the peer opens the chat.
    return DirectMessage.fromJson(raw).copyWith(isPending: false, isRead: false);
  }

  @override
  Future<void> markRead(String conversationId, {String? messageId}) async {
    await _apiClient.post(
      '/messages/conversations/$conversationId/read',
      body: {
        if (messageId != null && messageId.isNotEmpty) 'messageId': messageId,
      },
    );
  }

  static DateTime? _parseDate(Object? value) {
    final raw = value?.toString();
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }
}
