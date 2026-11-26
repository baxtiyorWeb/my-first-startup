class Author {
  final String id;
  final String name;
  final String handle;
  final String role;
  final String? avatarUrl;
  final bool verified;
  final String? intent;
  final bool isFollowing;

  const Author({
    required this.id,
    required this.name,
    required this.handle,
    required this.role,
    this.avatarUrl,
    this.verified = false,
    this.intent = 'none',
    this.isFollowing = false,
  });

  String get formattedHandle => handle.startsWith('@') ? handle : '@$handle';

  factory Author.fromJson(Map<String, dynamic> json) {
    return Author(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Noma\'lum',
      handle: json['handle'] as String? ?? 'user',
      role: json['role'] as String? ?? 'Go-getter',
      avatarUrl: json['avatarUrl'] as String?,
      verified: json['verified'] as bool? ?? false,
      intent: json['intent'] as String? ?? 'none',
      isFollowing: json['isFollowing'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'handle': handle,
      'role': role,
      'avatarUrl': avatarUrl,
      'verified': verified,
      'intent': intent,
      'isFollowing': isFollowing,
    };
  }

  Author copyWith({
    String? id,
    String? name,
    String? handle,
    String? role,
    String? avatarUrl,
    bool? verified,
    String? intent,
    bool? isFollowing,
  }) {
    return Author(
      id: id ?? this.id,
      name: name ?? this.name,
      handle: handle ?? this.handle,
      role: role ?? this.role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      verified: verified ?? this.verified,
      intent: intent ?? this.intent,
      isFollowing: isFollowing ?? this.isFollowing,
    );
  }
}
