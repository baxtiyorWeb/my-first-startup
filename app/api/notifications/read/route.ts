import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { markAsRead } from "@/server/modules/notifications/notifications.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const notificationId = typeof body.notificationId === "string" ? body.notificationId : undefined;

    await markAsRead(authUser.userId, notificationId);
    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
