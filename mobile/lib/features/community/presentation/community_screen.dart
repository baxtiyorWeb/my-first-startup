import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../data/community_repository.dart';

const List<String> kCommunityReactionOptions = [
  '❤️',
  '👍',
  '🔥',
  '😂',
  '🎉',
  '🙏',
  '😮',
  '😢',
  '👏',
  '💯',
];

/// Single shared public community chat ("Guruh").
class CommunityScreen extends StatefulWidget {
  final CommunityRepository repository;
  final CommunityStreamClient Function()? streamFactory;
  final String currentUserId;
  final String currentUserName;

  const CommunityScreen({
    super.key,
    required this.repository,
    required this.currentUserId,
    required this.currentUserName,
    this.streamFactory,
  });

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  late final CommunityStreamClient _stream = widget.streamFactory != null
      ? widget.streamFactory!()
      : CommunityStreamClient(
          baseUrl: ApiConstants.baseUrl,
          tokenProvider: () => widget.repository.apiToken,
        );

  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  final ImagePicker _picker = ImagePicker();
  final Map<String, GlobalKey> _messageKeys = {};

  CommunityOverview? _overview;
  final List<CommunityMessage> _messages = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _isSending = false;
  bool _isUploading = false;
  bool _isConnected = false;
  bool _hasMore = false;
  String? _nextCursor;
  String? _error;
  String? _highlightId;
  CommunityMessage? _replyTo;
  String? _typingLabel;
  Timer? _typingTimer;
  DateTime _lastTypingSent = DateTime.fromMillisecondsSinceEpoch(0);
  final Map<String, Timer> _typingTimers = {};

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _stream.onConnected = () {
      if (mounted) setState(() => _isConnected = true);
    };
    _stream.onDisconnected = () {
      if (mounted) setState(() => _isConnected = false);
    };
    _stream.onEvent = _handleStreamEvent;
    _stream.start();
    _loadInitial();
  }

  @override
  void dispose() {
    _typingTimer?.cancel();
    for (final timer in _typingTimers.values) {
      timer.cancel();
    }
    _stream.dispose();
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        widget.repository.getMessages(limit: 30),
        widget.repository.getOverview(),
      ]);
      final page = results[0] as CommunityPage;
      final overview = results[1] as CommunityOverview;
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(page.messages);
        _hasMore = page.hasMore;
        _nextCursor = page.nextCursor;
        _overview = overview;
        _isLoading = false;
      });
      _scrollToBottom(animated: false);
      _markRead();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore || _nextCursor == null) return;
    setState(() => _isLoadingMore = true);
    final previousMax = _scrollController.hasClients
        ? _scrollController.position.maxScrollExtent
        : 0.0;
    final previousOffset =
        _scrollController.hasClients ? _scrollController.offset : 0.0;
    try {
      final page = await widget.repository.getMessages(cursor: _nextCursor);
      if (!mounted) return;
      setState(() {
        _messages.insertAll(0, page.messages);
        _hasMore = page.hasMore;
        _nextCursor = page.nextCursor;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_scrollController.hasClients) return;
        final delta = _scrollController.position.maxScrollExtent - previousMax;
        _scrollController.jumpTo(previousOffset + delta);
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    if (_scrollController.offset <= 60 && _hasMore && !_isLoadingMore) {
      _loadMore();
    }
  }

  void _scrollToBottom({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      final target = _scrollController.position.maxScrollExtent;
      if (animated) {
        _scrollController.animateTo(
          target,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      } else {
        _scrollController.jumpTo(target);
      }
    });
  }

  void _markRead() {
    if (_messages.isEmpty) return;
    widget.repository.markRead(messageId: _messages.last.id).catchError((_) {});
  }

  void _handleStreamEvent(String type, Map<String, dynamic> data) {
    if (!mounted) return;
    switch (type) {
      case 'message:new':
      case 'message:updated':
        final raw = data['message'];
        if (raw is Map<String, dynamic>) {
          final message = CommunityMessage.fromJson(raw);
          final wasAtBottom = _scrollController.hasClients &&
              _scrollController.position.maxScrollExtent -
                      _scrollController.offset <
                  140;
          setState(() => _mergeMessage(message));
          if (wasAtBottom || message.isMine) _scrollToBottom();
          _markRead();
        }
        break;
      case 'message:deleted':
        final id = data['messageId']?.toString();
        if (id != null) {
          setState(() => _messages.removeWhere((item) => item.id == id));
        }
        break;
      case 'message:reaction':
        final id = data['messageId']?.toString();
        final emoji = data['emoji']?.toString();
        final userId = data['userId']?.toString();
        final added = data['added'] == true;
        final rawList = data['reactions'] as List<dynamic>? ?? const [];
        if (id == null) break;
        final isMyReaction = userId == widget.currentUserId;
        setState(() {
          for (var i = 0; i < _messages.length; i++) {
            if (_messages[i].id != id) continue;
            final current = _messages[i];
            final updated = rawList
                .whereType<Map<String, dynamic>>()
                .map((entry) {
                  final entryEmoji = entry['emoji']?.toString() ?? '';
                  final existing = current.reactions
                      .where((r) => r.emoji == entryEmoji)
                      .toList();
                  final reacted = isMyReaction && entryEmoji == emoji
                      ? added
                      : (existing.isNotEmpty && existing.first.reacted);
                  return CommunityReaction(
                    emoji: entryEmoji,
                    count: (entry['count'] as num?)?.toInt() ?? 0,
                    reacted: reacted,
                  );
                })
                .toList();
            _messages[i] = current.copyWith(reactions: updated);
          }
        });
        break;
      case 'typing:start':
        final userId = data['userId']?.toString();
        final name = data['name']?.toString() ?? 'Foydalanuvchi';
        if (userId == null || userId == widget.currentUserId) break;
        _typingTimers[userId]?.cancel();
        _typingTimers[userId] = Timer(const Duration(seconds: 6), () {
          _typingTimers.remove(userId);
          if (mounted) setState(() => _typingLabel = null);
        });
        setState(() => _typingLabel = '$name yozmoqda');
        break;
      case 'typing:stop':
        final userId = data['userId']?.toString();
        if (userId != null) {
          _typingTimers.remove(userId)?.cancel();
        }
        setState(() => _typingLabel = null);
        break;
      default:
        break;
    }
  }

  void _mergeMessage(CommunityMessage message) {
    _messages.removeWhere(
      (item) =>
          item.id == message.id ||
          (message.clientMessageId != null &&
              item.clientMessageId == message.clientMessageId),
    );
    _messages.add(message);
    _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  void _notifyTyping() {
    final now = DateTime.now();
    if (now.difference(_lastTypingSent).inMilliseconds > 2500) {
      _lastTypingSent = now;
      widget.repository.sendTyping(true).catchError((_) {});
    }
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(milliseconds: 2500), () {
      widget.repository.sendTyping(false).catchError((_) {});
    });
  }

  Future<void> _send() async {
    final content = _textController.text.trim();
    if (content.isEmpty || _isSending) return;

    final replyTarget = _replyTo;
    final clientMessageId =
        'm_${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(9999)}';
    final optimistic = CommunityMessage(
      id: 'pending_$clientMessageId',
      content: content,
      messageType: 'text',
      attachments: const [],
      clientMessageId: clientMessageId,
      sender: CommunitySender(
        id: widget.currentUserId,
        name: widget.currentUserName,
        handle: '',
      ),
      isMine: true,
      createdAt: DateTime.now(),
      pending: true,
    );

    setState(() {
      _messages.add(optimistic);
      _isSending = true;
      _replyTo = null;
    });
    _textController.clear();
    _scrollToBottom();

    try {
      final saved = await widget.repository.sendMessage(
        content: content,
        replyToId: replyTarget?.id,
        clientMessageId: clientMessageId,
      );
      if (!mounted) return;
      setState(() {
        _messages.removeWhere((item) => item.id == optimistic.id);
        _mergeMessage(saved);
      });
      _markRead();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        final index = _messages.indexWhere((item) => item.id == optimistic.id);
        if (index >= 0) {
          _messages[index] = _messages[index].copyWith(
            pending: false,
            failed: true,
          );
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _pickAttachment({required bool video}) async {
    if (_isUploading) return;
    try {
      final XFile? picked = video
          ? await _picker.pickVideo(
              source: ImageSource.gallery,
              maxDuration: const Duration(minutes: 3),
            )
          : await _picker.pickImage(
              source: ImageSource.gallery,
              imageQuality: 85,
            );
      if (picked == null) return;

      setState(() => _isUploading = true);
      final attachment =
          await widget.repository.uploadFile(File(picked.path));
      if (!mounted) return;

      final clientMessageId =
          'm_${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(9999)}';
      final optimistic = CommunityMessage(
        id: 'pending_$clientMessageId',
        content: '',
        messageType: attachment.kind,
        attachments: [attachment],
        clientMessageId: clientMessageId,
        sender: CommunitySender(
          id: widget.currentUserId,
          name: widget.currentUserName,
          handle: '',
        ),
        isMine: true,
        createdAt: DateTime.now(),
        pending: true,
      );
      setState(() => _messages.add(optimistic));
      _scrollToBottom();

      final saved = await widget.repository.sendMessage(
        content: '',
        attachments: [attachment],
        replyToId: _replyTo?.id,
        clientMessageId: clientMessageId,
      );
      if (!mounted) return;
      setState(() {
        _messages.removeWhere((item) => item.id == optimistic.id);
        _replyTo = null;
        _mergeMessage(saved);
      });
      _markRead();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _toggleReaction(CommunityMessage message, String emoji) async {
    try {
      final reactions =
          await widget.repository.toggleReaction(message.id, emoji);
      if (!mounted) return;
      setState(() {
        final index = _messages.indexWhere((item) => item.id == message.id);
        if (index >= 0) {
          _messages[index] = _messages[index].copyWith(reactions: reactions);
        }
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _deleteMessage(CommunityMessage message) async {
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Xabarni o\'chirish',
      message: 'Bu xabar guruhdagi barcha uchun o\'chiriladi.',
      confirmLabel: 'O\'chirish',
      isDanger: true,
    );
    if (!confirmed) return;
    try {
      await widget.repository.deleteMessage(message.id);
      if (!mounted) return;
      setState(() => _messages.removeWhere((item) => item.id == message.id));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _editMessage(CommunityMessage message) async {
    final controller = TextEditingController(text: message.content);
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xabarni tahrirlash'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 4,
          minLines: 1,
          decoration: const InputDecoration(hintText: 'Yangi matn'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Bekor qilish'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text.trim()),
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (result == null || result.isEmpty || result == message.content) return;
    try {
      final updated =
          await widget.repository.editMessage(message.id, result);
      if (!mounted) return;
      setState(() => _mergeMessage(updated));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  void _scrollToMessage(String messageId) {
    final key = _messageKeys[messageId];
    final context = key?.currentContext;
    if (context == null) {
      ScaffoldMessenger.of(this.context).showSnackBar(
        const SnackBar(content: Text('Xabar hozir yuklangan sahifada topilmadi')),
      );
      return;
    }
    Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 260),
      alignment: 0.4,
    );
    setState(() => _highlightId = messageId);
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (mounted && _highlightId == messageId) {
        setState(() => _highlightId = null);
      }
    });
  }

  void _showMessageActions(CommunityMessage message) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDarkElevated : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: kCommunityReactionOptions
                    .map(
                      (emoji) => InkWell(
                        onTap: () {
                          Navigator.of(sheetContext).pop();
                          _toggleReaction(message, emoji);
                        },
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            color: isDark
                                ? AppColors.surfaceDarkSubtle
                                : AppColors.surfaceLightSubtle,
                          ),
                          child: Text(emoji, style: const TextStyle(fontSize: 18)),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.reply_rounded),
              title: const Text('Javob berish'),
              onTap: () {
                Navigator.of(sheetContext).pop();
                setState(() => _replyTo = message);
                _focusNode.requestFocus();
              },
            ),
            if (message.canEdit && message.messageType == 'text')
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Tahrirlash'),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _editMessage(message);
                },
              ),
            if (message.canDelete)
              ListTile(
                leading: Icon(Icons.delete_outline, color: AppColors.danger),
                title: Text(
                  'O\'chirish',
                  style: const TextStyle(color: AppColors.danger),
                ),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _deleteMessage(message);
                },
              ),
            const SizedBox(height: 6),
          ],
        ),
      ),
    );
  }

  void _openCommunityInfo() {
    final overview = _overview;
    if (overview == null) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.surfaceDarkElevated : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (sheetContext) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.72,
        maxChildSize: 0.92,
        minChildSize: 0.4,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
          children: [
            Text(
              overview.name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              overview.description,
              style: TextStyle(
                fontSize: 12.5,
                height: 1.5,
                color: isDark
                    ? AppColors.textMutedDark
                    : AppColors.textMutedLight,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '${overview.memberCount} a\'zo · ${overview.onlineCount} onlayn · Ommaviy guruh',
              style: TextStyle(
                fontSize: 12,
                color: isDark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Guruh qoidalari',
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            ...overview.rules.asMap().entries.map(
                  (entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${entry.key + 1}. ',
                          style: const TextStyle(fontSize: 12.5),
                        ),
                        Expanded(
                          child: Text(
                            entry.value,
                            style: const TextStyle(fontSize: 12.5, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            const SizedBox(height: 18),
            const Text(
              'A\'zolar',
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            FutureBuilder<List<CommunityMember>>(
              future: widget.repository.getMembers(limit: 20),
              builder: (context, snapshot) {
                final members = snapshot.data ?? const <CommunityMember>[];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Center(
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  );
                }
                if (members.isEmpty) {
                  return const Text('A\'zolar yuklanmadi');
                }
                return Column(
                  children: members
                      .map(
                        (member) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: AppAvatar(
                            imageUrl: member.avatarUrl,
                            name: member.name,
                            size: 34,
                            isOnline: member.isOnline,
                          ),
                          title: Text(
                            member.name,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          subtitle: Text(
                            '@${member.handle}',
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                      )
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    final local = date.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  String _dateLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(date.year, date.month, date.day);
    final diff = today.difference(day).inDays;
    if (diff == 0) return 'Bugun';
    if (diff == 1) return 'Kecha';
    return '${date.day}.${date.month.toString().padLeft(2, '0')}.${date.year}';
  }

  String _formatBytes(int bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    var value = bytes.toDouble();
    var index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return '${value.toStringAsFixed(index == 0 ? 0 : 1)} ${units[index]}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final overview = _overview;

    return Scaffold(
      backgroundColor:
          isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(
        titleSpacing: 4,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: isDark ? AppColors.surfaceDarkElevated : Colors.black,
                border: Border.all(color: AppColors.primary.withAlpha(60)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.asset(
                'assets/images/logo.png',
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const Icon(
                  Icons.groups_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          overview?.name ?? 'Geters Community',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      if (overview?.verified ?? true) ...[
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.verified_rounded,
                          size: 14,
                          color: AppColors.verified,
                        ),
                      ],
                    ],
                  ),
                  Text(
                    overview == null
                        ? 'Yuklanmoqda...'
                        : '${overview.memberCount} a\'zo · ${overview.onlineCount} onlayn',
                    style: TextStyle(
                      fontSize: 10.5,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Container(
            width: 7,
            height: 7,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _isConnected ? AppColors.success : AppColors.warning,
            ),
          ),
          IconButton(
            onPressed: _openCommunityInfo,
            icon: const Icon(Icons.info_outline_rounded, size: 20),
            tooltip: 'Guruh haqida',
          ),
          IconButton(
            onPressed: _loadInitial,
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Yangilash',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null && _messages.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 12.5),
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: _loadInitial,
                                child: const Text('Qayta urinish'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _messages.isEmpty
                        ? Center(
                            child: Text(
                              'Hozircha xabarlar yo\'q.\nBirinchi bo\'lib yozing!',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12.5,
                                color: isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight,
                              ),
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                            itemCount: _messages.length + (_hasMore ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (_hasMore && index == 0) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Center(
                                    child: _isLoadingMore
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : TextButton(
                                            onPressed: _loadMore,
                                            child: const Text(
                                              'Oldingi xabarlar',
                                              style: TextStyle(fontSize: 11.5),
                                            ),
                                          ),
                                  ),
                                );
                              }
                              final messageIndex = _hasMore ? index - 1 : index;
                              final message = _messages[messageIndex];
                              final previous = messageIndex > 0
                                  ? _messages[messageIndex - 1]
                                  : null;
                              final showDate = previous == null ||
                                  _dateLabel(previous.createdAt) !=
                                      _dateLabel(message.createdAt);

                              _messageKeys.putIfAbsent(
                                message.id,
                                () => GlobalKey(),
                              );

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  if (showDate)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 10,
                                      ),
                                      child: Center(
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 3,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isDark
                                                ? AppColors.surfaceDarkSubtle
                                                : AppColors.surfaceLightSubtle,
                                            borderRadius:
                                                BorderRadius.circular(999),
                                          ),
                                          child: Text(
                                            _dateLabel(message.createdAt),
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                              color: isDark
                                                  ? AppColors.textMutedDark
                                                  : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  _buildMessage(message, isDark),
                                ],
                              );
                            },
                          ),
          ),
          if (_typingLabel != null)
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 2),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  _typingLabel!,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                  ),
                ),
              ),
            ),
          _buildComposer(isDark),
        ],
      ),
    );
  }

  Widget _buildMessage(CommunityMessage message, bool isDark) {
    final isHighlighted = _highlightId == message.id;
    final bubbleColor = message.isMine
        ? AppColors.primary.withAlpha(isDark ? 26 : 22)
        : (isDark ? AppColors.surfaceDarkElevated : Colors.white);
    final borderColor = message.isMine
        ? AppColors.primary.withAlpha(70)
        : (isDark ? AppColors.borderDark : AppColors.borderLight);

    return Container(
      key: _messageKeys[message.id],
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: isHighlighted ? AppColors.primary.withAlpha(28) : null,
        border: isHighlighted
            ? Border.all(color: AppColors.primary.withAlpha(90))
            : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppAvatar(
            imageUrl: message.sender.avatarUrl,
            name: message.sender.name,
            size: 32,
            isVerified: message.sender.verified,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        message.sender.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (message.sender.handle.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      Text(
                        '@${message.sender.handle}',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                    const SizedBox(width: 6),
                    Text(
                      _formatTime(message.createdAt),
                      style: TextStyle(
                        fontSize: 9.5,
                        color: isDark
                            ? AppColors.textSubMutedDark
                            : AppColors.textMutedLight,
                      ),
                    ),
                    if (message.editedAt != null) ...[
                      const SizedBox(width: 4),
                      Text(
                        'tahrirlangan',
                        style: TextStyle(
                          fontSize: 9,
                          color: isDark
                              ? AppColors.textSubMutedDark
                              : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                    if (message.pending) ...[
                      const SizedBox(width: 6),
                      const SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(strokeWidth: 1.5),
                      ),
                    ],
                    if (message.failed) ...[
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.error_outline,
                        size: 12,
                        color: AppColors.danger,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                GestureDetector(
                  onLongPress: () => _showMessageActions(message),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: bubbleColor,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(4),
                        topRight: Radius.circular(14),
                        bottomLeft: Radius.circular(14),
                        bottomRight: Radius.circular(14),
                      ),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (message.replyTo != null)
                          InkWell(
                            onTap: () =>
                                _scrollToMessage(message.replyTo!.id),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                border: Border(
                                  left: BorderSide(
                                    color: AppColors.primary,
                                    width: 2,
                                  ),
                                ),
                                color: isDark
                                    ? Colors.black.withAlpha(60)
                                    : AppColors.surfaceLightSubtle,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${message.replyTo!.senderName ?? 'Foydalanuvchi'} ga javob',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  Text(
                                    message.replyTo!.isDeleted
                                        ? 'Xabar o\'chirilgan'
                                        : (message.replyTo!.content.isEmpty
                                            ? '📎 Ilova'
                                            : message.replyTo!.content),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: isDark
                                          ? AppColors.textMutedDark
                                          : AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (message.content.isNotEmpty)
                          Text(
                            message.content,
                            style: const TextStyle(
                              fontSize: 12.5,
                              height: 1.4,
                            ),
                          ),
                        if (message.attachments.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Column(
                              children: message.attachments
                                  .map((attachment) =>
                                      _buildAttachment(attachment, isDark))
                                  .toList(),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    ...message.reactions.map(
                      (reaction) => InkWell(
                        onTap: () => _toggleReaction(message, reaction.emoji),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            color: reaction.reacted
                                ? AppColors.primary.withAlpha(35)
                                : (isDark
                                    ? AppColors.surfaceDarkSubtle
                                    : AppColors.surfaceLightSubtle),
                            border: Border.all(
                              color: reaction.reacted
                                  ? AppColors.primary.withAlpha(90)
                                  : Colors.transparent,
                            ),
                          ),
                          child: Text(
                            '${reaction.emoji} ${reaction.count}',
                            style: const TextStyle(fontSize: 10.5),
                          ),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => _showMessageActions(message),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isDark
                                ? AppColors.borderDark
                                : AppColors.borderLight,
                          ),
                        ),
                        child: Icon(
                          Icons.add_reaction_outlined,
                          size: 12,
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                        ),
                      ),
                    ),
                    const SizedBox(width: 2),
                    InkWell(
                      onTap: () {
                        setState(() => _replyTo = message);
                        _focusNode.requestFocus();
                      },
                      child: Icon(
                        Icons.reply_rounded,
                        size: 14,
                        color: isDark
                            ? AppColors.textMutedDark
                            : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachment(CommunityAttachment attachment, bool isDark) {
    if (attachment.kind == 'image') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: InkWell(
          onTap: () => launchUrl(
            Uri.parse(attachment.url),
            mode: LaunchMode.externalApplication,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              attachment.url,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return const SizedBox(
                  height: 120,
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                );
              },
              errorBuilder: (_, _, _) => Container(
                padding: const EdgeInsets.all(10),
                color: isDark ? Colors.black : AppColors.surfaceLightSubtle,
                child: Text(
                  attachment.name,
                  style: const TextStyle(fontSize: 11),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final isVideo = attachment.kind == 'video';
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: InkWell(
        onTap: () => launchUrl(
          Uri.parse(attachment.url),
          mode: LaunchMode.externalApplication,
        ),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
            color: isDark
                ? Colors.black.withAlpha(80)
                : AppColors.surfaceLightSubtle,
          ),
          child: Row(
            children: [
              Icon(
                isVideo ? Icons.play_circle_outline_rounded : Icons.description_outlined,
                size: 22,
                color: AppColors.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      attachment.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${_formatBytes(attachment.sizeBytes)} · ${isVideo ? 'video' : 'fayl'}',
                      style: TextStyle(
                        fontSize: 9.5,
                        color: isDark
                            ? AppColors.textMutedDark
                            : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.open_in_new_rounded,
                size: 14,
                color: isDark
                    ? AppColors.textMutedDark
                    : AppColors.textMutedLight,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildComposer(bool isDark) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        10,
        8,
        10,
        8 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.sidebarDark : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_replyTo != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  color: AppColors.primary.withAlpha(20),
                  border: Border.all(color: AppColors.primary.withAlpha(70)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.reply_rounded,
                      size: 14,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_replyTo!.sender.name} ga javob',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          Text(
                            _replyTo!.content.isEmpty
                                ? '📎 Ilova'
                                : _replyTo!.content,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10.5,
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                    InkWell(
                      onTap: () => setState(() => _replyTo = null),
                      child: const Icon(Icons.close_rounded, size: 14),
                    ),
                  ],
                ),
              ),
            ),
          Row(
            children: [
              IconButton(
                onPressed: _isUploading
                    ? null
                    : () => _pickAttachment(video: false),
                icon: _isUploading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.image_outlined, size: 21),
                tooltip: 'Rasm yuklash',
              ),
              IconButton(
                onPressed: _isUploading
                    ? null
                    : () => _pickAttachment(video: true),
                icon: const Icon(Icons.videocam_outlined, size: 21),
                tooltip: 'Video yuklash',
              ),
              Expanded(
                child: TextField(
                  controller: _textController,
                  focusNode: _focusNode,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.newline,
                  onChanged: (_) => _notifyTyping(),
                  decoration: InputDecoration(
                    hintText: 'Guruhga xabar yozing...',
                    hintStyle: TextStyle(
                      fontSize: 12.5,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
                    filled: true,
                    fillColor:
                        isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightSubtle,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  style: const TextStyle(fontSize: 12.5),
                ),
              ),
              const SizedBox(width: 6),
              IconButton.filled(
                onPressed: _isSending ? null : _send,
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.onPrimary,
                  disabledBackgroundColor:
                      isDark ? AppColors.surfaceDarkSubtle : AppColors.borderLight,
                ),
                icon: _isSending
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.onPrimary,
                        ),
                      )
                    : const Icon(Icons.send_rounded, size: 18),
                tooltip: 'Yuborish',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
