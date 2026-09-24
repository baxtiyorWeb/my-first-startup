import { eq, and, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { users, posts, comments, follows } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";

export interface UserProfileResponse {
  id: string;
  name: string;
  handle: string;
  role: string;
  bio: string;
  location?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  verified: boolean;
  isOnboarded: boolean;
  joinedDate: string;
  isSelf: boolean;
  isFollowing: boolean;
  stats: {
    postsCount: number;
    discussionsCount: number;
    repliesCount: number;
    followersCount: number;
    followingCount: number;
  };
}

/**
 * Get full author profile by handle with consolidated live aggregated statistics in a single SQL query
 */
export async function getProfileByHandle(
  rawHandle: string,
  currentUserId?: string
): Promise<UserProfileResponse> {
  const cleanHandle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle.trim()}`;

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
        verified: users.verified,
        isOnboarded: users.isOnboarded,
        createdAt: users.createdAt,
        postsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${posts} WHERE ${posts.authorId} = ${users.id} AND ${posts.deletedAt} IS NULL), 0)`,
        discussionsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${posts} WHERE ${posts.authorId} = ${users.id} AND ${posts.deletedAt} IS NULL AND ${posts.commentsCount} >= 10), 0)`,
        repliesCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${comments} WHERE ${comments.authorId} = ${users.id} AND ${comments.deletedAt} IS NULL), 0)`,
        followersCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${follows} WHERE ${follows.followingId} = ${users.id}), 0)`,
        followingCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${follows} WHERE ${follows.followerId} = ${users.id}), 0)`,
        isFollowing: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${currentUserId}::uuid AND ${follows.followingId} = ${users.id})`
          : sql<boolean>`false`,
      })
      .from(users)
      .where(eq(users.handle, cleanHandle))
      .limit(1);

    if (!row) {
      throw AppError.notFound(`"${cleanHandle}" foydalanuvchisi topilmadi`);
    }

    const isSelf = currentUserId === row.id;
    const isFollowing = Boolean(row.isFollowing);

    const monthNames = [
      "yanvar", "fevral", "mart", "aprel", "may", "iyun",
      "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"
    ];
    const joined = `${row.createdAt.getFullYear()}-yil ${monthNames[row.createdAt.getMonth()]}`;

    return {
      id: row.id,
      name: row.name,
      handle: row.handle,
      role: row.role,
      bio: row.bio || "",
      location: row.location,
      website: row.website,
      avatarUrl: row.avatarUrl,
      verified: row.verified,
      isOnboarded: Boolean(row.isOnboarded),
      joinedDate: joined,
      isSelf,
      isFollowing,
      stats: {
        postsCount: Number(row.postsCount),
        discussionsCount: Number(row.discussionsCount),
        repliesCount: Number(row.repliesCount),
        followersCount: Number(row.followersCount),
        followingCount: Number(row.followingCount),
      },
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

  try {
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, cleanHandle))
      .limit(1);

    if (!target) {
      throw AppError.notFound("Muallif topilmadi");
    }

    if (target.id === currentUserId) {
      throw AppError.badRequest("O‘zingizni kuzata olmaysiz");
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
  }
): Promise<void> {
  const cleanUpdates: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
  if (updates.role !== undefined) cleanUpdates.role = updates.role.trim();
  if (updates.bio !== undefined) cleanUpdates.bio = updates.bio.trim();
  if (updates.location !== undefined) cleanUpdates.location = updates.location.trim() || null;
  if (updates.website !== undefined) cleanUpdates.website = updates.website.trim() || null;
  if (updates.avatarUrl !== undefined) cleanUpdates.avatarUrl = updates.avatarUrl?.trim() || null;

  try {
    await db.update(users).set(cleanUpdates).where(eq(users.id, userId));
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[USERS] Error updating profile:", err);
    throw AppError.internal("Profil ma’lumotlarini yangilashda xatolik yuz berdi");
  }
}
