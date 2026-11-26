import 'author.dart';

class Comment {
  final String id;
  final String postId;
  final Author author;
  final String content;
  final DateTime createdAt;
  final int likesCount;
  final bool isLiked;
  final String? parentId;
  final List<Comment> replies;

  const Comment({
    required this.id,
    required this.postId,
    required this.author,
    required this.content,
    required this.createdAt,
    this.likesCount = 0,
    this.isLiked = false,
    this.parentId,
    this.replies = const [],
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] as String? ?? '',
      postId: json['postId'] as String? ?? '',
      author: json['author'] != null
          ? Author.fromJson(json['author'] as Map<String, dynamic>)
          : const Author(id: '', name: 'Noma\'lum', handle: 'user', role: ''),
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      likesCount: json['likesCount'] as int? ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
      parentId: json['parentId'] as String?,
      replies: (json['replies'] as List<dynamic>?)
              ?.map((e) => Comment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'postId': postId,
      'author': author.toJson(),
      'content': content,
      'createdAt': createdAt.toIso8601String(),
      'likesCount': likesCount,
      'isLiked': isLiked,
      'parentId': parentId,
      'replies': replies.map((e) => e.toJson()).toList(),
    };
  }

  Comment copyWith({
    String? id,
    String? postId,
    Author? author,
    String? content,
    DateTime? createdAt,
    int? likesCount,
    bool? isLiked,
    String? parentId,
    List<Comment>? replies,
  }) {
    return Comment(
      id: id ?? this.id,
      postId: postId ?? this.postId,
      author: author ?? this.author,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
      likesCount: likesCount ?? this.likesCount,
      isLiked: isLiked ?? this.isLiked,
      parentId: parentId ?? this.parentId,
      replies: replies ?? this.replies,
    );
  }
}
