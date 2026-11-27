import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:http/http.dart' as http;

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/sse_parser.dart';

class CommunityAttachment {
  final String url;
  final String kind; // image | video | file
  final String name;
  final String mimeType;
  final int sizeBytes;

  const CommunityAttachment({
    required this.url,
    required this.kind,
    required this.name,
    required this.mimeType,
    required this.sizeBytes,
  });

  factory CommunityAttachment.fromJson(Map<String, dynamic> json) {
    return CommunityAttachment(
      url: json['url']?.toString() ?? '',
      kind: json['kind']?.toString() ?? 'file',
      name: json['name']?.toString() ?? 'fayl',
      mimeType: json['mimeType']?.toString() ?? 'application/octet-stream',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'url': url,
        'kind': kind,
        'name': name,
        'mimeType': mimeType,
        'sizeBytes': sizeBytes,
      };
}

class CommunitySender {
  final String id;
  final String name;
  final String handle;
  final String? avatarUrl;
  final bool verified;
  final String role;

  const CommunitySender({
    required this.id,
    required this.name,
    required this.handle,
    this.avatarUrl,
    this.verified = false,
    this.role = '',
  });

  factory CommunitySender.fromJson(Map<String, dynamic> json) {
    return CommunitySender(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Foydalanuvchi',
      handle: (json['handle']?.toString() ?? '').replaceFirst(RegExp(r'^@+'), ''),
      avatarUrl: json['avatarUrl']?.toString(),
      verified: json['verified'] == true,
      role: json['role']?.toString() ?? '',
    );
  }
}

class CommunityReplyPreview {
  final String id;
  final String content;
  final String messageType;
  final String? senderName;
  final String? attachmentKind;
  final bool isDeleted;

  const CommunityReplyPreview({
    required this.id,
    required this.content,
    required this.messageType,
    this.senderName,
    this.attachmentKind,
    this.isDeleted = false,
  });

  factory CommunityReplyPreview.fromJson(Map<String, dynamic> json) {
    return CommunityReplyPreview(
      id: json['id']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      messageType: json['messageType']?.toString() ?? 'text',
      senderName: json['senderName']?.toString(),
      attachmentKind: json['attachmentKind']?.toString(),
      isDeleted: json['isDeleted'] == true,
    );
  }
}

class CommunityReaction {
  final String emoji;
  final int count;
  final bool reacted;

  const CommunityReaction({
    required this.emoji,
    required this.count,
    required this.reacted,
  });

  factory CommunityReaction.fromJson(Map<String, dynamic> json) {
    return CommunityReaction(
      emoji: json['emoji']?.toString() ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
      reacted: json['reacted'] == true,
    );
  }
}

class CommunityMessage {
  final String id;
  final String content;
  final String messageType;
  final List<CommunityAttachment> attachments;
  final String? clientMessageId;
  final CommunityReplyPreview? replyTo;
  final List<CommunityReaction> reactions;
  final CommunitySender sender;
  final bool isMine;
  final bool canEdit;
  final bool canDelete;
  final DateTime createdAt;
  final DateTime? editedAt;
  final bool pending;
  final bool failed;

  const CommunityMessage({
    required this.id,
    required this.content,
    required this.messageType,
    required this.attachments,
    required this.sender,
    required this.isMine,
    required this.createdAt,
    this.clientMessageId,
    this.replyTo,
    this.reactions = const [],
    this.canEdit = false,
    this.canDelete = false,
    this.editedAt,
    this.pending = false,
    this.failed = false,
  });

  factory CommunityMessage.fromJson(Map<String, dynamic> json) {
    final attachmentsRaw = json['attachments'] as List<dynamic>? ?? const [];
    final reactionsRaw = json['reactions'] as List<dynamic>? ?? const [];
    final replyRaw = json['replyTo'];
    return CommunityMessage(
      id: json['id']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      messageType: json['messageType']?.toString() ?? 'text',
      attachments: attachmentsRaw
          .whereType<Map<String, dynamic>>()
          .map(CommunityAttachment.fromJson)
          .toList(),
      clientMessageId: json['clientMessageId']?.toString(),
      replyTo: replyRaw is Map<String, dynamic>
          ? CommunityReplyPreview.fromJson(replyRaw)
          : null,
      reactions: reactionsRaw
          .whereType<Map<String, dynamic>>()
          .map(CommunityReaction.fromJson)
          .toList(),
      sender: CommunitySender.fromJson(
        json['sender'] as Map<String, dynamic>? ?? const {},
      ),
      isMine: json['isMine'] == true,
      canEdit: json['canEdit'] == true,
      canDelete: json['canDelete'] == true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      editedAt: DateTime.tryParse(json['editedAt']?.toString() ?? ''),
    );
  }

  CommunityMessage copyWith({
    List<CommunityReaction>? reactions,
    bool? pending,
    bool? failed,
    String? content,
    DateTime? editedAt,
  }) {
    return CommunityMessage(
      id: id,
      content: content ?? this.content,
      messageType: messageType,
      attachments: attachments,
      clientMessageId: clientMessageId,
      replyTo: replyTo,
      reactions: reactions ?? this.reactions,
      sender: sender,
      isMine: isMine,
      canEdit: canEdit,
      canDelete: canDelete,
      createdAt: createdAt,
      editedAt: editedAt ?? this.editedAt,
      pending: pending ?? this.pending,
      failed: failed ?? this.failed,
    );
  }
}

class CommunityOverview {
  final String name;
  final String description;
  final bool verified;
  final int memberCount;
  final int onlineCount;
  final List<String> rules;
  final DateTime createdAt;

  const CommunityOverview({
    required this.name,
    required this.description,
    required this.verified,
    required this.memberCount,
    required this.onlineCount,
    required this.rules,
    required this.createdAt,
  });

  factory CommunityOverview.fromJson(Map<String, dynamic> json) {
    final community = json['community'] as Map<String, dynamic>? ?? const {};
    return CommunityOverview(
      name: community['name']?.toString() ?? 'Geters Community',
      description: community['description']?.toString() ?? '',
      verified: community['verified'] == true,
      memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
      onlineCount: (json['onlineCount'] as num?)?.toInt() ?? 0,
      rules: (json['rules'] as List<dynamic>? ?? const [])
          .map((e) => e.toString())
          .toList(),
      createdAt: DateTime.tryParse(community['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class CommunityMember {
  final String id;
  final String name;
  final String handle;
  final String? avatarUrl;
  final bool isOnline;

  const CommunityMember({
    required this.id,
    required this.name,
    required this.handle,
    this.avatarUrl,
    this.isOnline = false,
  });

  factory CommunityMember.fromJson(Map<String, dynamic> json) {
    return CommunityMember(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      handle: (json['handle']?.toString() ?? '').replaceFirst(RegExp(r'^@+'), ''),
      avatarUrl: json['avatarUrl']?.toString(),
      isOnline: json['isOnline'] == true,
    );
  }
}

class CommunityPage {
  final List<CommunityMessage> messages;
  final bool hasMore;
  final String? nextCursor;

  const CommunityPage({
    required this.messages,
    required this.hasMore,
    this.nextCursor,
  });
}

/// Streams `/api/community/stream` with the same SSE framing used by DM chat.
class CommunityStreamClient {
  final String baseUrl;
  final String? Function() tokenProvider;
  final http.Client Function() clientFactory;

  void Function(String type, Map<String, dynamic> data)? onEvent;
  void Function()? onConnected;
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

  CommunityStreamClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client Function()? clientFactory,
    Random? random,
  })  : clientFactory = clientFactory ?? http.Client.new,
        _random = random ?? Random();

  bool get isConnected => _connected;

  void start() {
    if (_disposed || !_stopped) return;
    _stopped = false;
    _attempt = 0;
    _open();
  }

  void stop() {
    _stopped = true;
    _retryTimer?.cancel();
    _retryTimer = null;
    _closeConnection();
    _setConnected(false);
  }

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
        Uri.parse('$baseUrl/community/stream'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'text/event-stream';
      request.headers['Cache-Control'] = 'no-cache';

      final response = await client.send(request);
      if (response.statusCode != 200) {
        throw http.ClientException(
          'Chat ulanishi rad etildi (HTTP ${response.statusCode})',
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

  Duration _backoff(int attempt) {
    final cappedSeconds = min(30, 1 << min(attempt, 5));
    final jitter = 0.8 + (_random.nextDouble() * 0.4);
    return Duration(
      milliseconds: (cappedSeconds * 1000 * jitter).round().clamp(500, 30000),
    );
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

class CommunityRepository {
  final ApiClient _apiClient;

  CommunityRepository({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  /// Bearer token used by the SSE stream and multipart uploads.
  String? get apiToken => _apiClient.authToken;

  Future<CommunityOverview> getOverview() async {
    final decoded = await _apiClient.get('/community');
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    return CommunityOverview.fromJson(data);
  }

  Future<CommunityPage> getMessages({String? cursor, int limit = 30}) async {
    final decoded = await _apiClient.get(
      '/community/messages',
      queryParameters: {
        'limit': '$limit',
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['messages'] as List<dynamic>? ?? const [];
    return CommunityPage(
      messages: raw
          .whereType<Map<String, dynamic>>()
          .map(CommunityMessage.fromJson)
          .toList(),
      hasMore: data['hasMore'] == true,
      nextCursor: data['nextCursor']?.toString(),
    );
  }

  Future<CommunityMessage> sendMessage({
    required String content,
    List<CommunityAttachment> attachments = const [],
    String? replyToId,
    String? clientMessageId,
  }) async {
    final decoded = await _apiClient.post(
      '/community/messages',
      body: {
        'content': content,
        'attachments': attachments.map((a) => a.toJson()).toList(),
        if (replyToId != null) 'replyToId': replyToId,
        if (clientMessageId != null) 'clientMessageId': clientMessageId,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['message'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException('Xabar ma\'lumotlari qaytarilmadi');
    }
    return CommunityMessage.fromJson(raw);
  }

  Future<CommunityMessage> editMessage(String id, String content) async {
    final decoded = await _apiClient.patch(
      '/community/messages/$id',
      body: {'content': content},
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['message'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException('Xabar ma\'lumotlari qaytarilmadi');
    }
    return CommunityMessage.fromJson(raw);
  }

  Future<void> deleteMessage(String id) async {
    await _apiClient.delete('/community/messages/$id');
  }

  Future<List<CommunityReaction>> toggleReaction(
    String messageId,
    String emoji,
  ) async {
    final decoded = await _apiClient.post(
      '/community/messages/$messageId/reactions',
      body: {'emoji': emoji},
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['reactions'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(CommunityReaction.fromJson)
        .toList();
  }

  Future<void> markRead({String? messageId}) async {
    await _apiClient.post(
      '/community/read',
      body: {if (messageId != null) 'messageId': messageId},
    );
  }

  Future<void> sendTyping(bool isTyping) async {
    await _apiClient.post('/community/typing', body: {'isTyping': isTyping});
  }

  Future<List<CommunityMember>> getMembers({String? cursor, int limit = 20}) async {
    final decoded = await _apiClient.get(
      '/community/members',
      queryParameters: {
        'limit': '$limit',
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
    );
    final data = decoded['data'] as Map<String, dynamic>? ?? const {};
    final raw = data['items'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(CommunityMember.fromJson)
        .toList();
  }

  /// Uploads an image/video through the platform upload API and returns the
  /// attachment payload expected by the community message endpoint.
  Future<CommunityAttachment> uploadFile(File file) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConstants.baseUrl}/upload'),
    );
    final token = _apiClient.authToken;
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields['folder'] = 'community';
    request.files.add(await http.MultipartFile.fromPath('file', file.path));

    final response = await request.send();
    final body = await response.stream.bytesToString();
    Map<String, dynamic>? decoded;
    try {
      final json = jsonDecode(body);
      if (json is Map<String, dynamic>) decoded = json;
    } catch (_) {
      // non-JSON response
    }

    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        decoded?['data'] is Map<String, dynamic>) {
      final data = decoded!['data'] as Map<String, dynamic>;
      final mimeType = data['mimeType']?.toString() ?? 'application/octet-stream';
      final kind = mimeType.startsWith('image/')
          ? 'image'
          : mimeType.startsWith('video/')
              ? 'video'
              : 'file';
      return CommunityAttachment(
        url: data['url']?.toString() ?? '',
        kind: kind,
        name: file.uri.pathSegments.isNotEmpty
            ? file.uri.pathSegments.last
            : 'fayl',
        mimeType: mimeType,
        sizeBytes: (data['size'] as num?)?.toInt() ?? 0,
      );
    }

    final error = decoded?['error'];
    final message = error is Map
        ? error['message']?.toString()
        : error?.toString();
    throw ApiException(
      message ?? 'Faylni yuklab bo\'lmadi (HTTP ${response.statusCode})',
      statusCode: response.statusCode,
    );
  }
}
