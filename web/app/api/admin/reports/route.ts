import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { reports, users, posts, comments } from "@/server/db/schema";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function GET(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const offset = Number(searchParams.get("offset") || 0);

    // Fetch reports with reporter user details
    const reportRows = await db
      .select({
        id: reports.id,
        targetId: reports.targetId,
        targetType: reports.targetType,
        reason: reports.reason,
        context: reports.context,
        createdAt: reports.createdAt,
        reporter: {
          id: users.id,
          name: users.name,
          handle: users.handle,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with target content details
    const enriched = await Promise.all(
      reportRows.map(async (rep) => {
        let targetSnippet: string | null = null;
        let targetAuthor: string | null = null;

        if (rep.targetType === "post") {
          const [postRow] = await db
            .select({
              title: posts.title,
              content: posts.content,
              authorName: users.name,
            })
            .from(posts)
            .leftJoin(users, eq(posts.authorId, users.id))
            .where(eq(posts.id, rep.targetId));

          if (postRow) {
            targetSnippet = postRow.title || postRow.content.slice(0, 120);
            targetAuthor = postRow.authorName;
          }
        } else if (rep.targetType === "comment") {
          const [commRow] = await db
            .select({
              content: comments.content,
              authorName: users.name,
            })
            .from(comments)
            .leftJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.id, rep.targetId));

          if (commRow) {
            targetSnippet = commRow.content.slice(0, 120);
            targetAuthor = commRow.authorName;
          }
        } else if (rep.targetType === "user") {
          const [userRow] = await db
            .select({
              name: users.name,
              handle: users.handle,
              role: users.role,
            })
            .from(users)
            .where(eq(users.id, rep.targetId));

          if (userRow) {
            targetSnippet = `@${userRow.handle} — ${userRow.name} (${userRow.role})`;
            targetAuthor = userRow.name;
          }
        }

        return {
          ...rep,
          targetSnippet,
          targetAuthor,
        };
      })
    );

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(reports);

    return NextResponse.json({
      success: true,
      data: {
        reports: enriched,
        total: countRow?.total || 0,
      },
    });
  } catch (error) {
    console.error("[ADMIN_REPORTS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("id");
    const action = searchParams.get("action") || "dismiss"; // 'dismiss' | 'delete_content'

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "Hisobot ID ko'rsatilmadi" },
        { status: 400 }
      );
    }

    const [existingReport] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId));

    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: "Hisobot topilmadi" },
        { status: 404 }
      );
    }

    if (action === "delete_content") {
      if (existingReport.targetType === "post") {
        await db.delete(posts).where(eq(posts.id, existingReport.targetId));
      } else if (existingReport.targetType === "comment") {
        await db
          .delete(comments)
          .where(eq(comments.id, existingReport.targetId));
      }
    } else if (action === "suspend_user") {
      // Shikoyat qilingan foydalanuvchini bloklash (Play UGC talabi).
      await db
        .update(users)
        .set({ isDeactivated: true, updatedAt: new Date() })
        .where(eq(users.id, existingReport.targetId));
    }

    // Remove the report
    await db.delete(reports).where(eq(reports.id, reportId));

    return NextResponse.json({
      success: true,
      message:
        action === "delete_content"
          ? "Kontent va shikoyat muvaffaqiyatli o'chirildi"
          : action === "suspend_user"
          ? "Foydalanuvchi bloklandi va shikoyat yopildi"
          : "Shikoyat ko'rib chiqildi va yopildi",
    });
  } catch (error) {
    console.error("[ADMIN_REPORTS_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
