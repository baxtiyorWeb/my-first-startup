import { type NextRequest } from "next/server";
import { requireAuth, getOptionalAuth } from "@/server/common/auth-guard";
import { deletePost, getPostById } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getOptionalAuth(req);
    const { id } = await params;

    const post = await getPostById(id, authUser?.userId);
    return successResponse(post);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await params;

    await deletePost(id, authUser.userId);
    return successResponse({ message: "Fikr muvaffaqiyatli o‘chirildi" });
  } catch (error) {
    return errorResponse(error);
  }
}
