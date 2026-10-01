import { NextRequest, NextResponse } from "next/server";
import { eq, desc, ilike, or, and, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, users } from "@/server/db/schema";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function GET(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // 'all' | 'real' | 'bots'
    const search = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const conditions = [isNull(posts.deletedAt)];

    if (filter === "real") {
      conditions.push(eq(users.isBot, false));
    } else if (filter === "bots") {
      conditions.push(eq(users.isBot, true));
    }

    if (search) {
      const searchCondition = or(
        ilike(posts.title, `%${search}%`),
        ilike(posts.content, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.handle, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const postList = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        postType: posts.postType,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        viewsCount: posts.viewsCount,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          name: users.name,
          handle: users.handle,
          avatarUrl: users.avatarUrl,
          isBot: users.isBot,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(whereClause)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        posts: postList,
      },
    });
  } catch (error) {
    console.error("[ADMIN_POSTS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
