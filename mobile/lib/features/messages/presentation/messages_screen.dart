import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/verified_badge.dart';
import '../data/messages_controller.dart';
import '../models/conversation.dart';
import 'chat_detail_screen.dart';

class MessagesScreen extends StatefulWidget {
  final MessagesController controller;

  const MessagesScreen({super.key, required this.controller});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openChat(Conversation conversation) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatDetailScreen(
          conversation: conversation,
          controller: widget.controller,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Xabarlar')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: ValueListenableBuilder<TextEditingValue>(
              valueListenable: _searchController,
              builder: (context, value, _) {
                return TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Suhbat yoki foydalanuvchi qidirish...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    suffixIcon: value.text.isNotEmpty
                        ? IconButton(
                            onPressed: () => _searchController.clear(),
                            icon: const Icon(Icons.close_rounded, size: 18),
                            visualDensity: VisualDensity.compact,
                          )
                        : null,
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                  ),
                );
              },
            ),
          ),
          Divider(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            height: 1,
          ),
          Expanded(
            child: ListenableBuilder(
              listenable:
                  Listenable.merge([widget.controller, _searchController]),
              builder: (context, _) {
                final query = _searchController.text.trim().toLowerCase();
                final convs = widget.controller.conversations.where((c) {
                  if (query.isEmpty) return true;
                  return c.peer.name.toLowerCase().contains(query) ||
                      c.peer.handle.toLowerCase().contains(query) ||
                      c.lastMessageText.toLowerCase().contains(query);
                }).toList();

                if (convs.isEmpty) {
                  final failed = widget.controller.errorMessage != null &&
                      widget.controller.conversations.isEmpty;
                  if (query.isNotEmpty && !failed) {
                    return const EmptyStateWidget(
                      icon: Icons.search_off_rounded,
                      title: 'Hech narsa topilmadi',
                      description:
                          'Boshqa nom yoki username bilan qidirib ko\'ring.',
                    );
                  }
                  if (failed) {
                    return EmptyStateWidget(
                      icon: Icons.wifi_off_rounded,
                      title: 'Suhbatlar yuklanmadi',
                      description:
                          'Internet aloqasini tekshirib, qayta urinib ko\'ring.',
                      actionText: 'Qayta urinish',
                      onAction: widget.controller.loadConversations,
                    );
                  }
                  return const EmptyStateWidget(
                    icon: Icons.chat_bubble_outline_rounded,
                    title: 'Suhbatlar topilmadi',
                    description:
                        'Boshqa mualliflar profilidan "Xabar" tugmasini bosib suhbat boshlashingiz mumkin.',
                  );
                }

                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: widget.controller.loadConversations,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    physics: const BouncingScrollPhysics(
                      parent: AlwaysScrollableScrollPhysics(),
                    ),
                    itemCount: convs.length,
                    separatorBuilder: (_, _) => Divider(
                      color:
                          isDark ? AppColors.borderDark : AppColors.borderLight,
                      height: 1,
                      indent: 72,
                    ),
                    itemBuilder: (context, index) {
                      final conv = convs[index];
                      return _ConversationTile(
                        conversation: conv,
                        isDark: isDark,
                        onTap: () => _openChat(conv),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final bool isDark;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final conv = conversation;
    final hasUnread = conv.unreadCount > 0;
    final timeColor = hasUnread
        ? AppColors.primary
        : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight);
    final previewColor = hasUnread
        ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
        : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight);

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 14, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            AppAvatar(
              name: conv.peer.name,
              imageUrl: conv.peer.avatarUrl,
              size: 46,
              isOnline: conv.isOnline,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          conv.peer.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight:
                                hasUnread ? FontWeight.w700 : FontWeight.w600,
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      if (conv.peer.verified) ...[
                        const SizedBox(width: 4),
                        const VerifiedBadge(size: 14),
                      ],
                      const SizedBox(width: 8),
                      Text(
                        DateFormatter.formatRelative(conv.lastMessageAt),
                        style: TextStyle(
                          fontSize: 11,
                          color: timeColor,
                          fontWeight:
                              hasUnread ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conv.lastMessageText.isEmpty
                              ? 'Suhbat boshlandi'
                              : conv.lastMessageText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight:
                                hasUnread ? FontWeight.w600 : FontWeight.w400,
                            color: previewColor,
                          ),
                        ),
                      ),
                      AnimatedSize(
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOut,
                        child: hasUnread
                            ? Container(
                                margin: const EdgeInsets.only(left: 8),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 7,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  conv.unreadCount > 99
                                      ? '99+'
                                      : '${conv.unreadCount}',
                                  style: const TextStyle(
                                    color: AppColors.onPrimary,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
