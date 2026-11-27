import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/** POST /api/community/read { messageId? } — stores the user's read marker. */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const result = await CommunityService.markRead(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      typeof body.messageId === "string" ? body.messageId : null
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
