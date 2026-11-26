import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/liquid_glass.dart';
import '../../models/user_profile.dart';

export 'profile_info_section.dart';

class ProfileActivityTab extends StatelessWidget {
  final int totalViews;
  final int discussionsCount;
  final int savedCount;
  final bool isDark;

  const ProfileActivityTab({
    super.key,
    required this.totalViews,
    required this.discussionsCount,
    required this.savedCount,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        LiquidGlassContainer(
          borderRadius: AppTheme.radiusCard,
          blurSigma: 14,
          borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Oxirgi 30 kunlik faollik',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: isDark
                      ? AppColors.textPrimaryDark
                      : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 12),
              ProfileActivityRow(
                label: 'Jami ko\'rishlar',
                value: NumberFormatter.compact(totalViews),
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              ProfileActivityRow(
                label: 'Bildirilgan munozaralar',
                value: '$discussionsCount',
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              ProfileActivityRow(
                label: 'Saqlangan qo\'llanmalar',
                value: '$savedCount',
                isDark: isDark,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ProfileAboutTab extends StatelessWidget {
  final String displayName;
  final String displayHandle;
  final String displayRole;
  final String displayBio;
  final UserProfile? selfUser;
  final bool isDark;

  const ProfileAboutTab({
    super.key,
    required this.displayName,
    required this.displayHandle,
    required this.displayRole,
    required this.displayBio,
    required this.selfUser,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        LiquidGlassContainer(
          borderRadius: AppTheme.radiusCard,
          blurSigma: 14,
          borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Profil haqida',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: isDark
                      ? AppColors.textPrimaryDark
                      : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 12),
              ProfileActivityRow(label: 'Ism', value: displayName, isDark: isDark),
              const SizedBox(height: 8),
              ProfileActivityRow(
                label: 'Username',
                value: displayHandle,
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              ProfileActivityRow(
                label: 'Yo\'nalish',
                value: displayRole,
                isDark: isDark,
              ),
              if (selfUser?.location != null &&
                  selfUser!.location!.isNotEmpty) ...[
                const SizedBox(height: 8),
                ProfileActivityRow(
                  label: 'Manzil',
                  value: selfUser!.location!,
                  isDark: isDark,
                ),
              ],
              if (selfUser?.website != null &&
                  selfUser!.website!.isNotEmpty) ...[
                const SizedBox(height: 8),
                ProfileActivityRow(
                  label: 'Veb-sayt',
                  value:
                      selfUser!.website!.replaceAll(RegExp(r'^https?://'), ''),
                  isDark: isDark,
                ),
              ],
              if (selfUser != null) ...[
                const SizedBox(height: 8),
                ProfileActivityRow(
                  label: 'Qo\'shilgan sana',
                  value: DateFormatter.formatShortDate(selfUser!.joinedDate),
                  isDark: isDark,
                ),
              ],
              const SizedBox(height: 12),
              Text(
                displayBio,
                style: AppTypography.body.copyWith(
                  fontSize: 13,
                  height: 1.45,
                  color: isDark
                      ? AppColors.textSecondaryDark
                      : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ProfileActivityRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;

  const ProfileActivityRow({
    super.key,
    required this.label,
    required this.value,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isDark
                ? AppColors.textSecondaryDark
                : AppColors.textSecondaryLight,
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color:
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
          ),
        ),
      ],
    );
  }
}
