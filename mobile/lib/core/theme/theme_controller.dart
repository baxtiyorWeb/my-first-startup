import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController extends ChangeNotifier {
  static const String _storageKey = 'geters_theme_mode_v1';

  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  /// Loads the user's persisted theme preference if available.
  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_storageKey);
      final parsed = _parseMode(stored);
      if (parsed != null && parsed != _themeMode) {
        _themeMode = parsed;
        notifyListeners();
      }
    } catch (_) {
      // Ignore storage errors and keep ThemeMode.system fallback.
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode != mode) {
      _themeMode = mode;
      notifyListeners();
    }
    await _persistMode(mode);
  }

  Future<void> toggleLightDark(BuildContext context) async {
    final currentlyDark = Theme.of(context).brightness == Brightness.dark;
    final next = currentlyDark ? ThemeMode.light : ThemeMode.dark;
    await setThemeMode(next);
  }

  ThemeMode? _parseMode(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
        return ThemeMode.system;
      default:
        return null;
    }
  }

  Future<void> _persistMode(ThemeMode mode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, mode.name);
    } catch (_) {
      // Ignore persistence failures on restricted storage environments.
    }
  }
}
