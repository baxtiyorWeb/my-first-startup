import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { MessagesService } from "@/server/modules/messages/messages.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/conversations
 * List all active conversations of current user
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const conversations = await MessagesService.getUserConversations(authUser.userId);
    return successResponse({ conversations });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/messages/conversations
 * Initiate or retrieve a 1-to-1 direct conversation with a user
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const targetIdentifier = body.recipientId || body.recipientHandle;

    if (!targetIdentifier) {
      throw AppError.badRequest("recipientId yoki recipientHandle talab qilinadi");
    }

    const conversation = await MessagesService.getOrCreateDirectConversation(
      authUser.userId,
      targetIdentifier
    );

    return successResponse({ conversation });
  } catch (err) {
    return errorResponse(err);
  }
}
