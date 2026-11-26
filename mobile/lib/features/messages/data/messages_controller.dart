import 'dart:async';

import 'package:material_ui/material_ui.dart';
import '../../feed/models/author.dart';
import '../models/conversation.dart';
import 'messages_repository.dart';
import 'messages_stream_client.dart';

/// Backend-backed direct-message state.
///
/// Conversations and history come from `/api/messages/*`. Sending is optimistic
/// with an idempotent `clientMessageId`; a failed send stays on screen as a
/// retryable bubble instead of silently disappearing. Live updates arrive over
/// the `/api/messages/stream` SSE endpoint, with a resync after every reconnect.
class MessagesController extends ChangeNotifier with WidgetsBindingObserver {
  final MessagesRepository? repository;
  final MessagesStream? stream;

  String? _currentUserId;
  String? _loadedUserId;
  String? _activeConversationId;

  final List<Conversation> _conversations = [];
  final Map<String, List<DirectMessage>> _messagesByConv = {};
  final Map<String, DateTime?> _peerLastReadAt = {};
  final Map<String, bool> _typingByConv = {};
  final Map<String, Timer> _typingTimers = {};

  bool _isLoading = false;
  String? _errorMessage;
  String? _lastSendError;
  DateTime? _lastSyncAt;
  int _tempSeq = 0;
  bool _observerAttached = false;
  bool _disposed = false;

  MessagesController({this.repository, this.stream}) {
    stream
      ?..onEvent = _handleStreamEvent
      ..onConnected = _handleStreamConnected
      ..onDisconnected = _handleStreamDisconnected;
    try {
      WidgetsBinding.instance.addObserver(this);
      _observerAttached = true;
    } catch (_) {
      // No bindings (unit tests) — live updates simply stay manual.
    }
  }

  List<Conversation> get conversations => List.unmodifiable(_conversations);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get lastSendError => _lastSendError;
  bool get isLive => stream?.isConnected ?? false;

  int get totalUnreadCount =>
      _conversations.fold(0, (sum, c) => sum + c.unreadCount);

  bool isPeerTyping(String conversationId) =>
      _typingByConv[conversationId] ?? false;

  /// Latest known snapshot of a conversation (presence and unread counts move
  /// with live events, so screens must not keep their own stale copy).
  Conversation? conversationById(String conversationId) {
    for (final conversation in _conversations) {
      if (conversation.id == conversationId) return conversation;
    }
    return null;
  }

  /// True when the signed-in user authored [message].
  bool isMine(DirectMessage message) =>
      _currentUserId != null && message.senderId == _currentUserId;

  void clearError() {
    if (_errorMessage == null && _lastSendError == null) return;
    _errorMessage = null;
    _lastSendError = null;
    notifyListeners();
  }

  /// Marks which chat is on screen, so incoming messages for it are not
  /// counted as unread.
  void setActiveConversation(String? conversationId) {
    _activeConversationId = conversationId;
  }

  /// Switches the controller to a user scope. Passing `null` (sign-out) drops
  /// all cached conversations so another account can never see them.
  Future<void> setActiveUser(String? userId) async {
    if (_loadedUserId == userId && userId != null && _conversations.isNotEmpty) {
      return;
    }
    final changed = _loadedUserId != userId;
    _loadedUserId = userId;
    _currentUserId = userId;

    if (changed) {
      _conversations.clear();
      _messagesByConv.clear();
      _peerLastReadAt.clear();
      _clearTyping();
      _lastSyncAt = null;
      _errorMessage = null;
    }
    notifyListeners();

    if (userId == null || userId.isEmpty) {
      stopLiveUpdates();
      return;
    }

    await loadConversations();
    startLiveUpdates();
  }

  // ---------------------------------------------------------------- loading

  Future<void> loadConversations() async {
    final repo = repository;
    if (repo == null || _currentUserId == null) return;

    if (_conversations.isEmpty) {
      _isLoading = true;
      notifyListeners();
    }
    try {
      final remote = await repo.getConversations();
      _conversations
        ..clear()
        ..addAll(remote);
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      _emit();
    }
  }

  List<DirectMessage> messagesFor(String conversationId) {
    return List.unmodifiable(_messagesByConv[conversationId] ?? const []);
  }

  Future<void> loadMessages(
    String conversationId, {
    bool forceRefresh = false,
  }) async {
    final repo = repository;
    if (repo == null || conversationId.isEmpty) return;
    if (!forceRefresh && _messagesByConv.containsKey(conversationId)) return;

    try {
      final page = await repo.getMessages(conversationId);
      _peerLastReadAt[conversationId] = page.peerLastReadAt;
      _messagesByConv[conversationId] =
          page.messages.map(_applyReadState).toList();
      _emit();
    } catch (e) {
      _errorMessage = e.toString();
      _emit();
    }
  }

  Future<void> markConversationRead(String conversationId) async {
    final idx = _conversations.indexWhere((c) => c.id == conversationId);
    if (idx != -1 && _conversations[idx].unreadCount > 0) {
      _conversations[idx] = _conversations[idx].copyWith(unreadCount: 0);
      _emit();
    }

    try {
      await repository?.markRead(conversationId);
    } catch (_) {
      // Read receipts are best-effort; a failed call must not break the UI.
    }
  }

  // ------------------------------------------------------------ live updates

  void startLiveUpdates() {
    if (_currentUserId == null) return;
    _lastSyncAt ??= DateTime.now();
    stream?.start();
  }

  void stopLiveUpdates() {
    stream?.stop();
  }

  void _handleStreamConnected() {
    // Anything emitted while we were away has to be pulled explicitly.
    _syncMissedMessages();
    _emit();
  }

  void _handleStreamDisconnected() {
    _emit();
  }

  void _handleStreamEvent(String type, Map<String, dynamic> data) {
    switch (type) {
      case 'message:new':
        _onMessageNew(data);
        break;
      case 'message:read':
        _onMessageRead(data);
        break;
      case 'presence:update':
        _onPresence(data);
        break;
      case 'typing:update':
        _onTyping(data);
        break;
      case 'connection:ack':
        _onConnectedAck(data);
        break;
    }
  }

  void _onConnectedAck(Map<String, dynamic> data) {
    final online = data['onlineUserIds'];
    if (online is List) {
      final ids = online.map((e) => e.toString()).toSet();
      for (var i = 0; i < _conversations.length; i++) {
        final conv = _conversations[i];
        final isOnline = ids.contains(conv.peer.id);
        if (conv.isOnline != isOnline) {
          _conversations[i] = conv.copyWith(isOnline: isOnline);
        }
      }
    }
    _lastSyncAt ??= DateTime.now();
    _emit();
  }

  void _onMessageNew(Map<String, dynamic> data) {
    final conversationId = data['conversationId']?.toString() ?? '';
    final raw = data['message'];
    if (conversationId.isEmpty || raw is! Map<String, dynamic>) return;

    final incoming = DirectMessage.fromJson(raw);
    final mine = isMine(incoming);
    _upsertMessage(conversationId, incoming.copyWith(isRead: mine ? incoming.isRead : true));
    _bumpConversation(conversationId, incoming.text, incrementUnread: !mine);
    _touchSyncCursor(incoming.createdAt);
    _emit();
  }

  void _onMessageRead(Map<String, dynamic> data) {
    final conversationId = data['conversationId']?.toString() ?? '';
    if (conversationId.isEmpty) return;

    final rawAt = data['lastReadAt']?.toString();
    final readAt = (rawAt == null || rawAt.isEmpty) ? null : DateTime.tryParse(rawAt);
    _peerLastReadAt[conversationId] = readAt;
    if (readAt == null) return;

    final list = _messagesByConv[conversationId];
    if (list == null) return;
    for (var i = 0; i < list.length; i++) {
      final message = list[i];
      if (!isMine(message) || message.isPending) continue;
      final isRead = !message.createdAt.isAfter(readAt);
      if (message.isRead != isRead) {
        list[i] = message.copyWith(isRead: isRead);
      }
    }
    _emit();
  }

  void _onPresence(Map<String, dynamic> data) {
    final userId = data['userId']?.toString() ?? '';
    if (userId.isEmpty) return;
    final isOnline = data['status']?.toString() == 'online';

    var changed = false;
    for (var i = 0; i < _conversations.length; i++) {
      final conv = _conversations[i];
      if (conv.peer.id == userId && conv.isOnline != isOnline) {
        _conversations[i] = conv.copyWith(isOnline: isOnline);
        changed = true;
      }
    }
    if (changed) _emit();
  }

  void _onTyping(Map<String, dynamic> data) {
    final conversationId = data['conversationId']?.toString() ?? '';
    final userId = data['userId']?.toString() ?? '';
    if (conversationId.isEmpty || userId == _currentUserId) return;

    final isTyping = data['isTyping'] == true;
    _typingByConv[conversationId] = isTyping;

    _typingTimers.remove(conversationId)?.cancel();
    if (isTyping) {
      // Server expires typing after 3.5s; this guards against a lost stop event.
      _typingTimers[conversationId] = Timer(const Duration(seconds: 5), () {
        _typingByConv[conversationId] = false;
        _emit();
      });
    }
    _emit();
  }

  Future<void> _syncMissedMessages() async {
    final repo = repository;
    final since = _lastSyncAt;
    if (repo == null || since == null) return;

    try {
      final missed = await repo.syncMissedMessages(since.toUtc().toIso8601String());
      if (missed.isEmpty) return;

      for (final message in missed) {
        if (message.conversationId.isEmpty) continue;
        _upsertMessage(message.conversationId, message);
        _touchSyncCursor(message.createdAt);
      }
      await loadConversations();
      _emit();
    } catch (_) {
      // The poll fallback and the next reconnect will cover this.
    }
  }

  // ---------------------------------------------------------------- sending

  /// Optimistically appends [text] and persists it to the backend.
  Future<bool> sendMessage(String conversationId, String text) async {
    final clean = text.trim();
    if (clean.isEmpty || conversationId.isEmpty) return false;

    _tempSeq += 1;
    final tempId = 'pending_${DateTime.now().microsecondsSinceEpoch}_$_tempSeq';

    final optimistic = DirectMessage(
      id: tempId,
      conversationId: conversationId,
      senderId: _currentUserId ?? '',
      text: clean,
      createdAt: DateTime.now(),
      isRead: false,
      isPending: true,
      clientMessageId: tempId,
    );

    _messagesByConv.putIfAbsent(conversationId, () => []).add(optimistic);
    _bumpConversation(conversationId, clean, incrementUnread: false);
    _lastSendError = null;
    _emit();

    return _deliver(conversationId, tempId);
  }

  /// Re-sends a bubble that previously failed.
  Future<bool> retryMessage(String conversationId, String messageId) async {
    final list = _messagesByConv[conversationId];
    if (list == null) return false;

    final idx = list.indexWhere((m) => m.id == messageId);
    if (idx < 0) return false;

    list[idx] = list[idx].copyWith(isPending: true, isFailed: false);
    _lastSendError = null;
    _emit();
    return _deliver(conversationId, messageId);
  }

  Future<bool> _deliver(String conversationId, String tempId) async {
    final repo = repository;
    final list = _messagesByConv[conversationId];
    if (repo == null || list == null) return false;

    final idx = list.indexWhere((m) => m.id == tempId);
    if (idx < 0) return false;
    final pending = list[idx];

    try {
      final saved = await repo.sendMessage(
        conversationId,
        pending.text,
        clientMessageId: pending.clientMessageId ?? tempId,
      );
      // Realtime may already have replaced the optimistic copy.
      final at = list.indexWhere(
        (m) =>
            m.id == tempId ||
            (saved.clientMessageId != null &&
                m.clientMessageId == saved.clientMessageId),
      );
      if (at >= 0) {
        list[at] = saved;
      } else {
        list.add(saved);
      }
      _emit();
      return true;
    } catch (e) {
      final at = list.indexWhere((m) => m.id == tempId);
      if (at >= 0) {
        list[at] = list[at].copyWith(isPending: false, isFailed: true);
      }
      _lastSendError = e.toString();
      _emit();
      return false;
    }
  }

  // --------------------------------------------------------- conversations

  /// Finds the existing direct conversation with [peer] or creates one on the
  /// server. Throws [ApiException] when the peer forbids DMs so the caller can
  /// show the reason instead of opening a dead chat screen.
  Future<Conversation> startOrOpenConversation(Author peer) async {
    final cleanHandle = peer.handle.replaceFirst('@', '').trim().toLowerCase();

    for (final conv in _conversations) {
      if (conv.peer.handle.replaceFirst('@', '').trim().toLowerCase() ==
          cleanHandle) {
        return conv;
      }
    }

    final repo = repository;
    if (repo == null) {
      throw StateError('Messaging is not configured');
    }

    final conversation = await repo.getOrCreateDirectConversation(cleanHandle);
    _conversations.removeWhere((c) => c.id == conversation.id);
    _conversations.insert(0, conversation);
    _emit();
    return conversation;
  }

  // ------------------------------------------------------------- internals

  void _upsertMessage(String conversationId, DirectMessage message) {
    final list =
        _messagesByConv.putIfAbsent(conversationId, () => <DirectMessage>[]);

    final idx = list.indexWhere(
      (m) =>
          m.id == message.id ||
          (message.clientMessageId != null &&
              m.clientMessageId == message.clientMessageId) ||
          (message.clientMessageId != null && m.id == message.clientMessageId),
    );

    if (idx >= 0) {
      list[idx] = message;
      return;
    }

    list.add(message);
    final last = list.length > 2 ? list[list.length - 2] : null;
    if (last != null && last.createdAt.isAfter(message.createdAt)) {
      list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    }
  }

  DirectMessage _applyReadState(DirectMessage message) {
    if (!isMine(message) || message.isPending) return message;
    final readAt = _peerLastReadAt[message.conversationId];
    if (readAt == null) return message.copyWith(isRead: false);
    return message.copyWith(isRead: !message.createdAt.isAfter(readAt));
  }

  void _bumpConversation(
    String conversationId,
    String lastText, {
    required bool incrementUnread,
  }) {
    final idx = _conversations.indexWhere((c) => c.id == conversationId);
    if (idx == -1) {
      // Conversation we have never listed (e.g. peer started it).
      loadConversations();
      return;
    }

    final existing = _conversations.removeAt(idx);
    final shouldCountUnread =
        incrementUnread && _activeConversationId != conversationId;
    _conversations.insert(
      0,
      existing.copyWith(
        lastMessageText: lastText,
        lastMessageAt: DateTime.now(),
        unreadCount: shouldCountUnread ? existing.unreadCount + 1 : existing.unreadCount,
      ),
    );
  }

  void _touchSyncCursor(DateTime createdAt) {
    final current = _lastSyncAt;
    if (current == null || createdAt.isAfter(current)) {
      _lastSyncAt = createdAt;
    }
  }

  void _clearTyping() {
    for (final timer in _typingTimers.values) {
      timer.cancel();
    }
    _typingTimers.clear();
    _typingByConv.clear();
  }

  void _emit() {
    if (_disposed) return;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_currentUserId == null || _disposed) return;
    if (state == AppLifecycleState.resumed) {
      startLiveUpdates();
    } else if (state == AppLifecycleState.paused) {
      // Backgrounding drops the socket; the next resume resyncs.
      stopLiveUpdates();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _clearTyping();
    if (_observerAttached) {
      try {
        WidgetsBinding.instance.removeObserver(this);
      } catch (_) {}
    }
    stream?.dispose();
    super.dispose();
  }
}
