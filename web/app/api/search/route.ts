import { type NextRequest } from "next/server";
import { searchContent } from "@/server/modules/search/search.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import type { SearchCategory } from "@/types/social";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    enforceRateLimit(`search:ip:${ip}`, 60, 60);

    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
    const category = (req.nextUrl.searchParams.get("category") || "all") as SearchCategory;

    const results = await searchContent(q, limit, category);
    return successResponse(results);
  } catch (error) {
    return errorResponse(error);
  }
}
