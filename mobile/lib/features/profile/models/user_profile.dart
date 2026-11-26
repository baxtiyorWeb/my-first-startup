class UserProfile {
  final String id;
  final String name;
  final String handle;
  final String role;
  final String bio;
  final String? avatarUrl;
  final String? coverPhotoUrl;
  final String? location;
  final String? website;
  final bool verified;
  final String intent;
  final DateTime joinedDate;
  final int postsCount;
  final int discussionsCount;
  final int followersCount;
  final int followingCount;
  final bool isPrivate;
  final String dmPermission; // 'everyone' | 'followed' | 'nobody'
  final bool showOnlineStatus;
  final bool twoFactorEnabled;

  const UserProfile({
    required this.id,
    required this.name,
    required this.handle,
    required this.role,
    required this.bio,
    this.avatarUrl,
    this.coverPhotoUrl,
    this.location,
    this.website,
    this.verified = true,
    this.intent = 'open_to_work',
    required this.joinedDate,
    this.postsCount = 8,
    this.discussionsCount = 24,
    this.followersCount = 128,
    this.followingCount = 64,
    this.isPrivate = false,
    this.dmPermission = 'everyone',
    this.showOnlineStatus = true,
    this.twoFactorEnabled = false,
  });

  String get formattedHandle => handle.startsWith('@') ? handle : '@$handle';

  UserProfile copyWith({
    String? name,
    String? handle,
    String? role,
    String? bio,
    String? avatarUrl,
    String? coverPhotoUrl,
    String? location,
    String? website,
    bool? verified,
    String? intent,
    int? postsCount,
    int? discussionsCount,
    int? followersCount,
    int? followingCount,
    bool? isPrivate,
    String? dmPermission,
    bool? showOnlineStatus,
    bool? twoFactorEnabled,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      handle: handle ?? this.handle,
      role: role ?? this.role,
      bio: bio ?? this.bio,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      coverPhotoUrl: coverPhotoUrl ?? this.coverPhotoUrl,
      location: location ?? this.location,
      website: website ?? this.website,
      verified: verified ?? this.verified,
      intent: intent ?? this.intent,
      joinedDate: joinedDate,
      postsCount: postsCount ?? this.postsCount,
      discussionsCount: discussionsCount ?? this.discussionsCount,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      isPrivate: isPrivate ?? this.isPrivate,
      dmPermission: dmPermission ?? this.dmPermission,
      showOnlineStatus: showOnlineStatus ?? this.showOnlineStatus,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
    );
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    // `/api/auth/session` returns counters under `stats`; `/api/users/[handle]`
    // returns the same nested shape. Accept flat keys for older payloads.
    final stats = json['stats'] as Map<String, dynamic>?;
    return UserProfile(
      id: (json['id'] ?? json['userId'] ?? '').toString(),
      name: json['name'] as String? ?? 'Foydalanuvchi',
      handle: (json['handle'] as String? ?? 'user').replaceFirst('@', ''),
      role: json['role'] as String? ?? 'Go-getter',
      bio: json['bio'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      coverPhotoUrl: json['coverPhotoUrl'] as String?,
      location: json['location'] as String?,
      website: json['website'] as String?,
      verified: json['verified'] as bool? ?? false,
      intent: json['intent'] as String? ?? 'none',
      joinedDate: json['joinedDate'] != null || json['createdAt'] != null
          ? DateTime.tryParse((json['joinedDate'] ?? json['createdAt']).toString()) ?? DateTime.now()
          : DateTime.now(),
      postsCount:
          (json['postsCount'] as int?) ?? (stats?['postsCount'] as int?) ?? 0,
      discussionsCount: (json['discussionsCount'] as int?) ??
          (stats?['discussionsCount'] as int?) ??
          0,
      followersCount:
          (json['followersCount'] as int?) ?? (stats?['followersCount'] as int?) ?? 0,
      followingCount: (json['followingCount'] as int?) ??
          (stats?['followingCount'] as int?) ??
          0,
      isPrivate: json['isPrivate'] as bool? ?? false,
      dmPermission: json['dmPermission'] as String? ?? 'everyone',
      showOnlineStatus: json['showOnlineStatus'] as bool? ?? true,
      twoFactorEnabled: json['twoFactorEnabled'] as bool? ?? false,
    );
  }
}
