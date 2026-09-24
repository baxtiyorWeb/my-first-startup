import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { comments, posts, users, commentLikes } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { sanitizeRichContent } from "@/server/common/sanitizer";

export interface CommentItemResponse {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
  };
  replies?: CommentItemResponse[];
}

/**
 * Get all comments for a post organized in nested reply trees
 */
export async function getCommentsForPost(
  postId: string,
  currentUserId?: string
): Promise<CommentItemResponse[]> {
  try {
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

    // Group into root comments and nested replies
    const rootComments: CommentItemResponse[] = [];
    const repliesMap = new Map<string, CommentItemResponse[]>();

    for (const r of rows) {
      const item: CommentItemResponse = {
        id: r.id,
        postId: r.postId,
        parentId: r.parentId,
        content: r.content,
        likesCount: r.likesCount,
        isLiked: Boolean(r.isLiked),
        createdAt: r.createdAt.toISOString(),
        author: {
          id: r.authorId,
          name: r.authorName,
          handle: r.authorHandle,
          role: r.authorRole,
          avatarUrl: r.authorAvatarUrl,
          verified: r.authorVerified,
        },
      };

      if (!r.parentId) {
        rootComments.push(item);
      } else {
        const existing = repliesMap.get(r.parentId) || [];
        existing.push(item);
        repliesMap.set(r.parentId, existing);
      }
    }

    // Attach replies to roots
    for (const root of rootComments) {
      root.replies = repliesMap.get(root.id) || [];
    }

    return rootComments;
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
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!post) {
      throw AppError.notFound("Post topilmadi");
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
  try {
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
