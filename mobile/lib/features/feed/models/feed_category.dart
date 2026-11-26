/// Backend-driven content category (e.g. articles, videos, news topics).
class FeedCategory {
  final String slug;
  final String name;
  final int count;

  const FeedCategory({
    required this.slug,
    required this.name,
    required this.count,
  });

  factory FeedCategory.fromJson(Map<String, dynamic> json) {
    final slug = (json['slug'] as String?)?.trim() ?? '';
    return FeedCategory(
      slug: slug,
      name: (json['name'] as String?)?.trim().isNotEmpty == true
          ? (json['name'] as String).trim()
          : slug,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}
