import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/theme/theme_controller.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../../auth/data/auth_controller.dart';
import '../../../settings/presentation/settings_screen.dart';
import 'profile_cover_banner.dart';

class ProfileSliverHeader extends StatelessWidget {
  final bool innerBoxIsScrolled;
  final bool isSelf;
  final bool isDark;
  final bool isVerified;
  final bool isFollowingPeer;
  final String displayName;
  final String cleanHandle;
  final String? displayAvatar;
  final String? coverPhotoUrl;
  final Color activeAccent;
  final Color surfaceBg;
  final AuthController authController;
  final ThemeController themeController;
  final VoidCallback onCopyLink;
  final VoidCallback onEditProfile;
  final VoidCallback onShowQr;
  final VoidCallback onToggleFollow;
  final VoidCallback onMessage;

  const ProfileSliverHeader({
    super.key,
    required this.innerBoxIsScrolled,
    required this.isSelf,
    required this.isDark,
    required this.isVerified,
    required this.isFollowingPeer,
    required this.displayName,
    required this.cleanHandle,
    required this.displayAvatar,
    required this.coverPhotoUrl,
    required this.activeAccent,
    required this.surfaceBg,
    required this.authController,
    required this.themeController,
    required this.onCopyLink,
    required this.onEditProfile,
    required this.onShowQr,
    required this.onToggleFollow,
    required this.onMessage,
  });

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 214,
      pinned: true,
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.surfaceDark,
      foregroundColor: Colors.white,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      leading: Navigator.of(context).canPop()
          ? IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
            )
          : null,
      title: innerBoxIsScrolled
          ? Row(
              children: [
                AppAvatar(imageUrl: displayAvatar, name: displayName, size: 28),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.subtitle.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            )
          : null,
      actions: [
        IconButton(
          onPressed: onCopyLink,
          icon: const Icon(Icons.share_outlined, size: 20),
          tooltip: 'Ulashish',
        ),
        if (isSelf)
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => SettingsScreen(
                    themeController: themeController,
                    authController: authController,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.settings_outlined, size: 21),
            tooltip: 'Sozlamalar',
          ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        background: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: surfaceBg),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              bottom: 46,
              child: ProfileCoverBanner(
                displayName: isSelf ? cleanHandle : displayName,
                coverPhotoUrl: isSelf ? coverPhotoUrl : null,
              ),
            ),
            Positioned(
              left: 16,
              bottom: 0,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    padding: const EdgeInsets.all(2.5),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          activeAccent,
                          isDark
                              ? AppColors.info
                              : AppColors.slateAccent.withAlpha(180),
                        ],
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: surfaceBg,
                      ),
                      child: AppAvatar(
                        imageUrl: displayAvatar,
                        name: displayName,
                        size: 80,
                      ),
                    ),
                  ),
                  if (isVerified)
                    Positioned(
                      right: 2,
                      bottom: 2,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: surfaceBg,
                          shape: BoxShape.circle,
                        ),
                        child: const VerifiedBadge(size: 20),
                      ),
                    ),
                ],
              ),
            ),
            Positioned(
              right: 16,
              bottom: 4,
              child: isSelf
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        LiquidGlassContainer(
                          borderRadius: AppTheme.radiusFull,
                          blurSigma: 16,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          onTap: onEditProfile,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.edit_outlined,
                                size: 15,
                                color: isDark
                                    ? AppColors.textPrimaryDark
                                    : AppColors.textPrimaryLight,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Profilni tahrirlash',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: isDark
                                      ? AppColors.textPrimaryDark
                                      : AppColors.textPrimaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        LiquidGlassContainer(
                          borderRadius: 12,
                          blurSigma: 16,
                          padding: const EdgeInsets.all(8),
                          onTap: onShowQr,
                          child: Icon(
                            Icons.qr_code_2_rounded,
                            size: 18,
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        AppButton(
                          text: isFollowingPeer ? 'Kuzatilmoqda' : 'Kuzatish',
                          variant: isFollowingPeer
                              ? ButtonVariant.outline
                              : ButtonVariant.primary,
                          size: ButtonSize.sm,
                          onPressed: onToggleFollow,
                        ),
                        const SizedBox(width: 8),
                        AppButton(
                          text: 'Xabar',
                          icon: Icons.chat_bubble_outline_rounded,
                          variant: ButtonVariant.outline,
                          size: ButtonSize.sm,
                          onPressed: onMessage,
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

class ProfileTabBarDelegate extends SliverPersistentHeaderDelegate {
  static const double _tabHeight = 48.0;
  final TabBar tabBar;
  final Color backgroundColor;

  ProfileTabBarDelegate(this.tabBar, {required this.backgroundColor});

  @override
  double get minExtent => _tabHeight;
  @override
  double get maxExtent => _tabHeight;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return SizedBox(
      height: _tabHeight,
      child: ColoredBox(color: backgroundColor, child: tabBar),
    );
  }

  @override
  bool shouldRebuild(ProfileTabBarDelegate oldDelegate) =>
      backgroundColor != oldDelegate.backgroundColor;
}
