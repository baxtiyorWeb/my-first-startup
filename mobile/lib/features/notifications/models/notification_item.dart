import '../../feed/models/author.dart';

class NotificationItem {
  final String id;
  final String type; // 'like', 'comment', 'follow', 'project', 'system'
  final String title;
  final String message;
  final String? link;
  final bool isRead;
  final DateTime createdAt;
  final Author? actor;

  const NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.link,
    this.isRead = false,
    required this.createdAt,
    this.actor,
  });

  NotificationItem copyWith({bool? isRead}) {
    return NotificationItem(
      id: id,
      type: type,
      title: title,
      message: message,
      link: link,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      actor: actor,
    );
  }

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'system',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      link: json['link'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      actor: json['actor'] != null
          ? Author.fromJson(json['actor'] as Map<String, dynamic>)
          : null,
    );
  }
}
