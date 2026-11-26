import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

class ShortsPlaybackCard extends StatelessWidget {
  final double currentSpeed;
  final bool currentAutoAdvance;
  final List<double> allSpeeds;
  final String Function(double) formatSpeed;
  final ValueChanged<double> onSelectSpeed;
  final ValueChanged<bool> onToggleAutoAdvance;

  const ShortsPlaybackCard({
    super.key,
    required this.currentSpeed,
    required this.currentAutoAdvance,
    required this.allSpeeds,
    required this.formatSpeed,
    required this.onSelectSpeed,
    required this.onToggleAutoAdvance,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor =
        isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final elevatedColor =
        isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final textPrimary =
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textSecondary =
        isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final textMuted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final primaryTint =
        isDark ? AppColors.primarySurfaceDark : AppColors.primarySurface;
    final iconColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Material(
      color: elevatedColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        side: BorderSide(color: borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.speed_rounded, size: 18, color: iconColor),
                    const SizedBox(width: 8),
                    Text(
                      'Ijro tezligi',
                      style: TextStyle(
                        color: textPrimary,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: primaryTint,
                        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                      ),
                      child: Text(
                        formatSpeed(currentSpeed),
                        style: TextStyle(
                          color: iconColor,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    children: allSpeeds.map((speed) {
                      final selected = currentSpeed == speed;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () => onSelectSpeed(speed),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            padding: const EdgeInsets.symmetric(vertical: 7),
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.primary
                                  : Colors.transparent,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusSm),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              formatSpeed(speed),
                              style: TextStyle(
                                color: selected ? AppColors.onPrimary : textSecondary,
                                fontSize: 12.5,
                                fontWeight: selected
                                    ? FontWeight.w700
                                    : FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, thickness: 1, color: borderColor),
          InkWell(
            onTap: () => onToggleAutoAdvance(!currentAutoAdvance),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: primaryTint,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.playlist_play_rounded,
                      size: 20,
                      color: iconColor,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Avto-keyingi video',
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          'Video tugaganda keyingisiga o\'tish',
                          style: TextStyle(color: textMuted, fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    value: currentAutoAdvance,
                    activeTrackColor: AppColors.primary,
                    onChanged: onToggleAutoAdvance,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
