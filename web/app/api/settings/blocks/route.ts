import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { db } from "@/server/db";
import { userBlocks, users } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        role: users.role,
        avatarUrl: users.avatarUrl,
        blockedAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedId, users.id))
      .where(eq(userBlocks.blockerId, authUser.userId));

    return successResponse({ blockedUsers: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return errorResponse(new Error("Foydalanuvchi ID si ko'rsatilmadi"));
    }

    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, authUser.userId),
          eq(userBlocks.blockedId, targetUserId)
        )
      );

    return successResponse({ message: "Foydalanuvchi blokdan chiqarildi" });
  } catch (error) {
    return errorResponse(error);
  }
}
