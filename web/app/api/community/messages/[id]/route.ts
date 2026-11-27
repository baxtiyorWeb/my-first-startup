import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/community/messages/[id] — author edits text. */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (typeof body.content !== "string") {
      throw AppError.badRequest("Xabar matni talab qilinadi");
    }

    const message = await CommunityService.editMessage(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      id,
      body.content
    );

    return successResponse({ message });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/community/messages/[id] — author or moderator soft delete. */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await context.params;

    const result = await CommunityService.deleteMessage(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      id
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
