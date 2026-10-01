import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";
import { enforceAdminGuard } from "@/server/common/admin-guard";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = await enforceAdminGuard(req);
  if (guardResponse) return guardResponse;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "ID kiritilmadi" }, { status: 400 });
    }

    await db.delete(posts).where(eq(posts.id, id));

    return NextResponse.json({ success: true, message: "Post o'chirildi" });
  } catch (error) {
    console.error("[ADMIN_DELETE_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
