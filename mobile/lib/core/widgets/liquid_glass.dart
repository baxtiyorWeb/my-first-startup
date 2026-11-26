import 'package:material_ui/material_ui.dart';
import '../theme/app_colors.dart';

/// Reusable crisp Slate/glass surface container and popup menu.
/// Non-interactive containers (`onTap == null`) omit clip/ink layers to minimize
/// render object depth during scrolling.
class LiquidGlassContainer extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final double blurSigma;
  final bool useBackdropBlur;
  final Color? tintColor;
  final Color? borderColor;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;
  final VoidCallback? onTap;

  const LiquidGlassContainer({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.blurSigma = 20,
    this.useBackdropBlur = false,
    this.tintColor,
    this.borderColor,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final resolvedBg = tintColor ??
        (isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated);
    final resolvedBorder = borderColor ??
        (tintColor != null
            ? tintColor!
            : (isDark ? AppColors.borderDark : AppColors.borderLight));

    if (onTap == null) {
      return Container(
        width: width,
        height: height,
        margin: margin,
        padding: padding ?? EdgeInsets.zero,
        decoration: BoxDecoration(
          color: resolvedBg,
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(color: resolvedBorder, width: 1),
        ),
        child: child,
      );
    }

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      side: BorderSide(color: resolvedBorder, width: 1),
    );

    Widget interactive = Material(
      color: resolvedBg,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: shape,
        child: Padding(
          padding: padding ?? EdgeInsets.zero,
          child: child,
        ),
      ),
    );

    if (width != null || height != null || margin != null) {
      interactive = Container(
        width: width,
        height: height,
        margin: margin,
        child: interactive,
      );
    }
    return interactive;
  }
}

class LiquidGlassMenuOption<T> {
  final T value;
  final String label;
  final IconData? icon;
  final Color? color;

  const LiquidGlassMenuOption({
    required this.value,
    required this.label,
    this.icon,
    this.color,
  });
}

/// Dropdown trigger + Slate overlay menu with safe-area and edge clamping.
class LiquidGlassDropdown<T> extends StatelessWidget {
  final T? selectedValue;
  final List<LiquidGlassMenuOption<T>> options;
  final ValueChanged<T> onSelected;
  final Widget child;

  const LiquidGlassDropdown({
    super.key,
    this.selectedValue,
    required this.options,
    required this.onSelected,
    required this.child,
  });

  static const double _menuWidth = 204.0;

  Future<void> _openMenu(BuildContext context) async {
    final RenderBox button = context.findRenderObject() as RenderBox;
    final RenderBox overlay =
        Navigator.of(context).overlay!.context.findRenderObject() as RenderBox;
    final Offset position = button.localToGlobal(Offset.zero, ancestor: overlay);
    final Size size = button.size;
    final screenSize = overlay.size;
    final viewPadding = MediaQuery.viewPaddingOf(context);

    final estimatedHeight =
        (options.length * 42.0 + 16.0).clamp(80.0, screenSize.height * 0.65);

    // Align right edge when triggered near the right side of the screen (e.g. post overflow menu).
    final isRightHalf = position.dx + size.width * 0.5 > screenSize.width * 0.5;
    final rawLeft =
        isRightHalf ? (position.dx + size.width - _menuWidth) : position.dx;
    final maxLeft = (screenSize.width - _menuWidth - 12.0).clamp(12.0, screenSize.width);
    final double left = rawLeft.clamp(12.0, maxLeft);

    final minTop = viewPadding.top + 8.0;
    final maxTop =
        (screenSize.height - viewPadding.bottom - estimatedHeight - 12.0)
            .clamp(minTop, screenSize.height);
    final double top = (position.dy + size.height + 6).clamp(minTop, maxTop);

    final result = await showGeneralDialog<T>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Menyuni yopish',
      barrierColor: Colors.black.withAlpha(32),
      transitionDuration: const Duration(milliseconds: 150),
      pageBuilder: (ctx, _, _) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Stack(
          children: [
            Positioned(
              left: left,
              top: top,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  width: _menuWidth,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isDark ? AppColors.borderDarkElevated : AppColors.borderLight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(isDark ? 95 : 28),
                        blurRadius: 22,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: options.map((opt) {
                        final isSelected =
                            selectedValue != null && opt.value == selectedValue;
                        final itemColor = opt.color ??
                            (isSelected
                                ? AppColors.primary
                                : (isDark
                                    ? AppColors.textPrimaryDark
                                    : AppColors.textPrimaryLight));

                        return InkWell(
                          onTap: () => Navigator.of(ctx).pop(opt.value),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            child: Row(
                              children: [
                                if (opt.icon != null) ...[
                                  Icon(opt.icon, size: 17, color: itemColor),
                                  const SizedBox(width: 10),
                                ],
                                Expanded(
                                  child: Text(
                                    opt.label,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: itemColor,
                                    ),
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(
                                    Icons.check_rounded,
                                    size: 16,
                                    color: AppColors.primary,
                                  ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
      transitionBuilder: (_, anim, _, child) {
        final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: anim,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.94, end: 1.0).animate(curved),
            alignment: isRightHalf ? Alignment.topRight : Alignment.topLeft,
            child: child,
          ),
        );
      },
    );

    if (result != null) {
      onSelected(result);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openMenu(context),
      child: child,
    );
  }
}
