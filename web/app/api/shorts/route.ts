import { type NextRequest } from "next/server";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { getShortsFeed } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number(searchParams.get("limit")) || 20;
    const filter = searchParams.get("filter") || "for_you";

    const result = await getShortsFeed({
      cursor,
      limit,
      currentUserId: authUser?.userId,
      filter,
    });

    const response = successResponse(result.posts, { nextCursor: result.nextCursor });
    response.headers.set(
      "Cache-Control",
      authUser ? "private, no-store" : "public, s-maxage=15, stale-while-revalidate=30"
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
