import { type NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { getTrendingTags } from "@/server/modules/tags/tags.service";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    enforceRateLimit(`tags:trending:ip:${ip}`, 120, 60);

    const limit = Number(req.nextUrl.searchParams.get("limit")) || 12;
    const tagsList = await getTrendingTags(limit);

    const response = successResponse(tagsList);
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
