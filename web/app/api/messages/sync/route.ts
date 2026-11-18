import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { MessagesService } from "@/server/modules/messages/messages.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/sync?since=[isoDate]
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    if (!since) {
      throw AppError.badRequest("since parametr talab qilinadi");
    }

    const missedMessages = await MessagesService.syncMissedMessages(authUser.userId, since);
    return successResponse({ messages: missedMessages });
  } catch (err) {
    return errorResponse(err);
  }
}
