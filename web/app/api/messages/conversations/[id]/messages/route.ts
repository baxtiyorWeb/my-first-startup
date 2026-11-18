import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { MessagesService } from "@/server/modules/messages/messages.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/messages/conversations/[id]/messages?cursor=[isoDate]&limit=30
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authUser = await requireAuth(req);
    const { id: conversationId } = await context.params;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10), 5), 100);

    const result = await MessagesService.getConversationMessages(
      authUser.userId,
      conversationId,
      cursor,
      limit
    );

    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/messages/conversations/[id]/messages
 * Send message in conversation
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const authUser = await requireAuth(req);
    const { id: conversationId } = await context.params;

    const body = await req.json().catch(() => ({}));
    const content = body.content;
    const clientMessageId = body.clientMessageId;
    const replyToId = body.replyToId;
    const messageType = body.messageType || "text";
    const mediaUrls = body.mediaUrls || [];

    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      throw AppError.badRequest("Xabar matni talab qilinadi");
    }

    const message = await MessagesService.sendMessage(authUser.userId, {
      conversationId,
      content,
      clientMessageId,
      replyToId,
      messageType,
      mediaUrls,
    });

    return successResponse({ message }, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
