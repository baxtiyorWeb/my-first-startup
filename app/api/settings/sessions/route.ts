import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { db } from "@/server/db";
import { userSessions } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    let rows = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, authUser.userId));

    // If no sessions exist yet, create default active current session
    if (rows.length === 0) {
      const userAgent = req.headers.get("user-agent") || "Bravzer (Windows / Chrome)";
      const isMobile = /mobile/i.test(userAgent);
      const deviceName = isMobile ? "Mobil qurilma" : "Windows kompyuter";
      const browser = userAgent.includes("Chrome") ? "Google Chrome" : userAgent.includes("Firefox") ? "Mozilla Firefox" : "Brauzer";

      const [newSession] = await db
        .insert(userSessions)
        .values({
          userId: authUser.userId,
          deviceName,
          browser,
          ipAddress: "127.0.0.1",
          location: "Toshkent, O‘zbekiston",
          isCurrent: true,
          lastActiveAt: new Date(),
        })
        .returning();

      rows = [newSession];
    }

    return successResponse({ sessions: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      // Delete specific session
      await db
        .delete(userSessions)
        .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, authUser.userId)));
    } else {
      // Delete all sessions except current
      await db
        .delete(userSessions)
        .where(and(eq(userSessions.userId, authUser.userId), eq(userSessions.isCurrent, false)));
    }

    return successResponse({ message: "Seanslar yakunlandi" });
  } catch (error) {
    return errorResponse(error);
  }
}
