import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { syncPostActionsBatch } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { AppError } from "@/server/common/errors";

const SyncItemSchema = z.object({
  idempotencyKey: z.string().min(4).max(120),
  postId: z.string().uuid("Post identifikatori noto‘g‘ri"),
  action: z.enum(["like", "bookmark", "share"]),
  desiredState: z.boolean().optional(),
  clientTimestamp: z.string().optional(),
});

const SyncBatchSchema = z.object({
  actions: z.array(SyncItemSchema).min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    enforceRateLimit(`actions_sync:${authUser.userId}`, 60, 60);

    const body = await req.json().catch(() => ({}));
    const parsed = SyncBatchSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation(
        "Sinxronizatsiya ma’lumotlari yaroqsiz",
        parsed.error.issues.map((issue) => ({
          field: String(issue.path.join(".")),
          issue: issue.message,
        }))
      );
    }

    const results = await syncPostActionsBatch(authUser.userId, parsed.data.actions);
    return successResponse({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
