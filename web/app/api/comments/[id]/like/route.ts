import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { toggleCommentLike } from "@/server/modules/comments/comments.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await params;

    const result = await toggleCommentLike(id, authUser.userId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
