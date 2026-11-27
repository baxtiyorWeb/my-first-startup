/// Geters Unified Design System Tokens (Mobile ↔ Web 1:1 parity).
///
/// Mirrors `web/lib/design-tokens.ts` and `web/app/globals.css`.
abstract class AppSpacing {
  static const double s1 = 4.0;
  static const double s2 = 8.0;
  static const double s3 = 12.0;
  static const double s4 = 16.0;
  static const double s5 = 20.0;
  static const double s6 = 24.0;
  static const double s8 = 32.0;
  static const double s10 = 40.0;
  static const double s12 = 48.0;
}

abstract class AppRadius {
  static const double xs = 6.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double card = 16.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double full = 999.0;
}

abstract class AppSizes {
  // Button heights
  static const double buttonSm = 34.0;
  static const double buttonMd = 42.0;
  static const double buttonLg = 50.0;

  // Input heights
  static const double inputSm = 36.0;
  static const double inputMd = 42.0;
  static const double inputLg = 48.0;

  // Icon sizes
  static const double iconXs = 14.0;
  static const double iconSm = 16.0;
  static const double iconMd = 18.0;
  static const double iconLg = 20.0;
  static const double iconXl = 24.0;

  // Avatar sizes
  static const double avatarXs = 24.0;
  static const double avatarSm = 32.0;
  static const double avatarMd = 38.0;
  static const double avatarLg = 44.0;
  static const double avatarXl = 72.0;

  // Border widths
  static const double borderHairline = 1.0;
  static const double borderFocused = 1.5;
}
