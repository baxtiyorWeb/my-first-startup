import { eq, and, desc, lt, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, users, postLikes, bookmarks, postViews } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { sanitizeRichContent, stripHtmlToPlainText } from "@/server/common/sanitizer";

export interface PostResponse {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
    intent?: string;
  };
  title?: string | null;
  content: string;
  postType: string;
  projectUrl?: string | null;
  projectStage?: string | null;
  lookingFor?: string | null;
  mediaUrls: string[];
  readingTimeMinutes: number;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

/**
 * Get feed with cursor-based pagination and single-query O(1) author & interaction joins
 */
export async function getFeed(
  cursor?: string,
  limit = 20,
  currentUserId?: string,
  postType?: string
): Promise<{ posts: PostResponse[]; nextCursor: string | null }> {
  try {
    const queryLimit = Math.min(Math.max(limit, 1), 50);

    const conditions = [isNull(posts.deletedAt)];

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)));
    }

    if (postType) {
      conditions.push(eq(posts.postType, postType));
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(queryLimit + 1);

    const hasMore = rows.length > queryLimit;
    const items = hasMore ? rows.slice(0, queryLimit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    const formatted: PostResponse[] = items.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      postType: r.postType || "thought",
      projectUrl: r.projectUrl || null,
      projectStage: r.projectStage || null,
      lookingFor: r.lookingFor || null,
      mediaUrls: (r.mediaUrls as string[]) || [],
      readingTimeMinutes: r.readingTimeMinutes,
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      sharesCount: r.sharesCount,
      viewsCount: r.viewsCount,
      createdAt: r.createdAt.toISOString(),
      isLiked: Boolean(r.isLiked),
      isSaved: Boolean(r.isSaved),
      author: {
        id: r.authorId,
        name: r.authorName,
        handle: r.authorHandle,
        role: r.authorRole,
        avatarUrl: r.authorAvatarUrl,
        verified: r.authorVerified,
        intent: r.authorIntent || "none",
      },
    }));

    return { posts: formatted, nextCursor };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error fetching feed:", err);
    throw AppError.internal("Fikrlar tasmasini yuklashda xatolik yuz berdi");
  }
}

/**
 * Create a new thoughtful post or project showcase
 */
export async function createPost(
  userId: string,
  input: {
    title?: string;
    content: string;
    postType?: string;
    projectUrl?: string | null;
    projectStage?: string | null;
    lookingFor?: string | null;
    mediaUrls?: string[];
  }
): Promise<PostResponse> {
  const plainText = stripHtmlToPlainText(input.content);
  if (plainText.length < 5) {
    throw AppError.validation("Fikr matni kamida 5 ta belgidan iborat bo‘lishi kerak");
  }

  // Sanitize HTML
  const sanitizedContent = sanitizeRichContent(input.content);
  const words = plainText.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 180));
  const sanitizedTitle = input.title ? input.title.trim().slice(0, 300) : null;
  const sanitizedProjectUrl = input.projectUrl ? input.projectUrl.trim().slice(0, 500) : null;
  const sanitizedProjectStage = input.projectStage ? input.projectStage.trim().slice(0, 50) : null;
  const sanitizedLookingFor = input.lookingFor ? input.lookingFor.trim().slice(0, 50) : null;
  const sanitizedMediaUrls = Array.isArray(input.mediaUrls)
    ? input.mediaUrls
        .filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")))
        .slice(0, 3)
    : [];
  const postType = input.postType === "project" ? "project" : "thought";

  try {
    const [inserted] = await db
      .insert(posts)
      .values({
        authorId: userId,
        title: sanitizedTitle,
        content: sanitizedContent,
        postType,
        projectUrl: sanitizedProjectUrl,
        projectStage: sanitizedProjectStage,
        lookingFor: sanitizedLookingFor,
        mediaUrls: sanitizedMediaUrls,
        readingTimeMinutes,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
      })
      .returning();

    // Fetch author details
    const [author] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    return {
      id: inserted.id,
      title: inserted.title,
      content: inserted.content,
      postType: inserted.postType || "thought",
      projectUrl: inserted.projectUrl || null,
      projectStage: inserted.projectStage || null,
      lookingFor: inserted.lookingFor || null,
      mediaUrls: (inserted.mediaUrls as string[]) || [],
      readingTimeMinutes: inserted.readingTimeMinutes,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      createdAt: inserted.createdAt.toISOString(),
      isLiked: false,
      isSaved: false,
      author: {
        id: author.id,
        name: author.name,
        handle: author.handle,
        role: author.role,
        avatarUrl: author.avatarUrl,
        verified: author.verified,
        intent: author.intent || "none",
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error creating post:", err);
    throw AppError.internal("Fikrni saqlashda xatolik yuz berdi");
  }
}

/**
 * Delete a post (BOLA / IDOR protected)
 */
export async function deletePost(postId: string, userId: string): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!existing) {
      throw AppError.notFound("O‘chirilmoqchi bo‘lgan fikr topilmadi");
    }

    // BOLA/IDOR check: user must be the author
    if (existing.authorId !== userId) {
      throw AppError.forbidden("Siz faqat o‘zingiz yozgan fikrlarni o‘chira olasiz");
    }

    // Soft delete
    await db
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(eq(posts.id, postId));
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error deleting post:", err);
    throw AppError.internal("Fikrni o‘chirishda xatolik yuz berdi");
  }
}

/**
 * Get a single post by ID with author and viewer interaction flags
 */
export async function getPostById(
  postId: string,
  currentUserId?: string
): Promise<PostResponse> {
  try {
    const [row] = await db
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
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!row) {
      throw AppError.notFound("Fikr topilmadi");
    }

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      postType: row.postType || "thought",
      projectUrl: row.projectUrl || null,
      projectStage: row.projectStage || null,
      lookingFor: row.lookingFor || null,
      mediaUrls: (row.mediaUrls as string[]) || [],
      readingTimeMinutes: row.readingTimeMinutes,
      likesCount: row.likesCount,
      commentsCount: row.commentsCount,
      sharesCount: row.sharesCount,
      viewsCount: row.viewsCount,
      createdAt: row.createdAt.toISOString(),
      isLiked: Boolean(row.isLiked),
      isSaved: Boolean(row.isSaved),
      author: {
        id: row.authorId,
        name: row.authorName,
        handle: row.authorHandle,
        role: row.authorRole,
        avatarUrl: row.authorAvatarUrl,
        verified: row.authorVerified,
        intent: row.authorIntent || "none",
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error fetching post by id:", err);
    throw AppError.internal("Fikrni yuklashda xatolik yuz berdi");
  }
}

/**
 * Record a post view with a 1-hour deduplication window per viewer
 */
export async function recordPostView(
  postId: string,
  viewerId: string
): Promise<{ incremented: boolean; viewsCount: number }> {
  try {
    const [post] = await db
      .select({ id: posts.id, viewsCount: posts.viewsCount })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!post) {
      throw AppError.notFound("Fikr topilmadi");
    }

    // 1-hour deduplication window:
    // If this viewer viewed this post within the last 1 hour, don't increment
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [recentView] = await db
      .select()
      .from(postViews)
      .where(
        and(
          eq(postViews.postId, postId),
          eq(postViews.viewerId, viewerId),
          sql`${postViews.viewedAt} >= ${oneHourAgo}`
        )
      )
      .orderBy(desc(postViews.viewedAt))
      .limit(1);

    if (recentView) {
      return { incremented: false, viewsCount: post.viewsCount };
    }

    // Insert new view row and atomically increment posts.viewsCount
    await db.transaction(async (tx) => {
      await tx.insert(postViews).values({ postId, viewerId });
      await tx
        .update(posts)
        .set({ viewsCount: sql`${posts.viewsCount} + 1` })
        .where(eq(posts.id, postId));
    });

    const [updated] = await db
      .select({ viewsCount: posts.viewsCount })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    return { incremented: true, viewsCount: updated?.viewsCount ?? post.viewsCount + 1 };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error recording post view:", err);
    throw AppError.internal("Ko‘rishlar sonini yangilashda xatolik yuz berdi");
  }
}

/**
 * Toggle like on a post (Idempotent atomic update)
 */
export async function togglePostLike(
  postId: string,
  userId: string
): Promise<{ isLiked: boolean; likesCount: number }> {
  try {
    const [existingLike] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);

    if (existingLike) {
      // Unlike
      await db.transaction(async (tx) => {
        await tx
          .delete(postLikes)
          .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
        await tx
          .update(posts)
          .set({ likesCount: sql`GREATEST(0, ${posts.likesCount} - 1)` })
          .where(eq(posts.id, postId));
      });

      const [updated] = await db
        .select({ count: posts.likesCount })
        .from(posts)
        .where(eq(posts.id, postId));
      return { isLiked: false, likesCount: updated?.count ?? 0 };
    } else {
      // Like
      await db.transaction(async (tx) => {
        await tx.insert(postLikes).values({ postId, userId });
        await tx
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} + 1` })
          .where(eq(posts.id, postId));
      });

      const [updated] = await db
        .select({ count: posts.likesCount })
        .from(posts)
        .where(eq(posts.id, postId));
      return { isLiked: true, likesCount: updated?.count ?? 1 };
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error toggling post like:", err);
    throw AppError.internal("Like amalini bajarishda xatolik yuz berdi");
  }
}

/**
 * Toggle bookmark on a post (Idempotent update)
 */
export async function togglePostBookmark(
  postId: string,
  userId: string
): Promise<{ isSaved: boolean }> {
  try {
    const [existing] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)))
      .limit(1);

    if (existing) {
      // Remove bookmark
      await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)));
      return { isSaved: false };
    } else {
      // Add bookmark
      await db.insert(bookmarks).values({ postId, userId });
      return { isSaved: true };
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error toggling bookmark:", err);
    throw AppError.internal("Saqlash amalini bajarishda xatolik yuz berdi");
  }
}
