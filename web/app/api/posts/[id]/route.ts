import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, getOptionalAuth } from "@/server/common/auth-guard";
import { deletePost, getPostById, updatePost } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";

const VideoChapterSchema = z.object({
  time: z.string().max(16),
  seconds: z.number().min(0),
  title: z.string().min(1).max(140),
});

const UpdatePostSchema = z.object({
  title: z.string().max(300).optional().nullable(),
  slug: z.string().max(240).optional().nullable(),
  content: z
    .string()
    .trim()
    .min(1, "Post matni bo‘sh bo‘lishi mumkin emas"),
  postType: z.enum(["thought", "project"]).optional(),
  contentKind: z.enum(["article", "video", "news", "thought"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isIndexable: z.boolean().optional(),
  locale: z.enum(["uz", "ru", "en"]).optional(),
  category: z.string().max(64).optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
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
  videoChapters: z.array(VideoChapterSchema).max(50).optional(),
  transcript: z.string().optional().nullable(),
  mediaUrls: z
    .array(z.string().url("Noto‘g‘ri rasm havolasi").or(z.string().startsWith("/")))
    .max(3, "Ko‘pi bilan 3 tagacha rasm yuklash mumkin")
    .optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getOptionalAuth(req);
    const { id } = await params;

    const post = await getPostById(id, authUser?.userId);
    return successResponse(post);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parseResult = UpdatePostSchema.safeParse(body);

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

    const updated = await updatePost(id, authUser.userId, parseResult.data);

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { id } = await params;

    await deletePost(id, authUser.userId);
    return successResponse({ message: "Post muvaffaqiyatli o‘chirildi" });
  } catch (error) {
    return errorResponse(error);
  }
}
