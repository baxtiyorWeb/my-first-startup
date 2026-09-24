import { type NextRequest } from "next/server";
import { createHash } from "crypto";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { recordPostView } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getOptionalAuth(req);
    const { id } = await params;

    let viewerId = authUser?.userId;
    if (!viewerId) {
      // Create privacy-preserving, deterministic guest identifier
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
      const userAgent = req.headers.get("user-agent") || "";
      const hash = createHash("sha256").update(`${ip}_${userAgent}`).digest("hex").slice(0, 32);
      viewerId = `guest_${hash}`;
    }

    const result = await recordPostView(id, viewerId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
