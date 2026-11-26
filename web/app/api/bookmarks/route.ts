import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { getBookmarkedPosts } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 40;
    const result = await getBookmarkedPosts(authUser.userId, limit);
    const response = successResponse(result);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
