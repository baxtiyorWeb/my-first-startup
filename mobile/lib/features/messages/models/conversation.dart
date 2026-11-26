import '../../feed/models/author.dart';

class DirectMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String text;
  final DateTime createdAt;
  final bool isRead;
  final bool isPending;
  final bool isFailed;

  /// Echoed by the server so a realtime copy can replace the optimistic one
  /// instead of duplicating it.
  final String? clientMessageId;

  const DirectMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.text,
    required this.createdAt,
    this.isRead = true,
    this.isPending = false,
    this.isFailed = false,
    this.clientMessageId,
  });

  DirectMessage copyWith({
    bool? isRead,
    bool? isPending,
    bool? isFailed,
    String? clientMessageId,
  }) {
    return DirectMessage(
      id: id,
      conversationId: conversationId,
      senderId: senderId,
      text: text,
      createdAt: createdAt,
      isRead: isRead ?? this.isRead,
      isPending: isPending ?? this.isPending,
      isFailed: isFailed ?? this.isFailed,
      clientMessageId: clientMessageId ?? this.clientMessageId,
    );
  }

  /// Maps a `MessageDTO` returned by `/api/messages/conversations/:id/messages`.
  factory DirectMessage.fromJson(Map<String, dynamic> json) {
    return DirectMessage(
      id: json['id']?.toString() ?? '',
      conversationId: json['conversationId']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? '',
      text: json['content']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      clientMessageId: json['clientMessageId']?.toString(),
    );
  }
}

class Conversation {
  final String id;
  final Author peer;
  final String lastMessageText;
  final DateTime lastMessageAt;
  final int unreadCount;
  final bool isOnline;

  const Conversation({
    required this.id,
    required this.peer,
    required this.lastMessageText,
    required this.lastMessageAt,
    this.unreadCount = 0,
    this.isOnline = false,
  });

  Conversation copyWith({
    String? lastMessageText,
    DateTime? lastMessageAt,
    int? unreadCount,
    bool? isOnline,
  }) {
    return Conversation(
      id: id,
      peer: peer,
      lastMessageText: lastMessageText ?? this.lastMessageText,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      unreadCount: unreadCount ?? this.unreadCount,
      isOnline: isOnline ?? this.isOnline,
    );
  }

  /// Maps a `ConversationDTO` returned by `/api/messages/conversations`.
  factory Conversation.fromJson(Map<String, dynamic> json) {
    final peerRaw = json['peerUser'];
    final peer = peerRaw is Map<String, dynamic> ? peerRaw : const <String, dynamic>{};
    final lastRaw = json['lastMessage'];
    final last = lastRaw is Map<String, dynamic> ? lastRaw : null;

    final lastAt = last?['createdAt']?.toString() ??
        json['updatedAt']?.toString() ??
        '';

    return Conversation(
      id: json['id']?.toString() ?? '',
      peer: Author(
        id: peer['id']?.toString() ?? '',
        name: peer['name']?.toString() ?? 'Foydalanuvchi',
        handle: peer['handle']?.toString() ?? 'user',
        role: peer['role']?.toString() ?? 'Go-getter',
        avatarUrl: peer['avatarUrl']?.toString(),
        verified: peer['verified'] as bool? ?? false,
      ),
      lastMessageText: last?['content']?.toString() ?? '',
      lastMessageAt: DateTime.tryParse(lastAt) ?? DateTime.now(),
      unreadCount: json['unreadCount'] as int? ?? 0,
      isOnline: peer['isOnline'] as bool? ?? false,
    );
  }
}
