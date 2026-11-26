import 'package:material_ui/material_ui.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme.dart';
import 'liquid_glass.dart';

enum ButtonVariant { primary, secondary, outline, danger, ghost }

enum ButtonSize { sm, md, lg }

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;

  const AppButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.md,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDisabled = onPressed == null && !isLoading;

    Color? tintColor;
    Color fg;
    Color? borderColor;

    switch (variant) {
      case ButtonVariant.primary:
        tintColor = AppColors.primary;
        fg = AppColors.onPrimary;
        break;
      case ButtonVariant.secondary:
        tintColor = null;
        fg = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
        break;
      case ButtonVariant.outline:
        tintColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
        fg = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
        borderColor = isDark ? AppColors.borderDarkElevated : AppColors.borderLight;
        break;
      case ButtonVariant.danger:
        tintColor = AppColors.dangerSurface;
        fg = Colors.white;
        break;
      case ButtonVariant.ghost:
        tintColor = null;
        fg = isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
        borderColor = Colors.transparent;
        break;
    }

    double height;
    EdgeInsets padding;
    double fontSize;

    switch (size) {
      case ButtonSize.sm:
        height = 34;
        padding = const EdgeInsets.symmetric(horizontal: 12);
        fontSize = 12;
        break;
      case ButtonSize.md:
        height = 42;
        padding = const EdgeInsets.symmetric(horizontal: 16);
        fontSize = 14;
        break;
      case ButtonSize.lg:
        height = 50;
        padding = const EdgeInsets.symmetric(horizontal: 20);
        fontSize = 15.5;
        break;
    }

    final content = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading)
          SizedBox(
            width: fontSize + 2,
            height: fontSize + 2,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(fg),
            ),
          )
        else ...[
          if (icon != null) ...[
            Icon(icon, size: fontSize + 4, color: fg),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.button.copyWith(
                color: fg,
                fontSize: fontSize,
              ),
            ),
          ),
        ],
      ],
    );

    final Widget buttonBody = variant == ButtonVariant.ghost
        ? Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isLoading ? null : onPressed,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              child: Padding(
                padding: padding,
                child: Center(child: content),
              ),
            ),
          )
        : LiquidGlassContainer(
            borderRadius: AppTheme.radiusFull,
            blurSigma: 14,
            tintColor: tintColor,
            borderColor: borderColor,
            padding: padding,
            onTap: isLoading ? null : onPressed,
            child: Center(child: content),
          );

    return SizedBox(
      height: height,
      width: isFullWidth ? double.infinity : null,
      child: AnimatedOpacity(
        opacity: isDisabled ? 0.48 : 1.0,
        duration: const Duration(milliseconds: 140),
        child: buttonBody,
      ),
    );
  }
}
