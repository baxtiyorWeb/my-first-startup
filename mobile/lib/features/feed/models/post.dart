import '../../tags/models/tag_item.dart';
import 'author.dart';

class Post {
  final String id;
  final Author author;
  final String? title;
  final String content;
  final String postType; // 'thought' | 'project'
  final String contentKind; // 'thought' | 'article' | 'video' | 'news'
  final String? videoUrl;
  final int? videoDurationSeconds;
  final bool isShort;
  final String? projectUrl;
  final String? projectStage; // 'idea' | 'mvp' | 'launched' | 'scaling'
  final String? lookingFor; // 'cofounder' | 'feedback' | 'investment' | 'team'
  final List<String> mediaUrls;
  final String? topic;
  final int readingTimeMinutes;
  final DateTime createdAt;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final int viewsCount;
  final bool isLiked;
  final bool isSaved;
  final List<String> tags;
  final List<TagItem> tagItems;

  const Post({
    required this.id,
    required this.author,
    this.title,
    required this.content,
    this.postType = 'thought',
    this.contentKind = 'thought',
    this.videoUrl,
    this.videoDurationSeconds,
    this.isShort = false,
    this.projectUrl,
    this.projectStage,
    this.lookingFor,
    this.mediaUrls = const [],
    this.topic,
    this.readingTimeMinutes = 1,
    required this.createdAt,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.viewsCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    this.tags = const [],
    this.tagItems = const [],
  });

  bool get isProject => postType == 'project';

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id'] as String? ?? '',
      author: json['author'] != null
          ? Author.fromJson(json['author'] as Map<String, dynamic>)
          : const Author(id: '', name: 'Noma\'lum', handle: 'user', role: ''),
      title: json['title'] as String?,
      content: json['content'] as String? ?? '',
      postType: json['postType'] as String? ?? 'thought',
      contentKind: json['contentKind'] as String? ?? 'thought',
      videoUrl: json['videoUrl'] as String?,
      videoDurationSeconds: json['videoDurationSeconds'] as int?,
      isShort: json['isShort'] as bool? ?? false,
      projectUrl: json['projectUrl'] as String?,
      projectStage: json['projectStage'] as String?,
      lookingFor: json['lookingFor'] as String?,
      mediaUrls: (json['mediaUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      // The API exposes the editorial topic as `category`; older cached rows
      // from previous app versions used `topic`.
      topic: (json['topic'] as String?) ?? (json['category'] as String?),
      readingTimeMinutes: json['readingTimeMinutes'] as int? ?? 1,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      likesCount: json['likesCount'] as int? ?? 0,
      commentsCount: json['commentsCount'] as int? ?? 0,
      sharesCount: json['sharesCount'] as int? ?? 0,
      viewsCount: json['viewsCount'] as int? ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
      isSaved: json['isSaved'] as bool? ?? false,
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      tagItems: (json['tagItems'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(TagItem.fromJson)
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author': author.toJson(),
      'title': title,
      'content': content,
      'postType': postType,
      'contentKind': contentKind,
      'videoUrl': videoUrl,
      'videoDurationSeconds': videoDurationSeconds,
      'isShort': isShort,
      'projectUrl': projectUrl,
      'projectStage': projectStage,
      'lookingFor': lookingFor,
      'mediaUrls': mediaUrls,
      'topic': topic,
      'readingTimeMinutes': readingTimeMinutes,
      'createdAt': createdAt.toIso8601String(),
      'likesCount': likesCount,
      'commentsCount': commentsCount,
      'sharesCount': sharesCount,
      'viewsCount': viewsCount,
      'isLiked': isLiked,
      'isSaved': isSaved,
      'tags': tags,
      'tagItems': tagItems.map((t) => t.toJson()).toList(),
    };
  }

  Post copyWith({
    String? id,
    Author? author,
    String? title,
    String? content,
    String? postType,
    String? contentKind,
    String? videoUrl,
    int? videoDurationSeconds,
    bool? isShort,
    String? projectUrl,
    String? projectStage,
    String? lookingFor,
    List<String>? mediaUrls,
    String? topic,
    int? readingTimeMinutes,
    DateTime? createdAt,
    int? likesCount,
    int? commentsCount,
    int? sharesCount,
    int? viewsCount,
    bool? isLiked,
    bool? isSaved,
    List<String>? tags,
    List<TagItem>? tagItems,
  }) {
    return Post(
      id: id ?? this.id,
      author: author ?? this.author,
      title: title ?? this.title,
      content: content ?? this.content,
      postType: postType ?? this.postType,
      contentKind: contentKind ?? this.contentKind,
      videoUrl: videoUrl ?? this.videoUrl,
      videoDurationSeconds: videoDurationSeconds ?? this.videoDurationSeconds,
      isShort: isShort ?? this.isShort,
      projectUrl: projectUrl ?? this.projectUrl,
      projectStage: projectStage ?? this.projectStage,
      lookingFor: lookingFor ?? this.lookingFor,
      mediaUrls: mediaUrls ?? this.mediaUrls,
      topic: topic ?? this.topic,
      readingTimeMinutes: readingTimeMinutes ?? this.readingTimeMinutes,
      createdAt: createdAt ?? this.createdAt,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      sharesCount: sharesCount ?? this.sharesCount,
      viewsCount: viewsCount ?? this.viewsCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
      tags: tags ?? this.tags,
      tagItems: tagItems ?? this.tagItems,
    );
  }
}
