import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { CommunityService } from "@/server/modules/community/community.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/messages?cursor=<iso>&limit=30&q=<search>
 * Cursor-based history. With `q` the endpoint searches message text instead.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("q");
    const limitParam = Number.parseInt(searchParams.get("limit") || "30", 10);

    const result = await CommunityService.listMessages(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      {
        cursor,
        search,
        limit: Number.isFinite(limitParam) ? limitParam : 30,
      }
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/community/messages
 * Text, attachments, or reply to any message in the community.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const message = await CommunityService.sendMessage(
      { userId: authUser.userId, role: authUser.role, email: authUser.email },
      {
        content: typeof body.content === "string" ? body.content : "",
        attachments: body.attachments,
        replyToId: typeof body.replyToId === "string" ? body.replyToId : null,
        clientMessageId:
          typeof body.clientMessageId === "string" ? body.clientMessageId : null,
      }
    );

    return successResponse({ message }, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
