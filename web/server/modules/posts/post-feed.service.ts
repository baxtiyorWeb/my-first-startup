import { eq, and, or, desc, lt, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  posts,
  users,
  postLikes,
  bookmarks,
  follows,
  userBlocks,
} from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { feedCache } from "@/server/common/server-cache";
import {
  buildActivePostTagFilterCondition,
  loadActiveTagsForPosts,
} from "@/server/modules/tags/tags.service";
import {
  UUID_REGEX,
  mapPostRowToResponse,
  type PostResponse,
  type RawPostFeedRow,
} from "./post.types";

function toSafeUserId(userId?: string): string | undefined {
  return userId && UUID_REGEX.test(userId) ? userId : undefined;
}

function buildVisibilityConditions(safeUserId?: string) {
  if (!safeUserId) {
    return [eq(users.isPrivate, false)];
  }
  return [
    sql`NOT EXISTS (
      SELECT 1 FROM ${userBlocks}
      WHERE (${userBlocks.blockerId} = ${posts.authorId} AND ${userBlocks.blockedId} = ${safeUserId}::uuid)
         OR (${userBlocks.blockerId} = ${safeUserId}::uuid AND ${userBlocks.blockedId} = ${posts.authorId})
    )`,
    sql`(${users.isPrivate} = false
      OR ${posts.authorId} = ${safeUserId}::uuid
      OR EXISTS (SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${safeUserId}::uuid AND ${follows.followingId} = ${posts.authorId})
    )`,
  ];
}

function buildPostSelectFields(safeUserId?: string, includeTranscript = false) {
  return {
    id: posts.id,
    slug: posts.slug,
    title: posts.title,
    content: posts.content,
    postType: posts.postType,
    contentKind: posts.contentKind,
    status: posts.status,
    isIndexable: posts.isIndexable,
    locale: posts.locale,
    category: posts.category,
    tags: posts.tags,
    coverImageUrl: posts.coverImageUrl,
    coverImageAlt: posts.coverImageAlt,
    seoTitle: posts.seoTitle,
    seoDescription: posts.seoDescription,
    focusKeyword: posts.focusKeyword,
    canonicalUrl: posts.canonicalUrl,
    videoUrl: posts.videoUrl,
    youtubeVideoId: posts.youtubeVideoId,
    bunnyVideoId: posts.bunnyVideoId,
    videoDurationSeconds: posts.videoDurationSeconds,
    videoChapters: posts.videoChapters,
    transcript: includeTranscript ? posts.transcript : sql<null>`NULL`,
    publishedAt: posts.publishedAt,
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
    updatedAt: posts.updatedAt,
    authorId: users.id,
    authorName: users.name,
    authorHandle: users.handle,
    authorRole: users.role,
    authorAvatarUrl: users.avatarUrl,
    authorVerified: users.verified,
    authorIntent: users.intent,
    isFollowingAuthor: safeUserId
      ? sql<boolean>`EXISTS(SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${safeUserId}::uuid AND ${follows.followingId} = ${users.id})`
      : sql<boolean>`false`,
    isLiked: safeUserId
      ? sql<boolean>`EXISTS(SELECT 1 FROM ${postLikes} WHERE ${postLikes.postId} = ${posts.id} AND ${postLikes.userId} = ${safeUserId}::uuid)`
      : sql<boolean>`false`,
    isSaved: safeUserId
      ? sql<boolean>`EXISTS(SELECT 1 FROM ${bookmarks} WHERE ${bookmarks.postId} = ${posts.id} AND ${bookmarks.userId} = ${safeUserId}::uuid)`
      : sql<boolean>`false`,
  };
}

function parseCursorDate(cursor?: string): Date | undefined {
  if (!cursor) return undefined;
  const parsed = new Date(cursor);
  if (Number.isNaN(parsed.getTime())) {
    throw AppError.badRequest("Noto'g'ri cursor parametri");
  }
  return parsed;
}

async function hydratePostsWithTags(
  rows: RawPostFeedRow[],
  fallbackKind = "thought"
): Promise<PostResponse[]> {
  if (rows.length === 0) return [];
  const tagsByPost = await loadActiveTagsForPosts(rows.map((r) => r.id));
  return rows.map((r) =>
    mapPostRowToResponse(r, fallbackKind, tagsByPost.get(r.id) ?? [])
  );
}

/**
 * Cursor-paginated feed with viewer-scoped LRU/TTL cache, tag filtering, and batch tag hydration.
 */
export async function getFeed(
  cursor?: string,
  limit = 20,
  currentUserId?: string,
  postType?: string,
  contentKind?: string,
  tag?: string
): Promise<{ posts: PostResponse[]; nextCursor: string | null }> {
  try {
    const queryLimit = Math.min(Math.max(limit, 1), 50);
    const safeUserId = toSafeUserId(currentUserId);
    const viewerScope = safeUserId ? `u:${safeUserId}` : "guest";
    const cleanTag = tag?.trim() || undefined;
    const cacheKey = `feed:${viewerScope}:${postType ?? "all"}:${contentKind ?? "all"}:${cleanTag ?? "all"}:${cursor ?? "first"}:${queryLimit}`;

    const cached = feedCache.get(cacheKey) as
      | { posts: PostResponse[]; nextCursor: string | null }
      | undefined;
    if (cached) return cached;

    const conditions = [isNull(posts.deletedAt), eq(posts.status, "published")];
    const cursorDate = parseCursorDate(cursor);
    if (cursorDate) conditions.push(lt(posts.createdAt, cursorDate));
    if (postType) conditions.push(eq(posts.postType, postType));
    if (contentKind) conditions.push(eq(posts.contentKind, contentKind));
    if (cleanTag) conditions.push(buildActivePostTagFilterCondition(cleanTag));
    conditions.push(...buildVisibilityConditions(safeUserId));

    const rows = await db
      .select(buildPostSelectFields(safeUserId, false))
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(queryLimit + 1);

    const hasMore = rows.length > queryLimit;
    const items = hasMore ? rows.slice(0, queryLimit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
    const result = {
      posts: await hydratePostsWithTags(items, "thought"),
      nextCursor,
    };

    feedCache.set(cacheKey, result, 15_000);
    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error fetching feed:", err);
    throw AppError.internal("Postlar tasmasini yuklashda xatolik yuz berdi");
  }
}

/**
 * Cursor-paginated Shorts feed (videos <= 60s) with viewer-scoped cache.
 */
export async function getShortsFeed(params: {
  cursor?: string;
  limit?: number;
  currentUserId?: string;
  filter?: string;
}): Promise<{ posts: PostResponse[]; nextCursor: string | null }> {
  try {
    const queryLimit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const safeUserId = toSafeUserId(params.currentUserId);
    const viewerScope = safeUserId ? `u:${safeUserId}` : "guest";
    const filter = params.filter || "for_you";
    const cacheKey = `shorts:${viewerScope}:${filter}:${params.cursor ?? "first"}:${queryLimit}`;

    const cached = feedCache.get(cacheKey) as
      | { posts: PostResponse[]; nextCursor: string | null }
      | undefined;
    if (cached) return cached;

    const conditions = [
      isNull(posts.deletedAt),
      eq(posts.status, "published"),
      sql`${posts.videoUrl} IS NOT NULL AND ${posts.videoDurationSeconds} IS NOT NULL AND ${posts.videoDurationSeconds} > 0 AND ${posts.videoDurationSeconds} <= 60`,
    ];

    const cursorDate = parseCursorDate(params.cursor);
    if (cursorDate) conditions.push(lt(posts.createdAt, cursorDate));

    if (filter === "tech") {
      conditions.push(
        sql`(LOWER(${posts.category}) IN ('texnologiya', 'ai', 'tech') OR ${posts.tags}::text ILIKE '%texno%' OR ${posts.tags}::text ILIKE '%ai%')`
      );
    } else if (filter === "dev") {
      conditions.push(
        sql`(LOWER(${posts.category}) IN ('dasturlash', 'flutter', 'dev') OR ${posts.tags}::text ILIKE '%flutter%' OR ${posts.tags}::text ILIKE '%dastur%')`
      );
    }

    conditions.push(...buildVisibilityConditions(safeUserId));

    const orderBy =
      filter === "trending"
        ? [desc(posts.likesCount), desc(posts.createdAt)]
        : [desc(posts.createdAt)];

    const rows = await db
      .select(buildPostSelectFields(safeUserId, false))
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(queryLimit + 1);

    const hasMore = rows.length > queryLimit;
    const items = hasMore ? rows.slice(0, queryLimit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
    const result = {
      posts: await hydratePostsWithTags(items, "video"),
      nextCursor,
    };

    feedCache.set(cacheKey, result, 15_000);
    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error fetching shorts feed:", err);
    throw AppError.internal("Shorts tasmasini yuklashda xatolik yuz berdi");
  }
}

export async function getPostById(
  postId: string,
  currentUserId?: string
): Promise<PostResponse> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Post topilmadi");
  }

  try {
    const safeUserId = toSafeUserId(currentUserId);
    const [row] = await db
      .select({
        ...buildPostSelectFields(safeUserId, true),
        authorIsPrivate: users.isPrivate,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!row) {
      throw AppError.notFound("Post topilmadi");
    }

    if (safeUserId && safeUserId !== row.authorId) {
      const [blockRecord] = await db
        .select({ blockerId: userBlocks.blockerId })
        .from(userBlocks)
        .where(
          or(
            and(eq(userBlocks.blockerId, row.authorId), eq(userBlocks.blockedId, safeUserId)),
            and(eq(userBlocks.blockerId, safeUserId), eq(userBlocks.blockedId, row.authorId))
          )
        )
        .limit(1);

      if (blockRecord) {
        throw AppError.notFound("Post topilmadi");
      }
    }

    if (row.authorIsPrivate) {
      const isSelf = safeUserId === row.authorId;
      if (!isSelf && !row.isFollowingAuthor) {
        throw AppError.forbidden(
          "Ushbu hisob yopiq (Private). Postni ko‘rish uchun muallifga obuna bo‘ling."
        );
      }
    }

    const tagsMap = await loadActiveTagsForPosts([row.id]);
    return mapPostRowToResponse(row, "thought", tagsMap.get(row.id) ?? []);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error fetching post by id:", err);
    throw AppError.internal("Postni yuklashda xatolik yuz berdi");
  }
}

export async function getBookmarkedPosts(
  userId: string,
  limit = 40
): Promise<PostResponse[]> {
  const safeUserId = toSafeUserId(userId);
  if (!safeUserId) {
    throw AppError.unauthorized("Tizimga kirish talab qilinadi");
  }

  const queryLimit = Math.min(Math.max(limit, 1), 100);
  const cacheKey = `bookmarks:${safeUserId}:${queryLimit}`;
  const cached = feedCache.get(cacheKey) as PostResponse[] | undefined;
  if (cached) return cached;

  try {
    const rows = await db
      .select({
        ...buildPostSelectFields(safeUserId, false),
        isSaved: sql<boolean>`true`,
      })
      .from(bookmarks)
      .innerJoin(posts, eq(bookmarks.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          eq(bookmarks.userId, safeUserId),
          eq(posts.status, "published"),
          isNull(posts.deletedAt)
        )
      )
      .orderBy(desc(bookmarks.createdAt))
      .limit(queryLimit);

    const formatted = await hydratePostsWithTags(rows, "thought");
    feedCache.set(cacheKey, formatted, 15_000);
    return formatted;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[BOOKMARKS] Error fetching bookmarks:", err);
    throw AppError.internal("Saqlangan postlarni yuklashda xatolik yuz berdi");
  }
}
