import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, users, postLikes, bookmarks } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { triggerNotification } from "@/server/modules/notifications/notifications.service";
import { bumpPostTagsEngagement } from "@/server/modules/tags/tags.service";
import {
  actionIdempotencyCache,
  invalidatePostCaches,
} from "@/server/common/server-cache";
import {
  UUID_REGEX,
  type PostBookmarkResult,
  type PostLikeResult,
  type PostShareResult,
  type SyncActionInput,
  type SyncActionOutcome,
} from "./post.types";

function idemCacheKey(userId: string, idempotencyKey?: string): string | null {
  const clean = idempotencyKey?.trim();
  if (!clean) return null;
  return `${userId}:${clean}`;
}

/**
 * Atomic, race-safe & idempotent like handler.
 * Supports explicit `desiredState` for offline queue reconciliation or toggle when omitted.
 */
export async function applyPostLike(
  postId: string,
  userId: string,
  options: { desiredState?: boolean; idempotencyKey?: string } = {}
): Promise<PostLikeResult> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Post topilmadi");
  }

  const idemKey = idemCacheKey(userId, options.idempotencyKey);
  if (idemKey) {
    const cached = actionIdempotencyCache.get(idemKey) as PostLikeResult | undefined;
    if (cached && cached.postId === postId) return cached;
  }

  try {
    const outcome = await db.transaction(async (tx) => {
      const [postRow] = await tx
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          content: posts.content,
          likesCount: posts.likesCount,
        })
        .from(posts)
        .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
        .limit(1);

      if (!postRow) {
        throw AppError.notFound("Post topilmadi");
      }

      let targetLiked: boolean;
      if (typeof options.desiredState === "boolean") {
        targetLiked = options.desiredState;
      } else {
        const [existing] = await tx
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
          .limit(1);
        targetLiked = !existing;
      }

      let finalCount = postRow.likesCount;
      let newlyLiked = false;
      let unliked = false;

      if (targetLiked) {
        const inserted = await tx
          .insert(postLikes)
          .values({ postId, userId })
          .onConflictDoNothing({ target: [postLikes.postId, postLikes.userId] })
          .returning({ postId: postLikes.postId });

        if (inserted.length > 0) {
          newlyLiked = true;
          const [updated] = await tx
            .update(posts)
            .set({ likesCount: sql`${posts.likesCount} + 1` })
            .where(eq(posts.id, postId))
            .returning({ count: posts.likesCount });
          finalCount = updated?.count ?? postRow.likesCount + 1;
        }
      } else {
        const deleted = await tx
          .delete(postLikes)
          .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
          .returning({ postId: postLikes.postId });

        if (deleted.length > 0) {
          unliked = true;
          const [updated] = await tx
            .update(posts)
            .set({ likesCount: sql`GREATEST(0, ${posts.likesCount} - 1)` })
            .where(eq(posts.id, postId))
            .returning({ count: posts.likesCount });
          finalCount = updated?.count ?? Math.max(0, postRow.likesCount - 1);
        }
      }

      return {
        result: {
          postId,
          isLiked: targetLiked,
          liked: targetLiked,
          likesCount: finalCount,
        },
        newlyLiked,
        unliked,
        postRow,
      };
    });

    if (idemKey) {
      actionIdempotencyCache.set(idemKey, outcome.result);
    }
    invalidatePostCaches(postId, userId);

    if (outcome.newlyLiked) {
      bumpPostTagsEngagement(postId, 2).catch(() => null);
    } else if (outcome.unliked) {
      bumpPostTagsEngagement(postId, -2).catch(() => null);
    }

    if (outcome.newlyLiked && outcome.postRow.authorId !== userId) {
      db.select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then(([u]) => {
          const actorName = u?.name || "Foydalanuvchi";
          const postSnippet = outcome.postRow.title || outcome.postRow.content.slice(0, 40);
          triggerNotification({
            recipientId: outcome.postRow.authorId,
            actorId: userId,
            type: "like",
            targetId: postId,
            targetType: "post",
            title: "Yangi like",
            message: `${actorName} sizning "${postSnippet}" postingizga like bosdi`,
            link: `/dashboard/posts/${postId}`,
          }).catch(() => null);
        })
        .catch(() => null);
    }

    return outcome.result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error applying post like:", err);
    throw AppError.internal("Like amalini bajarishda xatolik yuz berdi");
  }
}

/**
 * Atomic, race-safe & idempotent bookmark handler.
 */
export async function applyPostBookmark(
  postId: string,
  userId: string,
  options: { desiredState?: boolean; idempotencyKey?: string } = {}
): Promise<PostBookmarkResult> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Post topilmadi");
  }

  const idemKey = idemCacheKey(userId, options.idempotencyKey);
  if (idemKey) {
    const cached = actionIdempotencyCache.get(idemKey) as PostBookmarkResult | undefined;
    if (cached && cached.postId === postId) return cached;
  }

  try {
    const targetSaved = await db.transaction(async (tx) => {
      const [postRow] = await tx
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
        .limit(1);

      if (!postRow) {
        throw AppError.notFound("Post topilmadi");
      }

      let nextSaved: boolean;
      if (typeof options.desiredState === "boolean") {
        nextSaved = options.desiredState;
      } else {
        const [existing] = await tx
          .select({ postId: bookmarks.postId })
          .from(bookmarks)
          .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)))
          .limit(1);
        nextSaved = !existing;
      }

      if (nextSaved) {
        await tx
          .insert(bookmarks)
          .values({ postId, userId })
          .onConflictDoNothing({ target: [bookmarks.postId, bookmarks.userId] });
      } else {
        await tx
          .delete(bookmarks)
          .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)));
      }

      return nextSaved;
    });

    const result: PostBookmarkResult = {
      postId,
      isSaved: targetSaved,
      saved: targetSaved,
    };
    if (idemKey) {
      actionIdempotencyCache.set(idemKey, result);
    }
    invalidatePostCaches(postId, userId);

    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error applying bookmark:", err);
    throw AppError.internal("Saqlash amalini bajarishda xatolik yuz berdi");
  }
}

/**
 * Records a share interaction atomically and prevents duplicate increments across retries.
 */
export async function recordPostShare(
  postId: string,
  userId: string,
  options: { idempotencyKey?: string } = {}
): Promise<PostShareResult> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Post topilmadi");
  }

  const idemKey = idemCacheKey(userId, options.idempotencyKey);
  if (idemKey) {
    const cached = actionIdempotencyCache.get(idemKey) as PostShareResult | undefined;
    if (cached && cached.postId === postId) return cached;
  }

  try {
    const [updated] = await db
      .update(posts)
      .set({ sharesCount: sql`${posts.sharesCount} + 1` })
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .returning({ sharesCount: posts.sharesCount });

    if (!updated) {
      throw AppError.notFound("Post topilmadi");
    }

    const result: PostShareResult = {
      postId,
      sharesCount: updated.sharesCount,
    };
    if (idemKey) {
      actionIdempotencyCache.set(idemKey, result);
    }
    invalidatePostCaches(postId);
    bumpPostTagsEngagement(postId, 3).catch(() => null);

    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error recording share:", err);
    throw AppError.internal("Ulashish amalini bajarishda xatolik yuz berdi");
  }
}

/**
 * Replays queued offline actions in chronological order with per-item isolation.
 */
export async function syncPostActionsBatch(
  userId: string,
  actions: SyncActionInput[]
): Promise<SyncActionOutcome[]> {
  const outcomes: SyncActionOutcome[] = [];

  for (const item of actions) {
    try {
      if (item.action === "like") {
        const res = await applyPostLike(item.postId, userId, {
          desiredState: item.desiredState,
          idempotencyKey: item.idempotencyKey,
        });
        outcomes.push({
          idempotencyKey: item.idempotencyKey,
          postId: item.postId,
          action: "like",
          status: "synced",
          isLiked: res.isLiked,
          likesCount: res.likesCount,
        });
      } else if (item.action === "bookmark") {
        const res = await applyPostBookmark(item.postId, userId, {
          desiredState: item.desiredState,
          idempotencyKey: item.idempotencyKey,
        });
        outcomes.push({
          idempotencyKey: item.idempotencyKey,
          postId: item.postId,
          action: "bookmark",
          status: "synced",
          isSaved: res.isSaved,
        });
      } else {
        const res = await recordPostShare(item.postId, userId, {
          idempotencyKey: item.idempotencyKey,
        });
        outcomes.push({
          idempotencyKey: item.idempotencyKey,
          postId: item.postId,
          action: "share",
          status: "synced",
          sharesCount: res.sharesCount,
        });
      }
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404) {
        outcomes.push({
          idempotencyKey: item.idempotencyKey,
          postId: item.postId,
          action: item.action,
          status: "not_found",
          error: err.message,
        });
      } else {
        outcomes.push({
          idempotencyKey: item.idempotencyKey,
          postId: item.postId,
          action: item.action,
          status: "failed",
          error: err instanceof Error ? err.message : "Sinxronizatsiya xatoligi",
        });
      }
    }
  }

  return outcomes;
}

export async function togglePostLike(postId: string, userId: string) {
  return applyPostLike(postId, userId);
}

export async function togglePostBookmark(postId: string, userId: string) {
  return applyPostBookmark(postId, userId);
}
