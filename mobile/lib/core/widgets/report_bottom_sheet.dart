import 'package:material_ui/material_ui.dart';
import '../constants/api_constants.dart';
import '../network/api_client.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'app_button.dart';
import 'keyboard_inset_padding.dart';

class ReportBottomSheet extends StatefulWidget {
  final ApiClient? apiClient;
  final String targetId;
  final String targetType;
  final String authorName;
  final String snippet;

  const ReportBottomSheet({
    super.key,
    required this.targetId,
    required this.targetType,
    required this.authorName,
    required this.snippet,
    this.apiClient,
  });

  static Future<void> show(
    BuildContext context, {
    required String targetId,
    required String targetType,
    required String authorName,
    required String snippet,
    ApiClient? apiClient,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReportBottomSheet(
        targetId: targetId,
        targetType: targetType,
        authorName: authorName,
        snippet: snippet,
        apiClient: apiClient,
      ),
    );
  }

  @override
  State<ReportBottomSheet> createState() => _ReportBottomSheetState();
}

class _ReportBottomSheetState extends State<ReportBottomSheet> {
  String _selectedReason = 'spam';
  final TextEditingController _noteController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  static const List<Map<String, String>> _reasons = [
    {'id': 'spam', 'label': 'Spam yoki reklama'},
    {'id': 'harassment', 'label': 'Haqorat yoki tajovuz'},
    {'id': 'misinformation', 'label': 'Yolg\'on ma\'lumot'},
    {'id': 'inappropriate', 'label': 'Nomaqbul kontent'},
    {'id': 'child_safety', 'label': 'Bolaga nisbatan zo\'ravonlik'},
    {'id': 'other', 'label': 'Boshqa sabab'},
  ];

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submitReport() async {
    if (_isSubmitting) return;
    FocusScope.of(context).unfocus();

    final apiClient = widget.apiClient;
    if (apiClient == null) {
      setState(() {
        _errorMessage =
            'Serverga ulanish mavjud emas. Iltimos, qaytadan kiring.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await apiClient.post(
        ApiConstants.reportsEndpoint,
        body: {
          'targetId': widget.targetId,
          'targetType': widget.targetType,
          'reason': _selectedReason,
          if (_noteController.text.trim().isNotEmpty)
            'context': _noteController.text.trim(),
        },
      );

      if (!mounted) return;
      navigator.pop();
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Shikoyatingiz moderatorlarga yuborildi. Rahmat!'),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = e is ApiException
            ? e.message
            : 'Shikoyatni yuborishda xatolik yuz berdi. Keyinroq qayta urinib ko\'ring.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final maxHeight = MediaQuery.sizeOf(context).height * 0.88;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return KeyboardInsetPadding(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppTheme.radiusXl),
            ),
            border: Border(top: BorderSide(color: borderColor)),
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
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
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(Icons.flag_outlined, size: 20, color: AppColors.danger),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Shikoyat yuborish',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: _isSubmitting
                            ? null
                            : () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close_rounded, size: 19),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.surfaceDarkElevated
                          : AppColors.surfaceLightElevated,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      border: Border.all(color: borderColor),
                    ),
                    child: Text(
                      '${widget.authorName}: "${widget.snippet}"',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark
                            ? AppColors.textSecondaryDark
                            : AppColors.textSecondaryLight,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  ..._reasons.map((r) {
                    final isSelected = _selectedReason == r['id'];
                    return InkWell(
                      onTap: _isSubmitting
                          ? null
                          : () => setState(() => _selectedReason = r['id']!),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: 9,
                          horizontal: 6,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isSelected
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_unchecked,
                              size: 19,
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark
                                      ? AppColors.textMutedDark
                                      : AppColors.textMutedLight),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                r['label']!,
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: isSelected
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                  color: isDark
                                      ? AppColors.textPrimaryDark
                                      : AppColors.textPrimaryLight,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _noteController,
                    maxLines: 2,
                    minLines: 1,
                    enabled: !_isSubmitting,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submitReport(),
                    decoration: const InputDecoration(
                      hintText: 'Qo\'shimcha izoh (ixtiyoriy)...',
                      isDense: true,
                    ),
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _errorMessage!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.danger,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  AppButton(
                    text: _isSubmitting
                        ? 'Yuborilmoqda...'
                        : 'Shikoyatni yuborish',
                    variant: ButtonVariant.danger,
                    isFullWidth: true,
                    onPressed: _isSubmitting ? null : _submitReport,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Shikoyatlar 24 soat ichida ko\'rib chiqiladi. Bolalar xavfsizligiga oid shikoyatlar ustuvor.',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark
                          ? AppColors.textMutedDark
                          : AppColors.textMutedLight,
                    ),
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
