import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/** POST /api/community/settings { muted } — notification preference. */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const result = await CommunityService.updateMembership(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      { muted: typeof body.muted === "boolean" ? body.muted : undefined }
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
