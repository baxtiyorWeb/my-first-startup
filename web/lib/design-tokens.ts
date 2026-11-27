/**
 * Geters Unified Design System Tokens (Web ↔ Mobile 1:1 parity).
 *
 * Reference palette: Geters dark canvas (#000000), #16181C elevated surface,
 * #2F3336 hairline borders, and #1D9BF0 primary brand accent.
 * Mirrors `mobile/lib/core/theme/app_colors.dart`, `app_tokens.dart`,
 * and `app_typography.dart`.
 */

export const GETERS_COLORS = {
  brand: {
    primary: "#1D9BF0",
    primaryHover: "#1A8CD8",
    primaryActive: "#1577B8",
    primaryLight: "#4DB5F0",
    onPrimary: "#0F1419",
    primarySurfaceLight: "#E8F5FD",
    primarySurfaceDark: "#10394F",
    secondaryLight: "#0F1419",
    secondaryDark: "#E7E9EA",
  },
  light: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceElevated: "#F7F9F9",
    surfaceSubtle: "#EFF3F4",
    border: "#CFD9DE",
    borderSubtle: "#E1E8ED",
    borderStrong: "#8B98A5",
    textPrimary: "#0F1419",
    textSecondary: "#536471",
    textMuted: "#8B98A5",
  },
  dark: {
    background: "#000000",
    surface: "#000000",
    surfaceElevated: "#16181C",
    surfaceSubtle: "#202327",
    border: "#2F3336",
    borderSubtle: "#2F3336",
    borderStrong: "#3E4144",
    textPrimary: "#E7E9EA",
    textSecondary: "#CFD9DE",
    textMuted: "#71767B",
  },
  status: {
    success: "#00BA7C",
    warning: "#FFD400",
    error: "#F4212E",
    errorSurface: "#C4170F",
    info: "#1D9BF0",
    like: "#F91880",
    verified: "#1A8CD8",
  },
  avatarGradients: [
    ["#1577B8", "#0F5C8F"],
    ["#6346D9", "#4E37B3"],
    ["#008257", "#006444"],
    ["#3E4144", "#0F1419"],
  ] as const,
} as const;

export const GETERS_SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const GETERS_RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  card: 16,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const GETERS_SIZES = {
  buttonHeight: { sm: 34, md: 40, lg: 48 },
  inputHeight: { sm: 36, md: 42, lg: 48 },
  icon: { xs: 14, sm: 16, md: 18, lg: 20, xl: 24 },
  avatar: { xs: 24, sm: 32, md: 38, lg: 44, xl: 72 },
} as const;
