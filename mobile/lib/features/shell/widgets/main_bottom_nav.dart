import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_avatar.dart';
import '../../auth/data/auth_controller.dart';

class MainBottomNav extends StatelessWidget {
  final int currentIndex;
  final bool isDark;
  final double bottomPadding;
  final AuthController authController;
  final ValueChanged<int> onSelectTab;
  final VoidCallback onCreateTap;

  const MainBottomNav({
    super.key,
    required this.currentIndex,
    required this.isDark,
    required this.bottomPadding,
    required this.authController,
    required this.onSelectTab,
    required this.onCreateTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = isDark ? AppColors.primary : AppColors.primaryActive;
    final inactiveColor = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return Container(
      height: 62 + bottomPadding,
      padding: EdgeInsets.fromLTRB(8, 0, 8, bottomPadding),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          _NavItem(
            icon: Icons.home_outlined,
            activeIcon: Icons.home_rounded,
            label: 'Asosiy',
            isActive: currentIndex == 0,
            activeColor: activeColor,
            inactiveColor: inactiveColor,
            onTap: () => onSelectTab(0),
          ),
          _NavItem(
            icon: Icons.search_rounded,
            activeIcon: Icons.search_rounded,
            label: 'Kashf et',
            isActive: currentIndex == 1,
            activeColor: activeColor,
            inactiveColor: inactiveColor,
            onTap: () => onSelectTab(1),
          ),
          Expanded(
            child: Center(
              child: Material(
                color: isDark ? AppColors.primary : AppColors.primaryActive,
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: onCreateTap,
                  customBorder: const CircleBorder(),
                  splashColor: AppColors.primaryLight.withAlpha(72),
                  child: SizedBox(
                    width: 44,
                    height: 44,
                    child: Icon(
                      Icons.add_rounded,
                      size: 26,
                      color: isDark ? AppColors.onPrimary : Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ),
          _NavItem(
            icon: Icons.smart_display_outlined,
            activeIcon: Icons.smart_display_rounded,
            label: 'Shorts',
            isActive: currentIndex == 2,
            activeColor: activeColor,
            inactiveColor: inactiveColor,
            onTap: () => onSelectTab(2),
          ),
          ListenableBuilder(
            listenable: authController,
            builder: (context, _) {
              final user = authController.currentUser;
              final isActive = currentIndex == 3;

              return Expanded(
                child: InkWell(
                  onTap: () => onSelectTab(3),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedScale(
                        scale: isActive ? 1.06 : 1.0,
                        duration: const Duration(milliseconds: 160),
                        child: AppAvatar(
                          imageUrl: user.avatarUrl,
                          name: user.name,
                          size: 22,
                          ringColor: isActive ? activeColor : null,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Profil',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                          color: isActive ? activeColor : inactiveColor,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final Color activeColor;
  final Color inactiveColor;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.activeColor,
    required this.inactiveColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedScale(
              scale: isActive ? 1.08 : 1.0,
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOutCubic,
              child: Icon(
                isActive ? activeIcon : icon,
                size: 21,
                color: isActive ? activeColor : inactiveColor,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive ? activeColor : inactiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
