import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/liquid_glass.dart';

class CreatePostComposerBar extends StatelessWidget {
  final String userName;
  final String? userAvatarUrl;
  final VoidCallback onTap;
  final VoidCallback onMediaTap;
  final VoidCallback? onVideoTap;

  const CreatePostComposerBar({
    super.key,
    required this.userName,
    this.userAvatarUrl,
    required this.onTap,
    required this.onMediaTap,
    this.onVideoTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sendBtnColor = isDark ? AppColors.primary : AppColors.slateAccent;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 10),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              AppAvatar(
                name: userName,
                imageUrl: userAvatarUrl,
                size: 38,
                isOnline: true,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Material(
                  color: isDark
                      ? AppColors.surfaceDarkElevated
                      : AppColors.surfaceLightElevated,
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: onTap,
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    child: Container(
                      height: 40,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Nima haqida ulashmoqchisiz?',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13.5,
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              LiquidGlassContainer(
                width: 38,
                height: 38,
                borderRadius: 999,
                tintColor: sendBtnColor,
                onTap: onTap,
                child: const Center(
                  child: Icon(
                    Icons.send_rounded,
                    color: Colors.white,
                    size: 17,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Divider(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            height: 1,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              _ComposerAction(
                icon: Icons.image_outlined,
                label: 'Rasm',
                onTap: onMediaTap,
                isDark: isDark,
              ),
              _VerticalSep(isDark: isDark),
              _ComposerAction(
                icon: Icons.play_circle_outline_rounded,
                label: 'Video',
                onTap: onVideoTap ?? onTap,
                isDark: isDark,
              ),
              _VerticalSep(isDark: isDark),
              _ComposerAction(
                icon: Icons.edit_note_rounded,
                label: 'Fikr',
                onTap: onTap,
                isDark: isDark,
              ),
              _VerticalSep(isDark: isDark),
              _ComposerAction(
                icon: Icons.rocket_launch_outlined,
                label: 'Loyiha',
                onTap: onTap,
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ComposerAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDark;

  const _ComposerAction({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final color =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 17, color: color),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _VerticalSep extends StatelessWidget {
  final bool isDark;
  const _VerticalSep({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 16,
      color: isDark ? AppColors.borderDark : AppColors.borderLight,
    );
  }
}
