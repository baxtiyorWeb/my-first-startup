import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/badge_chip.dart';
import '../../../core/widgets/empty_state.dart';
import '../data/notifications_controller.dart';

class NotificationsScreen extends StatefulWidget {
  final NotificationsController controller;

  const NotificationsScreen({super.key, required this.controller});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _activeFilter = 'all';

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'like':
        return Icons.favorite_rounded;
      case 'comment':
        return Icons.chat_bubble_rounded;
      case 'follow':
        return Icons.person_add_alt_1_rounded;
      case 'project':
        return Icons.rocket_launch_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'like':
        return AppColors.danger;
      case 'comment':
        return AppColors.primary;
      case 'follow':
        return AppColors.success;
      case 'project':
        return AppColors.purple;
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Bildirishnomalar',
          style: AppTypography.heading3.copyWith(
            fontWeight: FontWeight.w800,
            color:
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
        actions: [
          ListenableBuilder(
            listenable: widget.controller,
            builder: (context, _) {
              final hasUnread = widget.controller.unreadCount > 0;
              return TextButton.icon(
                onPressed: hasUnread
                    ? () {
                        widget.controller.markAllAsRead();
                        ScaffoldMessenger.of(context)
                          ..hideCurrentSnackBar()
                          ..showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Barcha bildirishnomalar o\'qildi deb belgilandi',
                              ),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                      }
                    : null,
                icon: const Icon(Icons.done_all, size: 16),
                label: const Text('O\'qildi'),
              );
            },
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: widget.controller,
        builder: (context, _) {
          final allItems = widget.controller.items;
          final displayedItems = _activeFilter == 'unread'
              ? allItems.where((i) => !i.isRead).toList()
              : allItems;

          return Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                child: Row(
                  children: [
                    BadgeChip(
                      label: 'Barchasi (${allItems.length})',
                      isSelected: _activeFilter == 'all',
                      onTap: () => setState(() => _activeFilter = 'all'),
                    ),
                    const SizedBox(width: 8),
                    BadgeChip(
                      label:
                          'O\'qilmaganlar (${widget.controller.unreadCount})',
                      isSelected: _activeFilter == 'unread',
                      onTap: () => setState(() => _activeFilter = 'unread'),
                    ),
                  ],
                ),
              ),
              Divider(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                height: 1,
              ),
              Expanded(
                child: widget.controller.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : displayedItems.isEmpty
                        ? const EmptyStateWidget(
                            icon: Icons.notifications_none_rounded,
                            title: 'Yangi bildirishnomalar yo\'q',
                            description:
                                'Sizga yangi izoh, like yoki obunachilar kelganda shu yerda ko\'rinadi.',
                          )
                        : RefreshIndicator(
                            onRefresh: widget.controller.load,
                            child: ListView.separated(
                              padding: const EdgeInsets.fromLTRB(0, 8, 0, 96),
                              physics: const AlwaysScrollableScrollPhysics(
                                parent: BouncingScrollPhysics(),
                              ),
                              itemCount: displayedItems.length,
                              separatorBuilder: (_, _) => Divider(
                                color: isDark
                                    ? AppColors.borderDark
                                    : AppColors.borderLight,
                                height: 1,
                              ),
                              itemBuilder: (context, index) {
                                final item = displayedItems[index];
                                final icon = _getTypeIcon(item.type);
                                final iconColor = _getTypeColor(item.type);

                                return InkWell(
                                  onTap: () =>
                                      widget.controller.markAsRead(item.id),
                                  child: Container(
                                    color: !item.isRead
                                        ? (isDark
                                            ? AppColors.primarySurfaceDark
                                                .withAlpha(110)
                                            : AppColors.primarySurface
                                                .withAlpha(120))
                                        : Colors.transparent,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 12,
                                    ),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Stack(
                                          children: [
                                            AppAvatar(
                                              name: item.actor?.name ?? 'Geters',
                                              imageUrl: item.actor?.avatarUrl,
                                              size: 40,
                                            ),
                                            Positioned(
                                              right: -2,
                                              bottom: -2,
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.all(2),
                                                decoration: BoxDecoration(
                                                  color: isDark
                                                      ? AppColors.surfaceDark
                                                      : AppColors.surfaceLight,
                                                  shape: BoxShape.circle,
                                                ),
                                                child: Container(
                                                  width: 16,
                                                  height: 16,
                                                  decoration: BoxDecoration(
                                                    color: iconColor,
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: Icon(
                                                    icon,
                                                    size: 10,
                                                    color: AppColors.onPrimary,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      item.title,
                                                      style: AppTypography
                                                          .subtitle
                                                          .copyWith(
                                                        fontSize: 14,
                                                        fontWeight: !item.isRead
                                                            ? FontWeight.w700
                                                            : FontWeight.w500,
                                                        color: isDark
                                                            ? AppColors
                                                                .textPrimaryDark
                                                            : AppColors
                                                                .textPrimaryLight,
                                                      ),
                                                    ),
                                                  ),
                                                  Text(
                                                    DateFormatter.formatRelative(
                                                      item.createdAt,
                                                    ),
                                                    style: AppTypography.caption
                                                        .copyWith(
                                                      fontSize: 11,
                                                      color: isDark
                                                          ? AppColors
                                                              .textMutedDark
                                                          : AppColors
                                                              .textMutedLight,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 3),
                                              Text(
                                                item.message,
                                                style: AppTypography.body
                                                    .copyWith(
                                                  fontSize: 13,
                                                  color: isDark
                                                      ? AppColors
                                                          .textSecondaryDark
                                                      : AppColors
                                                          .textSecondaryLight,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (!item.isRead) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            margin: const EdgeInsets.only(top: 6),
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: AppColors.primary,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}
