/// Canonical backend-backed tag model shared across feed, create-post, and search.
class TagItem {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String status;
  final bool isOfficial;
  final int usageCount;
  final int recentUsageCount;
  final int engagementScore;
  final DateTime? lastUsedAt;
  final DateTime? createdAt;

  const TagItem({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.status = 'active',
    this.isOfficial = false,
    this.usageCount = 0,
    this.recentUsageCount = 0,
    this.engagementScore = 0,
    this.lastUsedAt,
    this.createdAt,
  });

  factory TagItem.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] as String? ?? '').trim();
    final rawSlug = (json['slug'] as String? ?? '').trim();
    final fallbackSlug = name.toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    return TagItem(
      id: (json['id'] as String? ?? '').trim(),
      name: name,
      slug: rawSlug.isNotEmpty ? rawSlug : fallbackSlug,
      description: json['description'] as String?,
      status: (json['status'] as String? ?? 'active').trim(),
      isOfficial: json['isOfficial'] as bool? ?? false,
      usageCount: (json['usageCount'] as num?)?.toInt() ?? 0,
      recentUsageCount: (json['recentUsageCount'] as num?)?.toInt() ?? 0,
      engagementScore: (json['engagementScore'] as num?)?.toInt() ?? 0,
      lastUsedAt: _parseDate(json['lastUsedAt']),
      createdAt: _parseDate(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        if (description != null) 'description': description,
        'status': status,
        'isOfficial': isOfficial,
        'usageCount': usageCount,
        'recentUsageCount': recentUsageCount,
        'engagementScore': engagementScore,
        if (lastUsedAt != null) 'lastUsedAt': lastUsedAt!.toIso8601String(),
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      };

  static DateTime? _parseDate(Object? raw) {
    if (raw is! String || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  /// Key used for deduplication and backend filter matching.
  String get canonicalKey =>
      id.isNotEmpty ? id : 'slug:${slug.toLowerCase()}';

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! TagItem) return false;
    if (id.isNotEmpty && other.id.isNotEmpty) return id == other.id;
    return slug.toLowerCase() == other.slug.toLowerCase();
  }

  @override
  int get hashCode =>
      id.isNotEmpty ? id.hashCode : slug.toLowerCase().hashCode;
}

/// Response from `/api/tags/suggest` or `/api/tags`.
class TagSuggestResponse {
  final String query;
  final List<TagItem> items;
  final bool exactMatch;
  final bool canCreate;
  final String? normalizedCandidate;

  const TagSuggestResponse({
    required this.query,
    required this.items,
    required this.exactMatch,
    required this.canCreate,
    this.normalizedCandidate,
  });

  factory TagSuggestResponse.empty([String query = '']) => TagSuggestResponse(
        query: query,
        items: const [],
        exactMatch: false,
        canCreate: false,
      );
}
