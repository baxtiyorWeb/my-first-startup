import { type NextRequest } from "next/server";
import { z } from "zod";
import { getOptionalAuth, requireAuth } from "@/server/common/auth-guard";
import { getFeed, createPost } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";

const VideoChapterSchema = z.object({
  time: z.string().max(16),
  seconds: z.number().min(0),
  title: z.string().min(1).max(140),
});

const MediaUrlSchema = z
  .string()
  .url("Noto‘g‘ri rasm havolasi")
  .or(z.string().startsWith("/"));

const CreatePostSchema = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    content: z.string().optional().default(""),
    postType: z.enum(["thought", "project"]).optional().default("thought"),
    contentKind: z.enum(["article", "video", "news", "thought"]).optional().default("thought"),
    status: z.enum(["draft", "published", "archived"]).optional().default("published"),
    isIndexable: z.boolean().optional(),
    locale: z.enum(["uz", "ru", "en"]).optional().default("uz"),
    category: z.string().max(64).optional().default("umumiy"),
    tags: z.array(z.string().max(40)).max(10).optional().default([]),
    tagIds: z.array(z.string().uuid()).max(8).optional(),
    coverImageUrl: z.string().optional().nullable(),
    coverImageAlt: z.string().max(255).optional().nullable(),
    seoTitle: z.string().max(180).optional().nullable(),
    seoDescription: z.string().max(340).optional().nullable(),
    focusKeyword: z.string().max(120).optional().nullable(),
    canonicalUrl: z.string().max(500).optional().nullable(),
    videoUrl: z.string().optional().nullable(),
    youtubeVideoId: z.string().max(64).optional().nullable(),
    bunnyVideoId: z.string().max(128).optional().nullable(),
    videoDurationSeconds: z.number().int().min(0).optional().nullable(),
    videoChapters: z.array(VideoChapterSchema).max(50).optional().default([]),
    transcript: z.string().optional().nullable(),
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
      .array(MediaUrlSchema)
      .max(3, "Ko‘pi bilan 3 tagacha rasm yuklash mumkin")
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const hasMedia =
      (Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0) ||
      Boolean(data.videoUrl && data.videoUrl.trim());
    const trimmed = (data.content || "").trim();
    if (!hasMedia && trimmed.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Post matni kamida 5 ta belgidan iborat bo‘lishi kerak",
      });
    }
  });

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number(searchParams.get("limit")) || 20;
    const typeParam = searchParams.get("type");
    const kindParam = searchParams.get("kind");
    const tagParam = searchParams.get("tag") || undefined;
    const postType = typeParam === "thought" || typeParam === "project" ? typeParam : undefined;
    const contentKind =
      kindParam === "article" || kindParam === "video" || kindParam === "news" || kindParam === "thought"
        ? kindParam
        : undefined;

    const result = await getFeed(
      cursor,
      limit,
      authUser?.userId,
      postType,
      contentKind,
      tagParam
    );
    const response = successResponse(result.posts, { nextCursor: result.nextCursor });
    response.headers.set(
      "Cache-Control",
      authUser ? "private, no-store" : "public, s-maxage=15, stale-while-revalidate=30"
    );
    return response;
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
      const issues = parseResult.error.issues.map((e) => ({
        field: String(e.path[0] ?? ""),
        issue: e.message,
      }));
      throw AppError.validation(
        issues[0]?.issue || "Post ma’lumotlari noto‘g‘ri",
        issues
      );
    }

    const newPost = await createPost(authUser.userId, parseResult.data);
    return successResponse(newPost, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
