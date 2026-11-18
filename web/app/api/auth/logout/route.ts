import { type NextRequest } from "next/server";
import { successResponse } from "@/server/common/response";
import { SESSION_COOKIE_NAME, getOptionalAuth } from "@/server/common/auth-guard";
import { db } from "@/server/db";
import { userSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { realtimeHub } from "@/server/modules/messages/realtime-hub";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    if (authUser?.userId) {
      realtimeHub.forceUserOffline(authUser.userId);
    }
    if (authUser?.sessionId) {
      await db.delete(userSessions).where(eq(userSessions.id, authUser.sessionId));
    }
  } catch {
    // Ignore cleanup errors on logout
  }

  const response = successResponse({ message: "Muvaffaqiyatli chiqildi" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
