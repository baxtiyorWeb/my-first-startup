import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/** GET /api/community/media?kind=image|video|file&cursor=<iso>&limit=18 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("kind");
    const kind =
      kindParam === "video" || kindParam === "file" || kindParam === "image"
        ? kindParam
        : "image";
    const limitParam = Number.parseInt(searchParams.get("limit") || "18", 10);

    const result = await CommunityService.listMedia(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      {
        kind,
        cursor: searchParams.get("cursor"),
        limit: Number.isFinite(limitParam) ? limitParam : 18,
      }
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
