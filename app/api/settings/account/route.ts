import { type NextRequest } from "next/server";
import { requireAuth, SESSION_COOKIE_NAME } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { enforceRateLimit } from "@/server/common/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Rate limit: max 5 account action requests per 10 minutes per user
    enforceRateLimit(`account_action:${authUser.userId}`, 5, 600);

    const { action } = await req.json().catch(() => ({}));

    if (action === "deactivate") {
      await db
        .update(users)
        .set({ isDeactivated: true, updatedAt: new Date() })
        .where(eq(users.id, authUser.userId));

      const response = successResponse({ message: "Hisob vaqtincha muzlatildi" });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return errorResponse(new Error("Noto'g'ri amal ko'rsatildi"));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Rate limit: max 3 delete attempts per 10 minutes per user
    enforceRateLimit(`account_delete:${authUser.userId}`, 3, 600);

    // Delete user account permanently
    await db.delete(users).where(eq(users.id, authUser.userId));

    const response = successResponse({ message: "Hisob butunlay o'chirildi" });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
