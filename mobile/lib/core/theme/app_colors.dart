import 'package:material_ui/material_ui.dart';

/// X (Twitter) inspired color system for Geters (Light + Dark).
///
/// One blue accent (#1D9BF0), neutral gray hierarchy, pure black dark canvas
/// and hairline borders — the same visual language X uses.
abstract class AppColors {
  // Brand & Interactive Accents (mirrors web/lib/design-tokens.ts)
  static const Color primary = Color(0xFF1D9BF0); // Geters primary blue
  static const Color primaryHover = Color(0xFF1A8CD8);
  static const Color primaryActive = Color(0xFF1577B8);
  static const Color primaryLight = Color(0xFF4DB5F0);
  static const Color primaryDark = Color(0xFF1A8CD8);
  static const Color slateAccent = Color(0xFF0F1419); // X black CTA in light mode
  static const Color slateAccentHover = Color(0xFF272C30);
  static const Color primarySurface = Color(0xFFE8F5FD);
  static const Color primarySurfaceDark = Color(0xFF10394F);

  // Light Mode Surfaces
  static const Color backgroundLight = Color(0xFFFFFFFF);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceLightElevated = Color(0xFFF7F9F9);
  static const Color surfaceLightSubtle = Color(0xFFEFF3F4);
  static const Color borderLight = Color(0xFFCFD9DE);

  // Dark Mode Surfaces (X dark is pure black with #16181C elevated surfaces)
  static const Color backgroundDark = Color(0xFF000000);
  static const Color surfaceDark = Color(0xFF000000);
  static const Color surfaceDarkElevated = Color(0xFF16181C);
  static const Color surfaceDarkSubtle = Color(0xFF202327);
  static const Color borderDark = Color(0xFF2F3336);
  static const Color borderDarkElevated = Color(0xFF3E4144);

  // Gray Typography Hierarchy
  static const Color textPrimaryLight = Color(0xFF0F1419);
  static const Color textSecondaryLight = Color(0xFF536471);
  static const Color textMutedLight = Color(0xFF8B98A5);

  static const Color textPrimaryDark = Color(0xFFE7E9EA);
  static const Color textSecondaryDark = Color(0xFFCFD9DE);
  static const Color textMutedDark = Color(0xFF71767B);
  static const Color textSubMutedDark = Color(0xFF536471);

  // Semantic Status (X palette)
  static const Color success = Color(0xFF00BA7C); // X repost green
  static const Color danger = Color(0xFFF4212E); // X error red
  static const Color warning = Color(0xFFFFD400); // X highlight yellow
  static const Color like = Color(0xFFF91880); // X like/heart pink
  static const Color onPrimary = Color(0xFF0F1419); // text/icons on X blue surfaces

  // Foregrounds for saturated status surfaces (WCAG AA checked vs X palette)
  static const Color onSuccess = Color(0xFF0F1419); // 7.0:1 on #00BA7C
  static const Color dangerSurface = Color(0xFFC4170F); // error banner fill, white 6.0:1
  static const Color successTextLight = Color(0xFF007A52); // #00BA7C text on white
  static const Color warningTextLight = Color(0xFF8C7400); // #FFD400 text on white

  static const Color verified = Color(0xFF1A8CD8); // X verified blue, white check 3.6:1
  static const Color purple = Color(0xFF7856FF);
  static const Color info = Color(0xFF1D9BF0);

  // Code & Terminal Surfaces
  static const Color codeSurfaceDark = Color(0xFF000000);
  static const Color codeSurfaceLight = Color(0xFF0F1419);
  static const Color codeText = Color(0xFFE7E9EA);
  static const Color codeAccent = Color(0xFF1D9BF0);
}
