import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { MessagesService } from "@/server/modules/messages/messages.service";
import { successResponse, errorResponse } from "@/server/common/response";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/messages/conversations/[id]/read
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const authUser = await requireAuth(req);
    const { id: conversationId } = await context.params;
    const body = await req.json().catch(() => ({}));

    await MessagesService.markConversationAsRead(
      authUser.userId,
      conversationId,
      body.messageId
    );

    return successResponse({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
