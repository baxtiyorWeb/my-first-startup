import { type NextRequest } from "next/server";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, users, bookmarks } from "@/server/db/schema";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import type { PostResponse } from "@/server/modules/posts/posts.service";
import { SEED_POSTS } from "@/server/common/seed-data";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    try {
      const rows = await db
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          readingTimeMinutes: posts.readingTimeMinutes,
          createdAt: posts.createdAt,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          sharesCount: posts.sharesCount,
          viewsCount: posts.viewsCount,
          authorId: users.id,
          authorName: users.name,
          authorHandle: users.handle,
          authorRole: users.role,
          authorAvatarUrl: users.avatarUrl,
          authorVerified: users.verified,
        })
        .from(bookmarks)
        .innerJoin(posts, eq(bookmarks.postId, posts.id))
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(and(eq(bookmarks.userId, authUser.userId), isNull(posts.deletedAt)))
        .orderBy(desc(bookmarks.createdAt));

      const result: PostResponse[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        readingTimeMinutes: r.readingTimeMinutes,
        createdAt: r.createdAt.toISOString(),
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        sharesCount: r.sharesCount,
        viewsCount: r.viewsCount,
        isLiked: false,
        isSaved: true,
        author: {
          id: r.authorId,
          name: r.authorName,
          handle: r.authorHandle,
          role: r.authorRole,
          avatarUrl: r.authorAvatarUrl,
          verified: r.authorVerified,
        },
      }));

      return successResponse(result);
    } catch {
      // Memory fallback
      const saved = SEED_POSTS.filter((p) => p.isSaved).map((p) => ({
        ...p,
        title: p.title || null,
        readingTimeMinutes: 2,
        viewsCount: p.viewsCount || 0,
        isLiked: p.isLiked ?? false,
        isSaved: true,
      }));
      return successResponse(saved);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
