import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../models/user_profile.dart';

class ProfileInfoSection extends StatelessWidget {
  final String displayName;
  final String displayHandle;
  final String displayRole;
  final String displayBio;
  final bool isVerified;
  final bool isSelf;
  final bool isDark;
  final Color activeAccent;
  final Color surfaceBg;
  final UserProfile selfUser;
  final int postsCount;

  const ProfileInfoSection({
    super.key,
    required this.displayName,
    required this.displayHandle,
    required this.displayRole,
    required this.displayBio,
    required this.isVerified,
    required this.isSelf,
    required this.isDark,
    required this.activeAccent,
    required this.surfaceBg,
    required this.selfUser,
    required this.postsCount,
  });

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Container(
        color: surfaceBg,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Flexible(
                  child: Text(
                    displayName,
                    style: AppTypography.heading2.copyWith(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      color: isDark
                          ? AppColors.textPrimaryDark
                          : AppColors.textPrimaryLight,
                    ),
                  ),
                ),
                if (isVerified) ...[
                  const SizedBox(width: 6),
                  const VerifiedBadge(size: 18),
                ],
              ],
            ),
            const SizedBox(height: 2),
            Text(
              displayHandle,
              style: AppTypography.body.copyWith(
                fontSize: 13,
                color:
                    isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              displayRole,
              style: AppTypography.subtitle.copyWith(
                fontSize: 13.5,
                color: activeAccent,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              displayBio,
              style: AppTypography.body.copyWith(
                fontSize: 13.5,
                height: 1.45,
                color: isDark
                    ? AppColors.textSecondaryDark
                    : AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 12),
            if (isSelf)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (selfUser.location != null && selfUser.location!.isNotEmpty)
                    _MetaGlassChip(
                      icon: Icons.location_on_outlined,
                      label: selfUser.location!,
                      isDark: isDark,
                    ),
                  if (selfUser.website != null && selfUser.website!.isNotEmpty)
                    _MetaGlassChip(
                      icon: Icons.link_rounded,
                      label:
                          selfUser.website!.replaceAll(RegExp(r'^https?://'), ''),
                      isDark: isDark,
                      accentColor: activeAccent,
                    ),
                  _MetaGlassChip(
                    icon: Icons.calendar_today_outlined,
                    label:
                        '${DateFormatter.formatShortDate(selfUser.joinedDate)} dan a\'zo',
                    isDark: isDark,
                  ),
                ],
              ),
            const SizedBox(height: 16),
            LiquidGlassContainer(
              borderRadius: 16,
              blurSigma: 16,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
              borderColor:
                  isDark ? AppColors.borderDark : AppColors.borderLight,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _StatColumn(
                    icon: Icons.description_outlined,
                    label: 'Postlar',
                    value: '$postsCount',
                    isDark: isDark,
                  ),
                  _StatDivider(isDark: isDark),
                  _StatColumn(
                    icon: Icons.chat_bubble_outline_rounded,
                    label: 'Munozaralar',
                    value: '${selfUser.discussionsCount}',
                    isDark: isDark,
                  ),
                  _StatDivider(isDark: isDark),
                  _StatColumn(
                    icon: Icons.groups_outlined,
                    label: 'Obunachilar',
                    value: '${selfUser.followersCount}',
                    isDark: isDark,
                  ),
                  _StatDivider(isDark: isDark),
                  _StatColumn(
                    icon: Icons.person_add_alt_1_outlined,
                    label: 'Obunalar',
                    value: '${selfUser.followingCount}',
                    isDark: isDark,
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

class _StatColumn extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;

  const _StatColumn({
    required this.icon,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 16,
          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: AppTypography.heading3.copyWith(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color:
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTypography.caption.copyWith(
            fontSize: 11,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
        ),
      ],
    );
  }
}

class _StatDivider extends StatelessWidget {
  final bool isDark;

  const _StatDivider({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 36,
      color: isDark ? AppColors.borderDark : AppColors.borderLight,
    );
  }
}

class _MetaGlassChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  final Color? accentColor;

  const _MetaGlassChip({
    required this.icon,
    required this.label,
    required this.isDark,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final textColor = accentColor ??
        (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight);
    final iconColor = accentColor ??
        (isDark ? AppColors.textMutedDark : AppColors.textMutedLight);

    return LiquidGlassContainer(
      borderRadius: AppTheme.radiusFull,
      blurSigma: 12,
      borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13.5, color: iconColor),
          const SizedBox(width: 5),
          Text(
            label,
            style: AppTypography.caption.copyWith(
              fontSize: 11.5,
              fontWeight: accentColor != null ? FontWeight.w600 : FontWeight.w500,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}
