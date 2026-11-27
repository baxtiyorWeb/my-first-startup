import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../auth/data/auth_controller.dart';

class SettingsScreen extends StatefulWidget {
  final ThemeController themeController;
  final AuthController authController;

  const SettingsScreen({
    super.key,
    required this.themeController,
    required this.authController,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const String _kLikesKey = 'geters_push_likes_v1';
  static const String _kCommentsKey = 'geters_push_comments_v1';
  static const String _kFollowsKey = 'geters_push_follows_v1';

  bool _pushLikes = true;
  bool _pushComments = true;
  bool _pushFollows = true;

  @override
  void initState() {
    super.initState();
    _loadPushPrefs();
  }

  Future<void> _loadPushPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _pushLikes = prefs.getBool(_kLikesKey) ?? true;
        _pushComments = prefs.getBool(_kCommentsKey) ?? true;
        _pushFollows = prefs.getBool(_kFollowsKey) ?? true;
      });
    } catch (_) {}
  }

  Future<void> _setPushPref(String key, bool val) async {
    setState(() {
      if (key == _kLikesKey) _pushLikes = val;
      if (key == _kCommentsKey) _pushComments = val;
      if (key == _kFollowsKey) _pushFollows = val;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, val);
    } catch (_) {}
  }

  Future<void> _updatePrivacy({
    bool? isPrivate,
    bool? showOnlineStatus,
    bool? twoFactorEnabled,
  }) async {
    try {
      await widget.authController.updateProfile(
        isPrivate: isPrivate,
        showOnlineStatus: showOnlineStatus,
        twoFactorEnabled: twoFactorEnabled,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              e.toString().isNotEmpty
                  ? e.toString()
                  : 'Sozlamani saqlashda xatolik yuz berdi',
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.dangerSurface,
          ),
        );
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text('Havolani ochib bo\'lmadi: $url'),
              behavior: SnackBarBehavior.floating,
            ),
          );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('Havolani ochib bo\'lmadi: $url'),
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  Future<void> _deleteAccount() async {
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Hisobni butunlay o\'chirish',
      message:
          'Hisobingiz, postlaringiz, izohlaringiz, xabarlaringiz va profil ma\'lumotlaringiz butunlay o\'chiriladi. Bu amalni ortga qaytarib bo\'lmaydi.',
      confirmLabel: 'O\'chirish',
      isDanger: true,
    );
    if (!confirmed || !mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await widget.authController.deleteAccount();
      navigator.popUntil((route) => route.isFirst);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Hisobingiz butunlay o\'chirildi'),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (e) {
      if (!mounted) return;
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('Hisobni o\'chirishda xatolik: $e'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.dangerSurface,
          ),
        );
    }
  }

  Widget _linkTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    bool isDanger = false,
  }) {
    return ListTile(
      dense: true,
      onTap: onTap,
      leading: Icon(
        icon,
        size: 19,
        color: isDanger ? AppColors.danger : AppColors.primary,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w600,
          color: isDanger ? AppColors.danger : null,
        ),
      ),
      subtitle: subtitle != null
          ? Text(subtitle, style: const TextStyle(fontSize: 11.5))
          : null,
      trailing: const Icon(Icons.open_in_new_rounded, size: 15),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Sozlamalar')),
      body: ListenableBuilder(
        listenable:
            Listenable.merge([widget.themeController, widget.authController]),
        builder: (context, _) {
          final user = widget.authController.currentUser;
          final currentMode = widget.themeController.themeMode;

          return ListView(
            padding: const EdgeInsets.all(16),
            physics: const BouncingScrollPhysics(),
            children: [
              _buildSectionTitle('Ko\'rinish va Mavzu', isDark),
              const SizedBox(height: 8),
              _buildCard(
                isDark,
                child: Row(
                  children: [
                    _ThemeOptionTile(
                      icon: Icons.light_mode_outlined,
                      label: 'Kunduzgi',
                      isSelected: currentMode == ThemeMode.light,
                      onTap: () => widget.themeController.setThemeMode(ThemeMode.light),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 8),
                    _ThemeOptionTile(
                      icon: Icons.dark_mode_outlined,
                      label: 'Qorong\'i',
                      isSelected: currentMode == ThemeMode.dark,
                      onTap: () => widget.themeController.setThemeMode(ThemeMode.dark),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 8),
                    _ThemeOptionTile(
                      icon: Icons.brightness_auto_outlined,
                      label: 'Tizim',
                      isSelected: currentMode == ThemeMode.system,
                      onTap: () => widget.themeController.setThemeMode(ThemeMode.system),
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _buildSectionTitle('Interfeys tili', isDark),
              const SizedBox(height: 8),
              _buildDividedCard(isDark, [
                _buildLanguageTile('uz', 'O\'zbekcha (Lotin)', '🇺🇿', isDark),
                _buildLanguageTile('ru', 'Русский', '🇷🇺', isDark),
                _buildLanguageTile('en', 'English', '🇬🇧', isDark),
              ]),
              const SizedBox(height: 20),
              _buildSectionTitle('Maxfiylik va Xavfsizlik', isDark),
              const SizedBox(height: 8),
              _buildDividedCard(isDark, [
                _switchTile(
                  value: user.isPrivate,
                  title: 'Yopiq profil (Private)',
                  subtitle: 'Postlaringiz faqat obunachilarga ko\'rinadi',
                  onChanged: (v) => _updatePrivacy(isPrivate: v),
                ),
                _switchTile(
                  value: user.showOnlineStatus,
                  title: 'Onlayn holatni ko\'rsatish',
                  subtitle: 'Xabarlarda faollik nuqtasi ko\'rinadi',
                  onChanged: (v) => _updatePrivacy(showOnlineStatus: v),
                ),
                _switchTile(
                  value: user.twoFactorEnabled,
                  title: 'Ikki bosqichli himoya (2FA)',
                  subtitle: 'Kirishda qo\'shimcha xavfsizlik tekshiruvi',
                  onChanged: (v) => _updatePrivacy(twoFactorEnabled: v),
                ),
              ]),
              const SizedBox(height: 20),
              _buildSectionTitle('Bildirishnomalar', isDark),
              const SizedBox(height: 8),
              _buildDividedCard(isDark, [
                _switchTile(
                  value: _pushLikes,
                  title: 'Likelar va reaksiyalar',
                  onChanged: (v) => _setPushPref(_kLikesKey, v),
                ),
                _switchTile(
                  value: _pushComments,
                  title: 'Izohlar va munozaralar',
                  onChanged: (v) => _setPushPref(_kCommentsKey, v),
                ),
                _switchTile(
                  value: _pushFollows,
                  title: 'Yangi obunachilar',
                  onChanged: (v) => _setPushPref(_kFollowsKey, v),
                ),
              ]),
              const SizedBox(height: 20),
              _buildSectionTitle('Huquqiy va xavfsizlik', isDark),
              const SizedBox(height: 8),
              _buildDividedCard(isDark, [
                _linkTile(
                  icon: Icons.privacy_tip_outlined,
                  title: 'Maxfiylik siyosati',
                  onTap: () => _openUrl(ApiConstants.privacyPolicyUrl),
                ),
                _linkTile(
                  icon: Icons.description_outlined,
                  title: 'Foydalanish shartlari',
                  onTap: () => _openUrl(ApiConstants.termsUrl),
                ),
                _linkTile(
                  icon: Icons.child_care_outlined,
                  title: 'Bolalar xavfsizligi',
                  subtitle: 'CSAE bo\'yicha nol tolerantlik siyosati',
                  onTap: () => _openUrl(ApiConstants.childSafetyUrl),
                ),
                _linkTile(
                  icon: Icons.gavel_outlined,
                  title: 'Shikoyat va qo\'llab-quvvatlash',
                  subtitle: 'support@thegogetters.uz',
                  onTap: () => _openUrl('mailto:support@thegogetters.uz'),
                ),
                _linkTile(
                  icon: Icons.delete_forever_outlined,
                  title: 'Hisobni o\'chirish (veb orqali)',
                  onTap: () => _openUrl(ApiConstants.accountDeleteUrl),
                  isDanger: true,
                ),
              ]),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: _deleteAccount,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.danger),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                ),
                icon: const Icon(Icons.delete_forever_rounded, size: 18),
                label: const Text(
                  'Hisobni butunlay o\'chirish',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () async {
                  final ok = await AppConfirmDialog.show(
                    context,
                    title: 'Hisobdan chiqish',
                    message: 'Haqiqatan ham hisobingizdan chiqmoqchimisiz?',
                    confirmLabel: 'Chiqish',
                    isDanger: true,
                  );
                  if (ok && context.mounted) {
                    Navigator.of(context).popUntil((route) => route.isFirst);
                    widget.authController.logout();
                  }
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: const BorderSide(color: AppColors.danger),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                ),
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text(
                  'Hisobdan chiqish',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'Geters Mobile v1.0.0 · Bilim. Yangilik. Imkoniyat.',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDividedCard(bool isDark, List<Widget> items) {
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final children = <Widget>[];
    for (var i = 0; i < items.length; i++) {
      if (i > 0) children.add(Divider(color: borderColor, height: 1));
      children.add(items[i]);
    }
    return _buildCard(isDark, padding: EdgeInsets.zero, child: Column(children: children));
  }

  Widget _switchTile({
    required bool value,
    required String title,
    String? subtitle,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile(
      value: value,
      title: Text(
        title,
        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
      ),
      subtitle: subtitle != null
          ? Text(subtitle, style: const TextStyle(fontSize: 11.5))
          : null,
      onChanged: onChanged,
    );
  }

  Widget _buildSectionTitle(String title, bool isDark) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 12.5,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.3,
        color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
      ),
    );
  }

  Widget _buildCard(
    bool isDark, {
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(12),
  }) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: child,
    );
  }

  Widget _buildLanguageTile(String code, String name, String flag, bool isDark) {
    final isSelected = widget.authController.locale == code;
    return ListTile(
      dense: true,
      onTap: () {
        widget.authController.setLocale(code);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text('Til tanlandi: $name'), duration: const Duration(seconds: 1)),
          );
      },
      leading: Text(flag, style: const TextStyle(fontSize: 20)),
      title: Text(
        name,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          color: isSelected
              ? AppColors.primary
              : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
      ),
      trailing: isSelected
          ? const Icon(Icons.check_circle, size: 18, color: AppColors.primary)
          : null,
    );
  }
}

class _ThemeOptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isDark;

  const _ThemeOptionTile({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: BorderSide(
        color: isSelected
            ? AppColors.primary
            : (isDark ? AppColors.borderDark : AppColors.borderLight),
        width: isSelected ? 1.5 : 1,
      ),
    );

    return Expanded(
      child: Material(
        color: isSelected
            ? (isDark ? AppColors.primarySurfaceDark : AppColors.primarySurface)
            : (isDark ? AppColors.surfaceDarkElevated : AppColors.surfaceLightElevated),
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          customBorder: shape,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: isSelected
                      ? AppColors.primary
                      : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? AppColors.primary
                        : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
