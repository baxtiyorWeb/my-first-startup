import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { action } = await req.json().catch(() => ({}));

    if (action === "deactivate") {
      await db
        .update(users)
        .set({ isDeactivated: true, updatedAt: new Date() })
        .where(eq(users.id, authUser.userId));

      return successResponse({ message: "Hisob vaqtincha muzlatildi" });
    }

    return errorResponse(new Error("Noto'g'ri amal ko'rsatildi"));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Delete user account permanently
    await db.delete(users).where(eq(users.id, authUser.userId));

    return successResponse({ message: "Hisob butunlay o'chirildi" });
  } catch (error) {
    return errorResponse(error);
  }
}
