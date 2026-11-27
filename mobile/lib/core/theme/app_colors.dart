import 'package:material_ui/material_ui.dart';

/// Geters unified Emerald-Teal color system (Light + Dark).
///
/// Matches Web `web/lib/design-tokens.ts` and `web/app/globals.css` 1:1:
/// Mint-Teal accent (#2DD4BF / #14B8A6), deep teal surface (#0C272C),
/// pure black dark canvas (#000000), #16181C elevated cards, hairline borders.
abstract class AppColors {
  // Brand & Interactive Accents (mirrors web/lib/design-tokens.ts)
  static const Color primary = Color(0xFF2DD4BF); // Geters signature mint-teal
  static const Color primaryHover = Color(0xFF14B8A6);
  static const Color primaryActive = Color(0xFF0D9488);
  static const Color primaryLight = Color(0xFF5EEAD4);
  static const Color primaryDark = Color(0xFF0D9488);
  static const Color slateAccent = Color(0xFF0F1419);
  static const Color slateAccentHover = Color(0xFF272C30);
  static const Color primarySurface = Color(0xFFE6FAF7);
  static const Color primarySurfaceDark = Color(0xFF0C272C);

  // Light Mode Surfaces
  static const Color backgroundLight = Color(0xFFFFFFFF);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceLightElevated = Color(0xFFF7F9F9);
  static const Color surfaceLightSubtle = Color(0xFFEFF3F4);
  static const Color borderLight = Color(0xFFCFD9DE);

  // Dark Mode Surfaces (Pure black canvas + #0A0D14 chrome + #16181C cards)
  static const Color backgroundDark = Color(0xFF000000);
  static const Color sidebarDark = Color(0xFF0A0D14);
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

  // Semantic Status
  static const Color success = Color(0xFF00BA7C);
  static const Color danger = Color(0xFFF4212E);
  static const Color warning = Color(0xFFFFD400);
  static const Color like = Color(0xFFF91880);
  static const Color onPrimary = Color(0xFF0A0D14); // High contrast on #2DD4BF (~11.5:1)

  // Foregrounds for saturated status surfaces (WCAG AA checked)
  static const Color onSuccess = Color(0xFF0A0D14);
  static const Color dangerSurface = Color(0xFFC4170F);
  static const Color successTextLight = Color(0xFF007A52);
  static const Color warningTextLight = Color(0xFF8C7400);

  static const Color verified = Color(0xFF14B8A6); // Geters teal verified badge
  static const Color purple = Color(0xFF7856FF);
  static const Color info = Color(0xFF2DD4BF);

  // Code & Terminal Surfaces
  static const Color codeSurfaceDark = Color(0xFF000000);
  static const Color codeSurfaceLight = Color(0xFF0F1419);
  static const Color codeText = Color(0xFFE7E9EA);
  static const Color codeAccent = Color(0xFF2DD4BF);
}
