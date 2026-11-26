import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:material_ui/material_ui.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/brand_logo.dart';
import '../data/auth_controller.dart';

class LoginScreen extends StatefulWidget {
  final AuthController authController;

  const LoginScreen({super.key, required this.authController});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const String _mobileClientId = String.fromEnvironment(
    'GOOGLE_MOBILE_CLIENT_ID',
    defaultValue:
        '124797949339-sfhangd5qc22jri9kafjosmp3po07sa9.apps.googleusercontent.com',
  );
  static const String _serverClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue:
        '124797949339-r53fjuo5vk9lvok2n4v268sm847sg3lb.apps.googleusercontent.com',
  );
  static bool _googleInitialized = false;

  bool _isLoading = false;
  String? _errorText;

  Future<void> _handleGoogleSignIn() async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    try {
      if (!_googleInitialized) {
        await GoogleSignIn.instance.initialize(
          clientId: _mobileClientId.isNotEmpty ? _mobileClientId : null,
          serverClientId: _serverClientId.isNotEmpty ? _serverClientId : null,
        );
        _googleInitialized = true;
      }

      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;

      if (idToken == null || idToken.isEmpty) {
        throw Exception('Google ID token olinmadi. Qaytadan urinib ko\'ring.');
      }

      final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
      final ok = await widget.authController.loginWithGoogleIdToken(
        idToken,
        platform: platform,
      );

      if (!ok && mounted) {
        setState(() {
          _errorText = widget.authController.errorMessage ?? 'Tizimga kirishda xatolik yuz berdi';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorText = 'Google bilan kirishda xatolik: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleDevGoogleVerify() async {
    final controller = TextEditingController(text: 'baxtiyor@thegogetters.uz');
    String? email;
    try {
      email = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Dev Google Auth'),
          content: TextField(
            controller: controller,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
            decoration: const InputDecoration(
              labelText: 'Google Email',
              hintText: 'user@gmail.com',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Bekor qilish'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text.trim()),
              child: const Text('Kirish'),
            ),
          ],
        ),
      );
    } finally {
      controller.dispose();
    }
    if (email == null || email.isEmpty || !mounted) return;

    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    final ok = await widget.authController.loginWithGoogleIdToken(
      'dev-mock-token:$email',
      platform: defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
    );
    if (!mounted) return;
    setState(() {
      _isLoading = false;
      if (!ok) {
        _errorText = widget.authController.errorMessage ?? 'Serverga ulanib bo\'lmadi';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(
                    child: BrandLogo(size: 46, showText: true, showTagline: true),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Google orqali kiring',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Geters platformasiga faqat Google hisobingiz orqali ro\'yxatdan o\'tish va kirish mumkin.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.45,
                      color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (_errorText != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withAlpha(24),
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppColors.danger.withAlpha(65)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.error_outline_rounded,
                            size: 17,
                            color: AppColors.danger,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorText!,
                              style: const TextStyle(
                                color: AppColors.danger,
                                fontSize: 12.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  AppButton(
                    text: 'Google orqali davom etish',
                    icon: Icons.g_mobiledata_rounded,
                    isLoading: _isLoading,
                    isFullWidth: true,
                    size: ButtonSize.lg,
                    onPressed: _handleGoogleSignIn,
                  ),

                  if (kDebugMode) ...[
                    const SizedBox(height: 10),
                    AppButton(
                      text: 'Dev Google Verify (Local)',
                      variant: ButtonVariant.outline,
                      isFullWidth: true,
                      onPressed: _isLoading ? null : _handleDevGoogleVerify,
                    ),
                  ],

                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.verified_user_outlined, size: 14, color: AppColors.success),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Xavfsiz Google OAuth 2.0 & JWT sessiya',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
