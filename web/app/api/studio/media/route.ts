import { type NextRequest } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { requireAuth } from "@/server/common/auth-guard";
import { db } from "@/server/db";
import { media } from "@/server/db/schema";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const type = req.nextUrl.searchParams.get("type") || "video";

    const rows = await db
      .select({
        id: media.id,
        title: media.title,
        mediaType: media.mediaType,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        durationSeconds: media.durationSeconds,
        youtubeVideoId: media.youtubeVideoId,
        bunnyVideoId: media.bunnyVideoId,
        createdAt: media.createdAt,
      })
      .from(media)
      .where(
        type === "video"
          ? or(eq(media.mediaType, "video"), eq(media.mediaType, "youtube"))
          : eq(media.mediaType, "image")
      )
      .orderBy(desc(media.createdAt))
      .limit(40);

    return successResponse(rows);
  } catch (error) {
    return errorResponse(error);
  }
}
