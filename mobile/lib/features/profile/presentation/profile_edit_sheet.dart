import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/keyboard_inset_padding.dart';
import '../../auth/data/auth_controller.dart';

class ProfileEditSheet extends StatefulWidget {
  final AuthController authController;

  const ProfileEditSheet({super.key, required this.authController});

  static Future<void> show(
    BuildContext context, {
    required AuthController authController,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProfileEditSheet(authController: authController),
    );
  }

  @override
  State<ProfileEditSheet> createState() => _ProfileEditSheetState();
}

class _ProfileEditSheetState extends State<ProfileEditSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _roleController;
  late final TextEditingController _bioController;
  late final TextEditingController _locationController;
  late final TextEditingController _websiteController;

  final FocusNode _nameFocus = FocusNode();
  final FocusNode _roleFocus = FocusNode();
  final FocusNode _bioFocus = FocusNode();
  final FocusNode _locationFocus = FocusNode();
  final FocusNode _websiteFocus = FocusNode();

  String? _nameError;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = widget.authController.currentUser;
    _nameController = TextEditingController(text: user.name);
    _roleController = TextEditingController(text: user.role);
    _bioController = TextEditingController(text: user.bio);
    _locationController = TextEditingController(text: user.location ?? '');
    _websiteController = TextEditingController(text: user.website ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _roleController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    _websiteController.dispose();
    _nameFocus.dispose();
    _roleFocus.dispose();
    _bioFocus.dispose();
    _locationFocus.dispose();
    _websiteFocus.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_isSaving) return;
    final name = _nameController.text.trim();
    if (name.length < 2) {
      setState(() {
        _nameError = 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak';
      });
      _nameFocus.requestFocus();
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() => _isSaving = true);
    try {
      await widget.authController.updateProfile(
        name: name,
        role: _roleController.text.trim(),
        bio: _bioController.text.trim(),
        location: _locationController.text.trim(),
        website: _websiteController.text.trim(),
      );
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop();
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Profil ma\'lumotlari yangilandi!'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
          ),
        );
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Profilni saqlashda xatolik yuz berdi'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.danger,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final maxHeight = MediaQuery.sizeOf(context).height * 0.90;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return KeyboardInsetPadding(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppTheme.radiusXl),
            ),
            border: Border(top: BorderSide(color: borderColor)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: borderColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(
                    'Profilni tahrirlash',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark
                          ? AppColors.textPrimaryDark
                          : AppColors.textPrimaryLight,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () {
                      FocusScope.of(context).unfocus();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.close, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Flexible(
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Ism', isDark),
                      TextField(
                        controller: _nameController,
                        focusNode: _nameFocus,
                        textCapitalization: TextCapitalization.words,
                        textInputAction: TextInputAction.next,
                        onSubmitted: (_) => _roleFocus.requestFocus(),
                        onChanged: (v) {
                          if (_nameError != null && v.trim().length >= 2) {
                            setState(() => _nameError = null);
                          }
                        },
                        decoration: InputDecoration(
                          hintText: 'To\'liq ismingiz',
                          errorText: _nameError,
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildLabel('Mutaxassislik / Rol', isDark),
                      TextField(
                        controller: _roleController,
                        focusNode: _roleFocus,
                        textInputAction: TextInputAction.next,
                        onSubmitted: (_) => _bioFocus.requestFocus(),
                        decoration: const InputDecoration(
                          hintText: 'Masalan: Full-Stack Developer',
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildLabel('Bio', isDark),
                      TextField(
                        controller: _bioController,
                        focusNode: _bioFocus,
                        maxLines: 3,
                        textInputAction: TextInputAction.next,
                        onSubmitted: (_) => _locationFocus.requestFocus(),
                        decoration: const InputDecoration(
                          hintText: 'O\'zingiz haqingizda qisqacha...',
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildLabel('Manzil', isDark),
                      TextField(
                        controller: _locationController,
                        focusNode: _locationFocus,
                        textCapitalization: TextCapitalization.words,
                        textInputAction: TextInputAction.next,
                        onSubmitted: (_) => _websiteFocus.requestFocus(),
                        decoration: const InputDecoration(
                          hintText: 'Toshkent, O\'zbekiston',
                          isDense: true,
                          prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildLabel('Veb-sayt / Portfolio', isDark),
                      TextField(
                        controller: _websiteController,
                        focusNode: _websiteFocus,
                        keyboardType: TextInputType.url,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _save(),
                        decoration: const InputDecoration(
                          hintText: 'https://...',
                          isDense: true,
                          prefixIcon: Icon(Icons.link, size: 18),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SafeArea(
                top: false,
                child: AppButton(
                  text: 'Saqlash',
                  icon: Icons.check_rounded,
                  isLoading: _isSaving,
                  isFullWidth: true,
                  onPressed: _save,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color:
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
        ),
      ),
    );
  }
}
