import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../../core/widgets/brand_logo.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../auth/data/auth_controller.dart';
import '../../bookmarks/presentation/bookmarks_screen.dart';
import '../../cheatsheets/presentation/cheatsheets_screen.dart';
import '../../feed/data/feed_controller.dart';
import '../../feed/models/author.dart';
import '../../messages/data/messages_controller.dart';
import '../../settings/presentation/settings_screen.dart';

class MainShellDrawer extends StatelessWidget {
  final int currentIndex;
  final bool isDark;
  final AuthController authController;
  final FeedController feedController;
  final ThemeController themeController;
  final MessagesController messagesController;
  final ValueChanged<int> onSelectTab;
  final VoidCallback onOpenMessages;
  final VoidCallback onOpenPricing;
  final ValueChanged<String> onOpenPostDetail;
  final ValueChanged<Author> onOpenAuthorProfile;

  const MainShellDrawer({
    super.key,
    required this.currentIndex,
    required this.isDark,
    required this.authController,
    required this.feedController,
    required this.themeController,
    required this.messagesController,
    required this.onSelectTab,
    required this.onOpenMessages,
    required this.onOpenPricing,
    required this.onOpenPostDetail,
    required this.onOpenAuthorProfile,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(left: Radius.circular(24)),
      ),
      child: SafeArea(
        child: ListenableBuilder(
          listenable: Listenable.merge([authController, messagesController]),
          builder: (context, _) {
            final user = authController.currentUser;
            final unreadMsg = messagesController.totalUnreadCount;

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                  child: Row(
                    children: [
                      const BrandLogo(size: 36, showText: true, showTagline: true),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close_rounded, size: 20),
                      ),
                    ],
                  ),
                ),
                Divider(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  height: 1,
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 12,
                    ),
                    children: [
                      _DrawerTile(
                        icon: Icons.home_outlined,
                        label: 'Asosiy lenta',
                        isActive: currentIndex == 0,
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          onSelectTab(0);
                        },
                      ),
                      _DrawerTile(
                        icon: Icons.explore_outlined,
                        label: 'Kashf et',
                        isActive: currentIndex == 1,
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          onSelectTab(1);
                        },
                      ),
                      _DrawerTile(
                        icon: Icons.chat_bubble_outline_rounded,
                        label: 'Xabarlar',
                        badgeCount: unreadMsg,
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          onOpenMessages();
                        },
                      ),
                      _DrawerTile(
                        icon: Icons.workspace_premium_outlined,
                        label: 'Tariflar (Pro)',
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          onOpenPricing();
                        },
                      ),
                      _DrawerTile(
                        icon: Icons.bookmark_border_rounded,
                        label: 'Saqlanganlar',
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => BookmarksScreen(
                                feedController: feedController,
                                authController: authController,
                                onPostTap: onOpenPostDetail,
                                onAuthorTap: onOpenAuthorProfile,
                              ),
                            ),
                          );
                        },
                      ),
                      _DrawerTile(
                        icon: Icons.code_rounded,
                        label: 'Qo\'llanmalar (Cheat Sheets)',
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const CheatSheetsScreen(),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      Divider(
                        color:
                            isDark ? AppColors.borderDark : AppColors.borderLight,
                        height: 1,
                      ),
                      const SizedBox(height: 8),
                      _DrawerTile(
                        icon: Icons.settings_outlined,
                        label: 'Sozlamalar',
                        isDark: isDark,
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => SettingsScreen(
                                themeController: themeController,
                                authController: authController,
                              ),
                            ),
                          );
                        },
                      ),
                      _DrawerTile(
                        icon: isDark
                            ? Icons.light_mode_outlined
                            : Icons.dark_mode_outlined,
                        label: isDark
                            ? 'Yorug\' rejimga o\'tish'
                            : 'Qorong\'i rejimga o\'tish',
                        isDark: isDark,
                        onTap: () => themeController.toggleLightDark(context),
                      ),
                    ],
                  ),
                ),
                Divider(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  height: 1,
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      InkWell(
                        onTap: () {
                          Navigator.of(context).pop();
                          onSelectTab(3);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: Row(
                            children: [
                              AppAvatar(
                                imageUrl: user.avatarUrl,
                                name: user.name,
                                size: 38,
                                isOnline: true,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      user.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: isDark
                                            ? AppColors.textPrimaryDark
                                            : AppColors.textPrimaryLight,
                                      ),
                                    ),
                                    Text(
                                      user.formattedHandle,
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: isDark
                                            ? AppColors.textMutedDark
                                            : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () async {
                          final ok = await AppConfirmDialog.show(
                            context,
                            title: 'Hisobdan chiqish',
                            message: 'Haqiqatan ham tizimdan chiqmoqchimisiz?',
                            confirmLabel: 'Chiqish',
                            isDanger: true,
                          );
                          if (ok && context.mounted) {
                            Navigator.of(context).pop();
                            authController.logout();
                          }
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 9,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.logout_rounded,
                                size: 18,
                                color: AppColors.danger,
                              ),
                              SizedBox(width: 10),
                              Text(
                                'Tizimdan chiqish',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.danger,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isDark;
  final int badgeCount;
  final VoidCallback onTap;

  const _DrawerTile({
    required this.icon,
    required this.label,
    this.isActive = false,
    required this.isDark,
    this.badgeCount = 0,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeBg =
        isDark ? AppColors.primarySurfaceDark : AppColors.surfaceLightElevated;
    final activeColor = isDark ? AppColors.primaryLight : AppColors.slateAccent;
    final defaultColor =
        isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight;

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isActive ? activeBg : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: onTap,
        leading:
            Icon(icon, size: 20, color: isActive ? activeColor : defaultColor),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
            color: isActive ? activeColor : defaultColor,
          ),
        ),
        trailing: badgeCount > 0
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$badgeCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              )
            : null,
      ),
    );
  }
}
