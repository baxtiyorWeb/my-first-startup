import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { togglePostLike } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await params;

    const result = await togglePostLike(id, authUser.userId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
