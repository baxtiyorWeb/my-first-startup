import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/community/messages/[id]/reactions { emoji } — toggle a reaction. */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (typeof body.emoji !== "string" || !body.emoji.trim()) {
      throw AppError.badRequest("Reaksiya emojisi talab qilinadi");
    }

    const result = await CommunityService.toggleReaction(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      id,
      body.emoji.trim()
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
