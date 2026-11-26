import { type NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { suggestTags } from "@/server/modules/tags/tags.service";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    enforceRateLimit(`tags:suggest:ip:${ip}`, 180, 60);

    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 8;

    const result = await suggestTags(q, limit);
    const response = successResponse(result.items, {
      query: result.query,
      exactMatch: result.exactMatch,
      canCreate: result.canCreate,
      normalizedCandidate: result.normalizedCandidate,
    });
    response.headers.set("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
