import { eq, and, or, sql, desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { users, posts, comments, follows, postLikes, bookmarks, userBlocks } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { triggerNotification } from "@/server/modules/notifications/notifications.service";
import type { PostResponse } from "@/server/modules/posts/posts.service";

export interface UserProfileResponse {
  id: string;
  name: string;
  handle: string;
  role: string;
  bio: string;
  location?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  coverPhotoUrl?: string | null;
  socialLinks?: { github?: string; linkedin?: string; twitter?: string; website?: string } | null;
  isPrivate?: boolean;
  dmPermission?: string;
  showOnlineStatus?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorType?: string;
  theme?: string;
  intent?: string;
  verified: boolean;
  isOnboarded: boolean;
  joinedDate: string;
  isSelf: boolean;
  isFollowing: boolean;
  stats: {
    postsCount: number;
    discussionsCount: number;
    repliesCount: number;
    totalDiscussionsEngaged: number;
    followersCount: number;
    followingCount: number;
  };
  posts: PostResponse[];
  discussions: PostResponse[];
}

/**
 * Get full author profile by handle with consolidated live aggregated statistics and posts
 */
export async function getProfileByHandle(
  rawHandle: string,
  currentUserId?: string
): Promise<UserProfileResponse> {
  const cleanHandle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle.trim()}`;
  const unadornedHandle = rawHandle.replace(/^@/, "").trim();

  try {
    const [row] = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        role: users.role,
        bio: users.bio,
        location: users.location,
        website: users.website,
        avatarUrl: users.avatarUrl,
        coverPhotoUrl: users.coverPhotoUrl,
        socialLinks: users.socialLinks,
        isPrivate: users.isPrivate,
        dmPermission: users.dmPermission,
        showOnlineStatus: users.showOnlineStatus,
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorType: users.twoFactorType,
        theme: users.theme,
        intent: users.intent,
        verified: users.verified,
        isOnboarded: users.isOnboarded,
        createdAt: users.createdAt,
        postsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${posts} WHERE ${posts.authorId} = "users"."id" AND ${posts.deletedAt} IS NULL), 0)`,
        commentsReceivedCount: sql<number>`COALESCE((SELECT SUM(${posts.commentsCount})::int FROM ${posts} WHERE ${posts.authorId} = "users"."id" AND ${posts.deletedAt} IS NULL), 0)`,
        discussionsActiveCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${posts} WHERE ${posts.authorId} = "users"."id" AND ${posts.deletedAt} IS NULL AND ${posts.commentsCount} >= 1), 0)`,
        repliesCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${comments} WHERE ${comments.authorId} = "users"."id" AND ${comments.deletedAt} IS NULL), 0)`,
        totalDiscussionsEngaged: sql<number>`COALESCE((SELECT COUNT(DISTINCT ${comments.postId})::int FROM ${comments} WHERE ${comments.authorId} = "users"."id" AND ${comments.deletedAt} IS NULL), 0)`,
        followersCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${follows} WHERE ${follows.followingId} = ${users.id}), 0)`,
        followingCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${follows} WHERE ${follows.followerId} = ${users.id}), 0)`,
        isFollowing: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${currentUserId}::uuid AND ${follows.followingId} = ${users.id})`
          : sql<boolean>`false`,
      })
      .from(users)
      .where(or(eq(users.handle, cleanHandle), eq(users.handle, unadornedHandle)))
      .limit(1);

    if (!row) {
      throw AppError.notFound(`"${cleanHandle}" foydalanuvchisi topilmadi`);
    }

    const isSelf = currentUserId === row.id;
    const isFollowing = isSelf ? false : Boolean(row.isFollowing);

    // Block List Check: If either party blocked the other, hide profile
    if (currentUserId && !isSelf) {
      const [blockRecord] = await db
        .select({ blockerId: userBlocks.blockerId })
        .from(userBlocks)
        .where(
          or(
            and(eq(userBlocks.blockerId, row.id), eq(userBlocks.blockedId, currentUserId)),
            and(eq(userBlocks.blockerId, currentUserId), eq(userBlocks.blockedId, row.id))
          )
        )
        .limit(1);

      if (blockRecord) {
        throw AppError.notFound(`"${cleanHandle}" foydalanuvchisi topilmadi`);
      }
    }

    const monthNames = [
      "yanvar", "fevral", "mart", "aprel", "may", "iyun",
      "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"
    ];
    const joined = `${row.createdAt.getFullYear()}-yil ${monthNames[row.createdAt.getMonth()]}`;

    const isRestrictedPrivate = row.isPrivate && !isSelf && !isFollowing;

    // 1. Fetch user's own published posts (only if not restricted private account)
    let formattedPosts: PostResponse[] = [];
    if (!isRestrictedPrivate) {
      const userPostsRows = await db
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          postType: posts.postType,
          projectUrl: posts.projectUrl,
          projectStage: posts.projectStage,
          lookingFor: posts.lookingFor,
          mediaUrls: posts.mediaUrls,
          readingTimeMinutes: posts.readingTimeMinutes,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          sharesCount: posts.sharesCount,
          viewsCount: posts.viewsCount,
          createdAt: posts.createdAt,
          authorId: users.id,
          authorName: users.name,
          authorHandle: users.handle,
          authorRole: users.role,
          authorAvatarUrl: users.avatarUrl,
          authorVerified: users.verified,
          authorIntent: users.intent,
          isLiked: currentUserId
            ? sql<boolean>`EXISTS(SELECT 1 FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id} AND ${postLikes.userId} = ${currentUserId}::uuid)`
            : sql<boolean>`false`,
          isSaved: currentUserId
            ? sql<boolean>`EXISTS(SELECT 1 FROM ${bookmarks} WHERE ${bookmarks.postId} = ${posts.id} AND ${bookmarks.userId} = ${currentUserId}::uuid)`
            : sql<boolean>`false`,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(and(eq(posts.authorId, row.id), isNull(posts.deletedAt)))
        .orderBy(desc(posts.createdAt));

      formattedPosts = userPostsRows.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        postType: (p.postType as any) || "thought",
        projectUrl: p.projectUrl || null,
        projectStage: (p.projectStage as any) || null,
        lookingFor: (p.lookingFor as any) || null,
        mediaUrls: (p.mediaUrls as string[]) || [],
        readingTimeMinutes: p.readingTimeMinutes,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
        viewsCount: p.viewsCount,
        createdAt: p.createdAt.toISOString(),
        isLiked: Boolean(p.isLiked),
        isSaved: Boolean(p.isSaved),
        author: {
          id: p.authorId,
          name: p.authorName,
          handle: p.authorHandle,
          role: p.authorRole,
          avatarUrl: p.authorAvatarUrl,
          verified: p.authorVerified,
          intent: (p.authorIntent as any) || "none",
        },
      }));
    }

    // 2. Fetch posts with active discussions that user authored or participated in (only if not restricted private)
    let formattedDiscussions: PostResponse[] = [];
    if (!isRestrictedPrivate) {
      const discussionRows = await db
        .selectDistinctOn([posts.id], {
          id: posts.id,
          title: posts.title,
          content: posts.content,
          postType: posts.postType,
          projectUrl: posts.projectUrl,
          projectStage: posts.projectStage,
          lookingFor: posts.lookingFor,
          mediaUrls: posts.mediaUrls,
          readingTimeMinutes: posts.readingTimeMinutes,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          sharesCount: posts.sharesCount,
          viewsCount: posts.viewsCount,
          createdAt: posts.createdAt,
          authorId: users.id,
          authorName: users.name,
          authorHandle: users.handle,
          authorRole: users.role,
          authorAvatarUrl: users.avatarUrl,
          authorVerified: users.verified,
          authorIntent: users.intent,
          isLiked: currentUserId
            ? sql<boolean>`EXISTS(SELECT 1 FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id} AND ${postLikes.userId} = ${currentUserId}::uuid)`
            : sql<boolean>`false`,
          isSaved: currentUserId
            ? sql<boolean>`EXISTS(SELECT 1 FROM ${bookmarks} WHERE ${bookmarks.postId} = ${posts.id} AND ${bookmarks.userId} = ${currentUserId}::uuid)`
            : sql<boolean>`false`,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .leftJoin(comments, eq(comments.postId, posts.id))
        .where(
          and(
            or(
              eq(posts.authorId, row.id),
              eq(comments.authorId, row.id)
            ),
            sql`${posts.commentsCount} >= 1`,
            isNull(posts.deletedAt)
          )
        )
        .orderBy(posts.id, desc(posts.createdAt));

      formattedDiscussions = discussionRows.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        postType: (p.postType as any) || "thought",
        projectUrl: p.projectUrl || null,
        projectStage: (p.projectStage as any) || null,
        lookingFor: (p.lookingFor as any) || null,
        mediaUrls: (p.mediaUrls as string[]) || [],
        readingTimeMinutes: p.readingTimeMinutes,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
        viewsCount: p.viewsCount,
        createdAt: p.createdAt.toISOString(),
        isLiked: Boolean(p.isLiked),
        isSaved: Boolean(p.isSaved),
        author: {
          id: p.authorId,
          name: p.authorName,
          handle: p.authorHandle,
          role: p.authorRole,
          avatarUrl: p.authorAvatarUrl,
          verified: p.authorVerified,
          intent: (p.authorIntent as any) || "none",
        },
      }));
    }

    const totalDiscussionsCount = Math.max(
      Number(row.commentsReceivedCount || 0),
      Number(row.repliesCount || 0),
      formattedDiscussions.length
    );

    return {
      id: row.id,
      name: row.name,
      handle: row.handle,
      role: row.role,
      bio: row.bio || "",
      location: row.location,
      website: row.website,
      avatarUrl: row.avatarUrl,
      coverPhotoUrl: row.coverPhotoUrl,
      socialLinks: row.socialLinks || {},
      isPrivate: Boolean(row.isPrivate),
      dmPermission: row.dmPermission || "everyone",
      showOnlineStatus: Boolean(row.showOnlineStatus),
      twoFactorEnabled: Boolean(row.twoFactorEnabled),
      twoFactorType: row.twoFactorType || "authenticator",
      theme: row.theme || "system",
      intent: row.intent || "none",
      verified: row.verified,
      isOnboarded: Boolean(row.isOnboarded),
      joinedDate: joined,
      isSelf,
      isFollowing,
      stats: {
        postsCount: Number(row.postsCount),
        discussionsCount: totalDiscussionsCount,
        repliesCount: Number(row.repliesCount),
        totalDiscussionsEngaged: Number(row.totalDiscussionsEngaged),
        followersCount: Number(row.followersCount),
        followingCount: Number(row.followingCount),
      },
      posts: formattedPosts,
      discussions: formattedDiscussions,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[USERS] Error fetching profile by handle:", err);
    throw AppError.internal("Foydalanuvchi profilini yuklashda xatolik yuz berdi");
  }
}

/**
 * Toggle follow / unfollow on an author (Prevents self-follow)
 */
export async function toggleFollow(
  targetHandle: string,
  currentUserId: string
): Promise<{ isFollowing: boolean; followersCount: number }> {
  const cleanHandle = targetHandle.startsWith("@") ? targetHandle : `@${targetHandle.trim()}`;
  const unadornedHandle = targetHandle.replace(/^@/, "").trim();

  try {
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.handle, cleanHandle), eq(users.handle, unadornedHandle)))
      .limit(1);

    if (!target) {
      throw AppError.notFound("Muallif topilmadi");
    }

    if (target.id === currentUserId) {
      throw AppError.badRequest("O‘zingizni kuzata olmaysiz");
    }

    // Check if either party blocked the other
    const [blockedRecord] = await db
      .select({ blockerId: userBlocks.blockerId })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, target.id), eq(userBlocks.blockedId, currentUserId)),
          and(eq(userBlocks.blockerId, currentUserId), eq(userBlocks.blockedId, target.id))
        )
      )
      .limit(1);

    if (blockedRecord) {
      throw AppError.forbidden("Bloklangan foydalanuvchi bilan o'zaro aloqa qilish taqiqlangan");
    }

    const [existing] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, target.id)))
      .limit(1);

    let isFollowing = false;
    if (existing) {
      await db
        .delete(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, target.id)));
      isFollowing = false;
    } else {
      await db.insert(follows).values({
        followerId: currentUserId,
        followingId: target.id,
      });
      isFollowing = true;

      // Trigger follow notification asynchronously
      db.select({ name: users.name, handle: users.handle })
        .from(users)
        .where(eq(users.id, currentUserId))
        .limit(1)
        .then(([follower]) => {
          if (follower) {
            triggerNotification({
              recipientId: target.id,
              actorId: currentUserId,
              type: "follow",
              targetId: currentUserId,
              targetType: "user",
              title: "Yangi obunachi",
              message: `${follower.name} (${follower.handle}) sizga obuna bo‘ldi`,
              link: `/dashboard/profile?user=${encodeURIComponent(follower.handle)}`,
            }).catch(() => null);
          }
        })
        .catch(() => null);
    }

    // Get fresh follower count
    const [followersRes] = await db
      .select({ val: sql<number>`COUNT(*)::int` })
      .from(follows)
      .where(eq(follows.followingId, target.id));

    return {
      isFollowing,
      followersCount: followersRes?.val ?? 0,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[USERS] Error toggling follow:", err);
    throw AppError.internal("Kuzatish amalida xatolik yuz berdi");
  }
}

/**
 * Update current user profile
 */
export async function updateProfile(
  userId: string,
  updates: {
    name?: string;
    role?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatarUrl?: string | null;
    coverPhotoUrl?: string | null;
    socialLinks?: { github?: string; linkedin?: string; twitter?: string; website?: string } | null;
    isPrivate?: boolean;
    dmPermission?: string;
    showOnlineStatus?: boolean;
    twoFactorEnabled?: boolean;
    twoFactorType?: string;
    theme?: string;
    intent?: string;
  }
): Promise<void> {
  const cleanUpdates: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
  if (updates.role !== undefined) cleanUpdates.role = updates.role.trim();
  if (updates.bio !== undefined) cleanUpdates.bio = updates.bio.trim();
  if (updates.location !== undefined) cleanUpdates.location = updates.location.trim() || null;
  if (updates.website !== undefined) cleanUpdates.website = updates.website.trim() || null;
  if (updates.avatarUrl !== undefined) cleanUpdates.avatarUrl = updates.avatarUrl?.trim() || null;
  if (updates.coverPhotoUrl !== undefined) cleanUpdates.coverPhotoUrl = updates.coverPhotoUrl?.trim() || null;
  if (updates.socialLinks !== undefined) cleanUpdates.socialLinks = updates.socialLinks;
  if (updates.isPrivate !== undefined) cleanUpdates.isPrivate = updates.isPrivate;
  if (updates.dmPermission !== undefined) cleanUpdates.dmPermission = updates.dmPermission;
  if (updates.showOnlineStatus !== undefined) cleanUpdates.showOnlineStatus = updates.showOnlineStatus;
  if (updates.twoFactorEnabled !== undefined) cleanUpdates.twoFactorEnabled = updates.twoFactorEnabled;
  if (updates.twoFactorType !== undefined) cleanUpdates.twoFactorType = updates.twoFactorType;
  if (updates.theme !== undefined) cleanUpdates.theme = updates.theme;
  if (updates.intent !== undefined) cleanUpdates.intent = updates.intent;

  try {
    await db.update(users).set(cleanUpdates).where(eq(users.id, userId));
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[USERS] Error updating profile:", err);
    throw AppError.internal("Profil ma’lumotlarini yangilashda xatolik yuz berdi");
  }
}

export interface RecommendedThinker {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatarUrl?: string | null;
  bio?: string | null;
  postsCount: number;
}

/**
 * Get recommended thinkers for onboarding.
 * Strict quality criteria:
 * - Platform must have at least 500 total registered users
 * - Authors must have at least 100 verified posts/thoughts
 * If these conditions are not met, returns empty array (skip recommendation step).
 */
export async function getRecommendedThinkers(currentUserId?: string): Promise<{
  eligible: boolean;
  thinkers: RecommendedThinker[];
}> {
  try {
    // 1. Check total users count: must be > 500
    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users);

    const totalUsers = countRow?.total ?? 0;
    if (totalUsers < 500) {
      return { eligible: false, thinkers: [] };
    }

    // 2. Only real authors with at least 100 posts
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        postsCount: sql<number>`count(${posts.id})::int`,
      })
      .from(users)
      .innerJoin(posts, and(eq(posts.authorId, users.id), isNull(posts.deletedAt)))
      .where(currentUserId ? sql`${users.id} != ${currentUserId}::uuid` : sql`true`)
      .groupBy(users.id)
      .having(sql`count(${posts.id}) >= 100`)
      .orderBy(desc(sql`count(${posts.id})`))
      .limit(10);

    return {
      eligible: rows.length > 0,
      thinkers: rows.map((r) => ({
        id: r.id,
        name: r.name,
        handle: r.handle.startsWith("@") ? r.handle : `@${r.handle}`,
        role: r.role,
        avatarUrl: r.avatarUrl,
        bio: r.bio || "",
        postsCount: r.postsCount,
      })),
    };
  } catch (err) {
    console.error("[USERS] Error getting recommended thinkers:", err);
    return { eligible: false, thinkers: [] };
  }
}

