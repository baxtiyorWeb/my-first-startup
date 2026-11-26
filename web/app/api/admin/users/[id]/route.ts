import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
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
    const updateData: Partial<typeof users.$inferInsert> = {};

    if (typeof body.verified === "boolean") {
      updateData.verified = body.verified;
    }
    if (typeof body.role === "string" && body.role.trim()) {
      updateData.role = body.role.trim();
    }
    if (typeof body.isDeactivated === "boolean") {
      updateData.isDeactivated = body.isDeactivated;
    }
    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
    }
    if (typeof body.handle === "string" && body.handle.trim()) {
      updateData.handle = body.handle.trim().replace(/^@/, "");
    }
    if (typeof body.bio === "string") {
      updateData.bio = body.bio.trim();
    }
    if (typeof body.avatarUrl === "string") {
      updateData.avatarUrl = body.avatarUrl.trim();
    }
    if (typeof body.isBot === "boolean") {
      updateData.isBot = body.isBot;
    }
    if (typeof body.botPersona === "string") {
      updateData.botPersona = body.botPersona;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Yangilanish uchun ma'lumot berilmadi" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Foydalanuvchi topilmadi" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yangilandi",
      data: updated,
    });
  } catch (error) {
    console.error("[ADMIN_PATCH_USER_ERROR]", error);
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

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "Foydalanuvchi o'chirildi",
    });
  } catch (error) {
    console.error("[ADMIN_DELETE_USER_ERROR]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
