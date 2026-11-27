import { NextRequest } from "next/server";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/** GET /api/admin/community?q=&cursor=&limit=30 — community moderation feed. */
export async function GET(req: NextRequest) {
  try {
    const denied = await enforceAdminGuard(req);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const limitParam = Number.parseInt(searchParams.get("limit") || "30", 10);

    const result = await CommunityService.listForModeration({
      search: searchParams.get("q"),
      cursor: searchParams.get("cursor"),
      limit: Number.isFinite(limitParam) ? limitParam : 30,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/admin/community?id=<messageId> — moderator removes a message. */
export async function DELETE(req: NextRequest) {
  try {
    const denied = await enforceAdminGuard(req);
    if (denied) return denied;

    const authUser = await requireAuth(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      throw AppError.badRequest("Xabar identifikatori talab qilinadi");
    }

    const result = await CommunityService.deleteMessage(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      id
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
