import 'package:flutter/services.dart';
import '../../../core/utils/formatters.dart';
import '../models/post.dart';

class ShareDispatchResult {
  final bool usedNativeSheet;
  final String sharedUrl;

  const ShareDispatchResult({
    required this.usedNativeSheet,
    required this.sharedUrl,
  });
}

/// Dispatches native OS share sheet with canonical Geters post URL & snippet,
/// safely falling back to clipboard copy on unsupported environments.
class PostActionService {
  static const MethodChannel _shareChannel =
      MethodChannel('com.geters.mobile/share');

  String canonicalPostUrl(Post post) =>
      'https://thegogetters.uz/dashboard/posts/${post.id}';

  Future<ShareDispatchResult> sharePost(Post post) async {
    final url = canonicalPostUrl(post);
    final title = (post.title ?? '').trim();
    final excerpt = ContentUtils.excerpt(
      ContentUtils.stripHtml(post.content),
      maxLength: 100,
    );
    final headline = title.isNotEmpty
        ? title
        : (excerpt.isNotEmpty ? excerpt : '${post.author.name} posti');
    final text = '$headline\n$url';

    try {
      final launched = await _shareChannel.invokeMethod<bool>('shareText', {
        'text': text,
        'subject': 'Geters · ${post.author.name}',
      });
      if (launched == true) {
        return ShareDispatchResult(usedNativeSheet: true, sharedUrl: url);
      }
    } catch (_) {
      // Fallback to clipboard copy in test harness or unsupported targets
    }

    await Clipboard.setData(ClipboardData(text: url));
    return ShareDispatchResult(usedNativeSheet: false, sharedUrl: url);
  }
}
