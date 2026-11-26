import 'package:material_ui/material_ui.dart';

/// Slate-first architectural color system for Geters (Light + Dark).
abstract class AppColors {
  // Brand & Interactive Accents
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryLight = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color slateAccent = Color(0xFF1E293B); // Slate-800 light primary CTA/pill
  static const Color slateAccentHover = Color(0xFF334155); // Slate-700
  static const Color primarySurface = Color(0xFFEFF6FF);
  static const Color primarySurfaceDark = Color(0xFF172554);

  // Light Mode Slate Surfaces
  static const Color backgroundLight = Color(0xFFF8FAFC); // Slate-50 canvas
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceLightElevated = Color(0xFFF1F5F9); // Slate-100
  static const Color surfaceLightSubtle = Color(0xFFE2E8F0); // Slate-200
  static const Color borderLight = Color(0xFFE2E8F0); // Slate-200

  // Dark Mode Architectural Slate Surfaces
  static const Color backgroundDark = Color(0xFF090D16);
  static const Color surfaceDark = Color(0xFF0F172A); // Slate-900
  static const Color surfaceDarkElevated = Color(0xFF1E293B); // Slate-800
  static const Color surfaceDarkSubtle = Color(0xFF162033);
  static const Color borderDark = Color(0xFF1E293B); // Slate-800
  static const Color borderDarkElevated = Color(0xFF2D3A50);

  // Slate Typography Hierarchy
  static const Color textPrimaryLight = Color(0xFF0F172A); // Slate-900
  static const Color textSecondaryLight = Color(0xFF334155); // Slate-700
  static const Color textMutedLight = Color(0xFF64748B); // Slate-500

  static const Color textPrimaryDark = Color(0xFFF8FAFC); // Slate-50
  static const Color textSecondaryDark = Color(0xFFCBD5E1); // Slate-300
  static const Color textMutedDark = Color(0xFF94A3B8); // Slate-400
  static const Color textSubMutedDark = Color(0xFF64748B); // Slate-500

  // Semantic Status
  static const Color success = Color(0xFF10B981);
  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color verified = Color(0xFF2563EB);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color info = Color(0xFF0EA5E9);

  // Code & Terminal Surfaces
  static const Color codeSurfaceDark = Color(0xFF020617); // Slate-950
  static const Color codeSurfaceLight = Color(0xFF0F172A); // Slate-900
  static const Color codeText = Color(0xFFE2E8F0); // Slate-200
  static const Color codeAccent = Color(0xFF38BDF8); // Sky-400
}
