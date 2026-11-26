import { type NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { getTagBySlugOrId } from "@/server/modules/tags/tags.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    enforceRateLimit(`tags:detail:ip:${ip}`, 120, 60);

    const { slug } = await params;
    const tag = await getTagBySlugOrId(slug);
    const response = successResponse(tag);
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
