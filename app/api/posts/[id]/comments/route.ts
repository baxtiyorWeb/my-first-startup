import { type NextRequest } from "next/server";
import { z } from "zod";
import { getOptionalAuth, requireAuth } from "@/server/common/auth-guard";
import { getCommentsForPost, addComment } from "@/server/modules/comments/comments.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

const AddCommentSchema = z.object({
  content: z.string().min(2, "Izoh kamida 2 ta belgidan iborat bo‘lishi kerak"),
  parentId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getOptionalAuth(req);
    const { id } = await params;

    const comments = await getCommentsForPost(id, authUser?.userId);
    return successResponse(comments);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);

    // Rate limit: max 20 comments per 5 minutes per user
    enforceRateLimit(`add_comment:${authUser.userId}`, 20, 300);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parseResult = AddCommentSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Izoh ma’lumotlari noto‘g‘ri",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const comment = await addComment(
      id,
      authUser.userId,
      parseResult.data.content,
      parseResult.data.parentId
    );

    return successResponse(comment, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
