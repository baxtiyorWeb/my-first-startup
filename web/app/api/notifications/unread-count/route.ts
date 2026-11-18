import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { getUnreadCount } from "@/server/modules/notifications/notifications.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const count = await getUnreadCount(authUser.userId);
    return successResponse({ unreadCount: count });
  } catch (error) {
    return errorResponse(error);
  }
}
