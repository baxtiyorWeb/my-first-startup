import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { applyPostLike } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { AppError } from "@/server/common/errors";

const ActionBodySchema = z.object({
  desiredState: z.boolean().optional(),
  idempotencyKey: z.string().min(1).max(120).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    enforceRateLimit(`like:${authUser.userId}`, 120, 60);
    const { id } = await params;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = ActionBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw AppError.validation("Noto‘g‘ri so‘rov ma’lumotlari");
    }

    const headerKey = req.headers.get("idempotency-key")?.trim() || undefined;
    const result = await applyPostLike(id, authUser.userId, {
      desiredState: parsed.data.desiredState,
      idempotencyKey: parsed.data.idempotencyKey || headerKey,
    });
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
