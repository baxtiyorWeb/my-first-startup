abstract class NumberFormatter {
  static String compact(int count) {
    if (count >= 1000000) {
      final val = (count / 1000000).toStringAsFixed(1);
      return '${val.endsWith('.0') ? val.substring(0, val.length - 2) : val}M';
    }
    if (count >= 1000) {
      final val = (count / 1000).toStringAsFixed(1);
      return '${val.endsWith('.0') ? val.substring(0, val.length - 2) : val}K';
    }
    return count.toString();
  }
}

abstract class ContentUtils {
  static String stripHtml(String raw) {
    return raw
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .trim();
  }

  static String excerpt(String raw, {int maxLength = 120}) {
    final clean = stripHtml(raw).replaceAll(RegExp(r'\s+'), ' ');
    if (clean.length <= maxLength) return clean;
    return '${clean.substring(0, maxLength)}...';
  }

  static List<String> extractDisplayTags({
    required List<String> explicitTags,
    required String content,
    String? topic,
    String? projectStage,
  }) {
    final tags = <String>{};
    for (final t in explicitTags) {
      if (t.trim().isNotEmpty) {
        tags.add(t.startsWith('#') ? t.trim() : '#${t.trim()}');
      }
    }
    if (tags.isEmpty) {
      final matches = RegExp(r'#[a-zA-Z0-9_\u0400-\u04FF\u0100-\u024F]+')
          .allMatches(content);
      for (final m in matches) {
        if (m.group(0) != null) tags.add(m.group(0)!);
        if (tags.length >= 4) break;
      }
    }
    if (tags.isEmpty && topic != null && topic.isNotEmpty) {
      tags.add('#${topic.replaceAll(' ', '')}');
    }
    if (projectStage != null && projectStage.isNotEmpty) {
      tags.add('#${projectStage.toUpperCase()}');
    }
    return tags.take(4).toList();
  }
}
