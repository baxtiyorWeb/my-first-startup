import { type NextRequest } from "next/server";
import { z } from "zod";
import { getOptionalAuth, requireAuth } from "@/server/common/auth-guard";
import { getFeed, createPost } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

const CreatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(5, "Fikr matni kamida 5 ta belgidan iborat bo‘lishi kerak"),
  postType: z.enum(["thought", "project"]).optional().default("thought"),
  projectUrl: z
    .string()
    .trim()
    .url("Noto‘g‘ri havola formati (masalan, https://example.com)")
    .optional()
    .nullable()
    .or(z.literal("")),
  projectStage: z.enum(["idea", "mvp", "launched", "scaling"]).optional().nullable(),
  lookingFor: z.enum(["cofounder", "feedback", "investment", "team"]).optional().nullable(),
  mediaUrls: z
    .array(z.string().url("Noto‘g‘ri rasm havolasi"))
    .max(3, "Ko‘pi bilan 3 tagacha rasm yuklash mumkin")
    .optional()
    .default([]),
});

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number(searchParams.get("limit")) || 20;
    const typeParam = searchParams.get("type");
    const postType = (typeParam === "thought" || typeParam === "project") ? typeParam : undefined;

    const result = await getFeed(cursor, limit, authUser?.userId, postType);
    return successResponse(result.posts, { nextCursor: result.nextCursor });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Rate limit: max 10 posts per 10 minutes per user
    enforceRateLimit(`create_post:${authUser.userId}`, 10, 600);
    const body = await req.json().catch(() => ({}));
    const parseResult = CreatePostSchema.safeParse(body);

    if (!parseResult.success) {
      throw AppError.validation(
        "Fikr ma’lumotlari noto‘g‘ri",
        parseResult.error.issues.map((e) => ({
          field: String(e.path[0] ?? ""),
          issue: e.message,
        }))
      );
    }

    const newPost = await createPost(authUser.userId, parseResult.data);
    return successResponse(newPost, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
