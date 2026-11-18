import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { getUserNotifications } from "@/server/modules/notifications/notifications.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getUserNotifications(authUser.userId, limit, cursor);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
