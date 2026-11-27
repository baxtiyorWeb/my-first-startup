import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/** GET /api/community/members?cursor=<offset>&limit=20 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limitParam = Number.parseInt(searchParams.get("limit") || "20", 10);

    const result = await CommunityService.listMembers(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      {
        cursor: searchParams.get("cursor"),
        limit: Number.isFinite(limitParam) ? limitParam : 20,
      }
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
