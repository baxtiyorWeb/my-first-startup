import 'dart:async';

import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/verified_badge.dart';
import '../models/conversation.dart';
import '../data/messages_controller.dart';

class ChatDetailScreen extends StatefulWidget {
  final Conversation conversation;
  final MessagesController controller;

  const ChatDetailScreen({
    super.key,
    required this.conversation,
    required this.controller,
  });

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen>
    with WidgetsBindingObserver {
  static const Duration _pollInterval = Duration(seconds: 15);

  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _inputFocus = FocusNode();

  Timer? _pollTimer;
  bool _showJumpToLatest = false;
  bool _inputFocused = false;

  /// Message bookkeeping so a new message can pull the list down only when the
  /// reader is already looking at the newest one.
  int _knownCount = 0;
  String? _knownLastId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _inputFocus.addListener(_onFocusChanged);
    _scrollController.addListener(_onScroll);
    widget.controller.addListener(_onControllerChanged);

    widget.controller.setActiveConversation(widget.conversation.id);
    widget.controller.loadMessages(widget.conversation.id);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.controller.markConversationRead(widget.conversation.id);
      _knownCount =
          widget.controller.messagesFor(widget.conversation.id).length;
      _knownLastId = _lastMessageId();
      // Opening a cached chat should already be at the newest message.
      _queueScrollToLatest(animate: false);
    });

    // Safety net for environments where the realtime stream never delivers
    // (multi-instance deployments, proxies that buffer SSE).
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      widget.controller.loadMessages(
        widget.conversation.id,
        forceRefresh: true,
      );
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _inputFocus.removeListener(_onFocusChanged);
    _scrollController.removeListener(_onScroll);
    widget.controller.removeListener(_onControllerChanged);
    WidgetsBinding.instance.removeObserver(this);
    widget.controller.setActiveConversation(null);
    _inputFocus.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ------------------------------------------------------------- scrolling

  bool get _isNearBottom {
    if (!_scrollController.hasClients) return true;
    final position = _scrollController.position;
    return (position.maxScrollExtent - position.pixels) < 90;
  }

  String? _lastMessageId() {
    final messages = widget.controller.messagesFor(widget.conversation.id);
    return messages.isEmpty ? null : messages.last.id;
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final shouldShow = !_isNearBottom;
    if (shouldShow != _showJumpToLatest) {
      setState(() => _showJumpToLatest = shouldShow);
    }
  }

  void _queueScrollToLatest({bool animate = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;
      final target = _scrollController.position.maxScrollExtent;
      if (!animate) {
        _scrollController.jumpTo(target);
        return;
      }
      if ((target - _scrollController.position.pixels).abs() < 4) return;
      _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _onControllerChanged() {
    final messages = widget.controller.messagesFor(widget.conversation.id);
    final count = messages.length;
    final lastId = messages.isEmpty ? null : messages.last.id;
    if (count == _knownCount && lastId == _knownLastId) return;

    final grew = count > _knownCount;
    final firstBatch = _knownCount == 0;
    _knownCount = count;
    _knownLastId = lastId;

    if (!grew) return;

    final follow = _isNearBottom;
    if (follow) {
      _queueScrollToLatest(animate: !firstBatch);
    } else if (!_showJumpToLatest) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_showJumpToLatest) {
          setState(() => _showJumpToLatest = true);
        }
      });
    }
  }

  void _onFocusChanged() {
    if (_inputFocused == _inputFocus.hasFocus) return;
    setState(() => _inputFocused = _inputFocus.hasFocus);
  }

  void _jumpToLatest() {
    setState(() => _showJumpToLatest = false);
    _queueScrollToLatest();
  }

  @override
  void didChangeMetrics() {
    // Keyboard opened or closed: keep the newest message above the composer.
    if (_isNearBottom) _queueScrollToLatest(animate: false);
  }

  // --------------------------------------------------------------- sending

  Future<void> _send() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    _textController.clear();
    _inputFocus.requestFocus();

    final sent = await widget.controller.sendMessage(
      widget.conversation.id,
      text,
    );
    if (sent || !mounted) return;

    // The bubble stays on screen as retryable; tell the user why it stalled.
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(widget.controller.lastSendError ?? 'Xabar yuborilmadi'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // ----------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final maxBubbleWidth = MediaQuery.sizeOf(context).width * 0.76;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: ListenableBuilder(
          listenable: widget.controller,
          builder: (context, _) {
            final conversation = widget.controller
                    .conversationById(widget.conversation.id) ??
                widget.conversation;
            return _buildHeader(conversation, isDark);
          },
        ),
      ),
      body: Column(
        children: [
          Divider(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            height: 1,
          ),
          Expanded(
            child: ListenableBuilder(
              listenable: widget.controller,
              builder: (context, _) {
                final messages =
                    widget.controller.messagesFor(widget.conversation.id);
                if (messages.isEmpty) {
                  return _EmptyChat(
                    peerName: widget.conversation.peer.name,
                    isDark: isDark,
                  );
                }

                final items = _itemsFor(messages);
                return Stack(
                  children: [
                    ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 16),
                      keyboardDismissBehavior:
                          ScrollViewKeyboardDismissBehavior.onDrag,
                      physics: const BouncingScrollPhysics(
                        parent: AlwaysScrollableScrollPhysics(),
                      ),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final item = items[index];
                        return switch (item) {
                          _DayItem(:final day) =>
                            _DaySeparator(day: day, isDark: isDark),
                          _MessageItem() => RepaintBoundary(
                              child: _buildBubble(
                                item,
                                widget.controller.isMine(item.message),
                                isDark,
                                maxWidth: maxBubbleWidth,
                              ),
                            ),
                        };
                      },
                    ),
                    Positioned(
                      right: 12,
                      bottom: 14,
                      child: _buildJumpToLatest(isDark),
                    ),
                  ],
                );
              },
            ),
          ),
          _buildComposer(isDark),
        ],
      ),
    );
  }

  Widget _buildHeader(Conversation conversation, bool isDark) {
    final typing = widget.controller.isPeerTyping(conversation.id);
    final subtitleColor = typing
        ? AppColors.primary
        : (conversation.isOnline
            ? AppColors.success
            : (isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight));

    return Row(
      children: [
        AppAvatar(
          name: conversation.peer.name,
          imageUrl: conversation.peer.avatarUrl,
          size: 38,
          isOnline: conversation.isOnline,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      conversation.peer.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimaryLight,
                      ),
                    ),
                  ),
                  if (conversation.peer.verified) ...[
                    const SizedBox(width: 4),
                    const VerifiedBadge(size: 14),
                  ],
                ],
              ),
              const SizedBox(height: 1),
              if (typing)
                const _TypingLabel(color: AppColors.primary)
              else
                Text(
                  conversation.isOnline
                      ? 'Onlayn'
                      : conversation.peer.formattedHandle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: subtitleColor),
                ),
            ],
          ),
        ),
        const SizedBox(width: 12),
      ],
    );
  }

  Widget _buildJumpToLatest(bool isDark) {
    return IgnorePointer(
      ignoring: !_showJumpToLatest,
      child: AnimatedOpacity(
        opacity: _showJumpToLatest ? 1 : 0,
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        child: AnimatedScale(
          scale: _showJumpToLatest ? 1 : 0.85,
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          child: Material(
            color: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLight,
            shape: CircleBorder(
              side: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: _jumpToLatest,
              child: const SizedBox(
                width: 40,
                height: 40,
                child: Icon(
                  Icons.arrow_downward_rounded,
                  size: 19,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildComposer(bool isDark) {
    final fieldFill =
        isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: fieldFill,
                  borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                  border: Border.all(
                    color: _inputFocused
                        ? AppColors.primary
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    width: _inputFocused ? 1.4 : 1,
                  ),
                ),
                child: TextField(
                  controller: _textController,
                  focusNode: _inputFocus,
                  maxLines: 4,
                  minLines: 1,
                  style: TextStyle(
                    fontSize: 13.5,
                    color: isDark
                        ? AppColors.textPrimaryDark
                        : AppColors.textPrimaryLight,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Xabar yozing...',
                    filled: false,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 10),
                  ),
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _send(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _textController,
              builder: (context, value, _) {
                final hasText = value.text.trim().isNotEmpty;
                return AnimatedScale(
                  scale: hasText ? 1 : 0.9,
                  duration: const Duration(milliseconds: 160),
                  curve: Curves.easeOut,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    decoration: BoxDecoration(
                      color: hasText
                          ? AppColors.primary
                          : (isDark
                              ? AppColors.surfaceDarkElevated
                              : AppColors.surfaceLightSubtle),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: hasText ? _send : null,
                      padding: const EdgeInsets.all(10),
                      constraints: const BoxConstraints(
                        minWidth: 40,
                        minHeight: 40,
                      ),
                      icon: Icon(
                        Icons.send_rounded,
                        size: 18,
                        color: hasText
                            ? Colors.white
                            : (isDark
                                ? AppColors.textMutedDark
                                : AppColors.textMutedLight),
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- bubbles

  List<_ChatItem> _itemsFor(List<DirectMessage> messages) {
    final items = <_ChatItem>[];
    DateTime? previousDay;

    for (var i = 0; i < messages.length; i++) {
      final message = messages[i];
      final day = DateTime(
        message.createdAt.year,
        message.createdAt.month,
        message.createdAt.day,
      );
      if (previousDay == null || day != previousDay) {
        items.add(_DayItem(day));
        previousDay = day;
      }
      items.add(_MessageItem(
        message,
        isFirstInRun: !_sameRun(messages, i - 1, i),
        isLastInRun: !_sameRun(messages, i, i + 1),
      ));
    }
    return items;
  }

  /// Two messages belong to the same visual run when the same author sent them
  /// within a few minutes on the same day.
  bool _sameRun(List<DirectMessage> messages, int a, int b) {
    if (a < 0 || b >= messages.length) return false;
    final first = messages[a];
    final second = messages[b];
    if (first.senderId != second.senderId) return false;
    if (!_sameDay(first.createdAt, second.createdAt)) return false;
    return second.createdAt.difference(first.createdAt).inMinutes < 5;
  }

  Widget _buildBubble(
    _MessageItem item,
    bool isMe,
    bool isDark, {
    required double maxWidth,
  }) {
    final msg = item.message;
    final bg = isMe
        ? AppColors.primary
        : (isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLight);
    final borderColor = isMe
        ? Colors.transparent
        : (isDark ? AppColors.borderDark : AppColors.borderLight);
    final textColor = isMe
        ? Colors.white
        : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight);
    final metaColor = isMe
        ? Colors.white70
        : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight);

    final showMeta = item.isLastInRun || msg.isFailed;
    final radius = Radius.circular(item.isLastInRun ? 6 : 18);

    return Padding(
      padding: EdgeInsets.only(top: item.isFirstInRun ? 10 : 3),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: GestureDetector(
          onTap: msg.isFailed
              ? () => widget.controller.retryMessage(
                    widget.conversation.id,
                    msg.id,
                  )
              : null,
          child: Container(
            constraints: BoxConstraints(maxWidth: maxWidth),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(18),
                topRight: const Radius.circular(18),
                bottomLeft: isMe ? const Radius.circular(18) : radius,
                bottomRight: isMe ? radius : const Radius.circular(18),
              ),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  msg.text,
                  style: TextStyle(
                    fontSize: 13.5,
                    height: 1.4,
                    color: textColor,
                  ),
                ),
                if (showMeta) ...[
                  const SizedBox(height: 3),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isMe && msg.isFailed) ...[
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 12,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 3),
                        const Text(
                          'Qayta yuborish',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Text(
                        DateFormatter.formatRelative(msg.createdAt),
                        style: TextStyle(fontSize: 10, color: metaColor),
                      ),
                      if (isMe && !msg.isFailed) ...[
                        const SizedBox(width: 4),
                        Icon(
                          msg.isPending
                              ? Icons.schedule_rounded
                              : (msg.isRead
                                  ? Icons.done_all_rounded
                                  : Icons.check_rounded),
                          size: 13,
                          color: metaColor,
                        ),
                      ],
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------------- items

sealed class _ChatItem {
  const _ChatItem();
}

class _DayItem extends _ChatItem {
  final DateTime day;
  const _DayItem(this.day);
}

class _MessageItem extends _ChatItem {
  final DirectMessage message;
  final bool isFirstInRun;
  final bool isLastInRun;

  const _MessageItem(
    this.message, {
    required this.isFirstInRun,
    required this.isLastInRun,
  });
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

String _formatDayLabel(DateTime day) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final difference = today.difference(day).inDays;
  if (difference == 0) return 'Bugun';
  if (difference == 1) return 'Kecha';

  const months = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  final base = '${day.day}-${months[day.month - 1]}';
  return day.year == now.year ? base : '$base, ${day.year}';
}

// ------------------------------------------------------------------ widgets

class _DaySeparator extends StatelessWidget {
  final DateTime day;
  final bool isDark;

  const _DaySeparator({required this.day, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.surfaceDarkElevated
                : AppColors.surfaceLightElevated,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ),
          child: Text(
            _formatDayLabel(day),
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
        ),
      ),
    );
  }
}

class _TypingLabel extends StatefulWidget {
  final Color color;

  const _TypingLabel({required this.color});

  @override
  State<_TypingLabel> createState() => _TypingLabelState();
}

class _TypingLabelState extends State<_TypingLabel>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1000),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 14,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'yozmoqda',
            style: TextStyle(fontSize: 11, color: widget.color),
          ),
          const SizedBox(width: 3),
          AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(3, (index) {
                  final t = (_controller.value + index * 0.18) % 1.0;
                  final alpha = (0.35 + 0.65 * (1 - (2 * t - 1).abs())) * 255;
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 1),
                    width: 3.2,
                    height: 3.2,
                    decoration: BoxDecoration(
                      color: widget.color.withAlpha(alpha.round()),
                      shape: BoxShape.circle,
                    ),
                  );
                }),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _EmptyChat extends StatelessWidget {
  final String peerName;
  final bool isDark;

  const _EmptyChat({required this.peerName, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.surfaceDarkElevated
                    : AppColors.surfaceLightElevated,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark
                      ? AppColors.borderDarkElevated
                      : AppColors.borderLight,
                ),
              ),
              child: Icon(
                Icons.waving_hand_rounded,
                size: 26,
                color: isDark
                    ? AppColors.textMutedDark
                    : AppColors.textMutedLight,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              '$peerName bilan suhbatni boshlang',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Birinchi xabaringizni yozing — u darhol yetib boradi.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                height: 1.4,
                color: isDark
                    ? AppColors.textMutedDark
                    : AppColors.textMutedLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
