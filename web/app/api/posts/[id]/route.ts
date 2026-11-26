import { type NextRequest } from "next/server";
import { requireAuth, getOptionalAuth } from "@/server/common/auth-guard";
import { deletePost, getPostById, updatePost } from "@/server/modules/posts/posts.service";
import { successResponse, errorResponse } from "@/server/common/response";

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
    const body = await req.json();

    const updated = await updatePost(id, authUser.userId, {
      title: body.title,
      slug: body.slug,
      content: body.content,
      postType: body.postType,
      contentKind: body.contentKind,
      status: body.status,
      isIndexable: body.isIndexable,
      locale: body.locale,
      category: body.category,
      tags: body.tags,
      tagIds: body.tagIds,
      coverImageUrl: body.coverImageUrl,
      coverImageAlt: body.coverImageAlt,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      focusKeyword: body.focusKeyword,
      canonicalUrl: body.canonicalUrl,
      videoUrl: body.videoUrl,
      youtubeVideoId: body.youtubeVideoId,
      bunnyVideoId: body.bunnyVideoId,
      videoDurationSeconds: body.videoDurationSeconds,
      videoChapters: body.videoChapters,
      transcript: body.transcript,
      mediaUrls: body.mediaUrls,
    });

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
