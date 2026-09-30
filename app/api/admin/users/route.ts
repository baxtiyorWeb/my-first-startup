import { NextRequest, NextResponse } from "next/server";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function GET(req: NextRequest) {
  const guardResponse = enforceAdminGuard();
  if (guardResponse) return guardResponse;
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // 'all' | 'real' | 'bots'
    const search = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const conditions = [];

    if (filter === "real") {
      conditions.push(eq(users.isBot, false));
    } else if (filter === "bots") {
      conditions.push(eq(users.isBot, true));
    }

    if (search) {
      const searchCondition = or(
        ilike(users.name, `%${search}%`),
        ilike(users.handle, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.role, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        email: users.email,
        phone: users.phone,
        role: users.role,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        isBot: users.isBot,
        botPersona: users.botPersona,
        verified: users.verified,
        createdAt: users.createdAt,
        postsCount: sql<number>`(SELECT count(*)::int FROM posts WHERE posts.author_id = users.id AND posts.deleted_at IS NULL)`,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: {
        users: userList,
        total: totalRes?.count || 0,
      },
    });
  } catch (error) {
    console.error("[ADMIN_USERS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
