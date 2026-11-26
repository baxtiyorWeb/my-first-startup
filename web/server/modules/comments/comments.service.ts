import { eq, and, or, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  comments,
  posts,
  users,
  commentLikes,
  userBlocks,
  follows,
} from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { sanitizeRichContent } from "@/server/common/sanitizer";
import { triggerNotification } from "@/server/modules/notifications/notifications.service";
import { buildCommentTree } from "./comment-tree";
import type { CommentItemResponse } from "./comment-tree";

export { buildCommentTree } from "./comment-tree";
export type { CommentItemResponse } from "./comment-tree";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Get all comments for a post organized in nested reply trees
 */
export async function getCommentsForPost(
  postId: string,
  currentUserId?: string
): Promise<CommentItemResponse[]> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Post topilmadi");
  }

  try {
    // Discussions inherit the visibility of their post: deleted posts are gone,
    // private-account discussions are readable only by the author and followers.
    const [targetPost] = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        authorIsPrivate: users.isPrivate,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!targetPost) {
      throw AppError.notFound("Post topilmadi");
    }

    const isAuthor = currentUserId === targetPost.authorId;
    if (targetPost.authorIsPrivate && !isAuthor) {
      let canView = false;
      if (currentUserId) {
        const [followRow] = await db
          .select({ followerId: follows.followerId })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, currentUserId),
              eq(follows.followingId, targetPost.authorId)
            )
          )
          .limit(1);
        canView = Boolean(followRow);
      }
      if (!canView) {
        throw AppError.forbidden(
          "Ushbu hisob yopiq (Private). Munozarani ko‘rish uchun muallifga obuna bo‘ling."
        );
      }
    }

    const rows = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        content: comments.content,
        likesCount: comments.likesCount,
        createdAt: comments.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorRole: users.role,
        authorAvatarUrl: users.avatarUrl,
        authorVerified: users.verified,
        isLiked: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id} AND ${commentLikes.userId} = ${currentUserId}::uuid)`
          : sql<boolean>`false`,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.postId, postId), isNull(comments.deletedAt)))
      .orderBy(comments.createdAt);

    return buildCommentTree(rows);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[COMMENTS] Error fetching comments for post:", err);
    throw AppError.internal("Izohlarni yuklashda xatolik yuz berdi");
  }
}

/**
 * Add a comment or a reply to a comment
 */
export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string
): Promise<CommentItemResponse> {
  const sanitized = sanitizeRichContent(content);
  if (sanitized.length < 2) {
    throw AppError.validation("Izoh matni juda qisqa");
  }

  try {
    // Check if post exists
    const [post] = await db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!post) {
      throw AppError.notFound("Post topilmadi");
    }

    // Check if either party blocked the other
    if (post.authorId !== userId) {
      const [blockRecord] = await db
        .select({ blockerId: userBlocks.blockerId })
        .from(userBlocks)
        .where(
          or(
            and(eq(userBlocks.blockerId, post.authorId), eq(userBlocks.blockedId, userId)),
            and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, post.authorId))
          )
        )
        .limit(1);

      if (blockRecord) {
        throw AppError.forbidden("Bloklangan foydalanuvchining postiga izoh yozish taqiqlangan");
      }
    }

    // If replying, check if parent comment exists and belongs to this post
    if (parentId) {
      const [parent] = await db
        .select({ id: comments.id, postId: comments.postId })
        .from(comments)
        .where(and(eq(comments.id, parentId), isNull(comments.deletedAt)))
        .limit(1);

      if (!parent || parent.postId !== postId) {
        throw AppError.badRequest("Javob yozilayotgan izoh topilmadi");
      }
    }

    let insertedComment: { id: string; createdAt: Date };
    await db.transaction(async (tx) => {
      const [ins] = await tx
        .insert(comments)
        .values({
          postId,
          authorId: userId,
          parentId: parentId || null,
          content: sanitized,
          likesCount: 0,
        })
        .returning();

      // Increment post comments count
      await tx
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, postId));

      insertedComment = { id: ins.id, createdAt: ins.createdAt };
    });

    const [author] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Trigger notification asynchronously
    if (parentId) {
      // Notify parent comment author
      db.select({ authorId: comments.authorId })
        .from(comments)
        .where(eq(comments.id, parentId))
        .limit(1)
        .then(([parent]) => {
          if (parent) {
            triggerNotification({
              recipientId: parent.authorId,
              actorId: userId,
              type: "reply",
              targetId: insertedComment!.id,
              targetType: "comment",
              title: "Yangi javob",
              message: `${author.name} izohingizga javob qaytardi: "${sanitized.slice(0, 50)}"`,
              link: `/dashboard/posts/${postId}`,
            }).catch(() => null);
          }
        })
        .catch(() => null);
    } else {
      // Notify post author
      db.select({ authorId: posts.authorId, title: posts.title })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1)
        .then(([p]) => {
          if (p) {
            triggerNotification({
              recipientId: p.authorId,
              actorId: userId,
              type: "comment",
              targetId: insertedComment!.id,
              targetType: "comment",
              title: "Yangi izoh",
              message: `${author.name} postingizga izoh qoldirdi: "${sanitized.slice(0, 50)}"`,
              link: `/dashboard/posts/${postId}`,
            }).catch(() => null);
          }
        })
        .catch(() => null);
    }

    return {
      id: insertedComment!.id,
      postId,
      parentId,
      content: sanitized,
      likesCount: 0,
      isLiked: false,
      createdAt: insertedComment!.createdAt.toISOString(),
      author: {
        id: author.id,
        name: author.name,
        handle: author.handle,
        role: author.role,
        avatarUrl: author.avatarUrl,
        verified: author.verified,
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[COMMENTS] Error adding comment:", err);
    throw AppError.internal("Izohni saqlashda xatolik yuz berdi");
  }
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(
  commentId: string,
  userId: string
): Promise<{ isLiked: boolean; likesCount: number }> {
  if (!UUID_REGEX.test(commentId)) {
    throw AppError.notFound("Izoh topilmadi");
  }

  try {
    const [commentRow] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
      .limit(1);

    if (!commentRow) {
      throw AppError.notFound("Izoh topilmadi");
    }

    const [existing] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
      .limit(1);

    if (existing) {
      await db.transaction(async (tx) => {
        await tx
          .delete(commentLikes)
          .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));
        await tx
          .update(comments)
          .set({ likesCount: sql`GREATEST(0, ${comments.likesCount} - 1)` })
          .where(eq(comments.id, commentId));
      });

      const [updated] = await db
        .select({ count: comments.likesCount })
        .from(comments)
        .where(eq(comments.id, commentId));
      return { isLiked: false, likesCount: updated?.count ?? 0 };
    } else {
      await db.transaction(async (tx) => {
        await tx.insert(commentLikes).values({ commentId, userId });
        await tx
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, commentId));
      });

      const [updated] = await db
        .select({ count: comments.likesCount })
        .from(comments)
        .where(eq(comments.id, commentId));
      return { isLiked: true, likesCount: updated?.count ?? 1 };
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[COMMENTS] Error toggling comment like:", err);
    throw AppError.internal("Izohga like bosishda xatolik yuz berdi");
  }
}
