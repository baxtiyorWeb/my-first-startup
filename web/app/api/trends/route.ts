import { type NextRequest } from "next/server";
import { toCompactNumber } from "@/components/format/format-utils";
import { errorResponse, successResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { getTrendingTags } from "@/server/modules/tags/tags.service";

const RANK_COLORS = [
  "text-[#3995ff]",
  "text-[#76d5f5]",
  "text-[#ff9a26]",
  "text-[#3995ff]",
  "text-[#10b981]",
];

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    enforceRateLimit(`trends:ip:${ip}`, 120, 60);

    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 5, 1), 20);
    const items = await getTrendingTags(limit);

    const formatted = items.map((item, index) => ({
      id: item.id,
      rank: index + 1,
      tag: item.name,
      slug: item.slug,
      usageCount: item.usageCount,
      count: `${toCompactNumber(item.usageCount)} post`,
      rankColor: RANK_COLORS[index % RANK_COLORS.length],
    }));

    const response = successResponse(formatted);
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
