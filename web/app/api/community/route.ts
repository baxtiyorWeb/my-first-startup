import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/community
 * Overview of the single official Geters Community (members, unread, media).
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const overview = await CommunityService.getOverview({
      userId: authUser.userId,
      role: authUser.role,
      email: authUser.email,
    });
    return successResponse(overview);
  } catch (error) {
    return errorResponse(error);
  }
}
