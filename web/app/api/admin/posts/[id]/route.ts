import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID kiritilmadi" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updateData: Partial<typeof posts.$inferInsert> = {};

    if (typeof body.title === "string") {
      updateData.title = body.title.trim();
    }
    if (typeof body.content === "string") {
      updateData.content = body.content.trim();
    }
    if (typeof body.postType === "string") {
      updateData.postType = body.postType.trim();
    }
    if (Array.isArray(body.mediaUrls)) {
      updateData.mediaUrls = body.mediaUrls;
    }
    if (typeof body.projectUrl === "string") {
      updateData.projectUrl = body.projectUrl.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Yangilanish uchun ma'lumot berilmadi" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Post topilmadi" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Post muvaffaqiyatli yangilandi",
      data: updated,
    });
  } catch (error) {
    console.error("[ADMIN_PATCH_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID kiritilmadi" },
        { status: 400 }
      );
    }

    await db.delete(posts).where(eq(posts.id, id));

    return NextResponse.json({
      success: true,
      message: "Post o'chirildi",
    });
  } catch (error) {
    console.error("[ADMIN_DELETE_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
