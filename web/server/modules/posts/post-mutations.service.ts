import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, users, postViews, slugRedirects, media } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { isShortVideoDuration } from "@/server/common/video-metadata";
import { sanitizeRichContent, stripHtmlToPlainText } from "@/server/common/sanitizer";
import { notifyFollowersNewPost } from "@/server/modules/notifications/notifications.service";
import { generateSeoSlug } from "@/lib/seo/slugify";
import {
  invalidateFeedCaches,
  invalidatePostCaches,
  invalidateTagCaches,
} from "@/server/common/server-cache";
import {
  detachPostTagsOnDeleteTx,
  resolveAndSyncPostTagsTx,
} from "@/server/modules/tags/tags.service";
import { validateTagInput } from "@/server/modules/tags/tag-normalizer";
import {
  UUID_REGEX,
  getPublicRouteKind,
  normalizeEditorialFields,
  resolveUniqueSlug,
  triggerSeoRevalidationAndPing,
  type PostEditorialInput,
  type PostResponse,
} from "./post.types";
import { getPostById } from "./post-feed.service";

async function resolveVideoDuration(videoUrl: string | null, initial: number | null) {
  if (!videoUrl) return initial;
  try {
    const [mediaRecord] = await db
      .select({ durationSeconds: media.durationSeconds })
      .from(media)
      .where(eq(media.url, videoUrl))
      .limit(1);
    if (mediaRecord?.durationSeconds && mediaRecord.durationSeconds > 0) {
      return mediaRecord.durationSeconds;
    }
  } catch {
    // Ignore lookup failure so post creation never fails
  }
  return initial;
}

export async function createPost(
  userId: string,
  input: PostEditorialInput
): Promise<PostResponse> {
  const plainText = stripHtmlToPlainText(input.content || "");
  const norm = normalizeEditorialFields(input, plainText);
  const hasMedia = norm.sanitizedMediaUrls.length > 0 || Boolean(norm.videoUrl);
  if (!hasMedia && plainText.length < 5) {
    throw AppError.validation("Post matni kamida 5 ta belgidan iborat bo‘lishi kerak");
  }

  const sanitizedContent = sanitizeRichContent(input.content || "");
  const words = plainText.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 180));
  const sanitizedProjectUrl = input.projectUrl ? input.projectUrl.trim().slice(0, 500) : null;
  const sanitizedProjectStage = input.projectStage ? input.projectStage.trim().slice(0, 50) : null;
  const sanitizedLookingFor = input.lookingFor ? input.lookingFor.trim().slice(0, 50) : null;
  const postType = input.postType === "project" ? "project" : "thought";

  const slugSource = input.slug?.trim() || norm.sanitizedTitle || plainText.slice(0, 64) || "post";
  const uniqueSlug = await resolveUniqueSlug(slugSource);
  const resolvedDurationSeconds = await resolveVideoDuration(norm.videoUrl, norm.videoDurationSeconds);
  const isShort = Boolean(norm.videoUrl) && isShortVideoDuration(resolvedDurationSeconds);

  const inlineTags = (plainText.match(/#[a-zA-Z0-9_\u0400-\u04FF\u0100-\u024F'ʻʼ]+/g) ?? [])
    .filter((tag) => validateTagInput(tag).valid)
    .slice(0, 5);
  const explicitTagsProvided = norm.tags.length > 0 || (Array.isArray(input.tagIds) && input.tagIds.length > 0);
  const tagInputs = norm.tags.length > 0 ? norm.tags : inlineTags;

  try {
    const { inserted, syncedTags } = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(posts)
        .values({
          authorId: userId,
          slug: uniqueSlug,
          title: norm.sanitizedTitle,
          content: sanitizedContent,
          postType,
          contentKind: norm.contentKind,
          status: norm.status,
          isIndexable: norm.isIndexable,
          locale: norm.locale,
          category: norm.category,
          tags: [],
          coverImageUrl: norm.coverImageUrl,
          coverImageAlt: norm.coverImageAlt,
          seoTitle: norm.seoTitle,
          seoDescription: norm.seoDescription,
          focusKeyword: norm.focusKeyword,
          canonicalUrl: norm.canonicalUrl,
          videoUrl: norm.videoUrl,
          youtubeVideoId: norm.youtubeVideoId,
          bunnyVideoId: norm.bunnyVideoId,
          videoDurationSeconds: resolvedDurationSeconds,
          videoChapters: norm.videoChapters,
          transcript: norm.transcript,
          publishedAt: new Date(),
          projectUrl: sanitizedProjectUrl,
          projectStage: sanitizedProjectStage,
          lookingFor: sanitizedLookingFor,
          mediaUrls: norm.sanitizedMediaUrls,
          readingTimeMinutes,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
        })
        .returning();

      let synced: Awaited<ReturnType<typeof resolveAndSyncPostTagsTx>> = {
        tagNames: [],
        tagItems: [],
      };
      if (explicitTagsProvided || tagInputs.length > 0) {
        try {
          synced = await resolveAndSyncPostTagsTx(tx, {
            postId: row.id,
            userId,
            tagInputs,
            tagIds: input.tagIds,
            isPostActive: norm.status === "published",
          });
        } catch (tagErr) {
          // Never fail a post solely because an auto-extracted inline hashtag hit a tag quota/restriction
          if (explicitTagsProvided) throw tagErr;
          console.warn("[POSTS] Skipping auto-extracted inline tags:", tagErr);
        }
      }

      if (synced.tagNames.length > 0) {
        await tx
          .update(posts)
          .set({ tags: synced.tagNames })
          .where(eq(posts.id, row.id));
      }

      return { inserted: row, syncedTags: synced };
    });

    const [author] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    invalidateFeedCaches();
    invalidateTagCaches();

    if (norm.status === "published") {
      notifyFollowersNewPost(userId, inserted.id, inserted.title || inserted.content).catch(() => null);
      triggerSeoRevalidationAndPing(norm.locale, norm.contentKind, uniqueSlug, norm.isIndexable);
    }

    return {
      id: inserted.id,
      slug: inserted.slug,
      title: inserted.title,
      content: inserted.content,
      postType: inserted.postType || "thought",
      contentKind: inserted.contentKind,
      status: inserted.status,
      isIndexable: inserted.isIndexable,
      locale: inserted.locale,
      category: inserted.category,
      tags: syncedTags.tagNames,
      tagItems: syncedTags.tagItems,
      coverImageUrl: inserted.coverImageUrl,
      coverImageAlt: inserted.coverImageAlt,
      seoTitle: inserted.seoTitle,
      seoDescription: inserted.seoDescription,
      focusKeyword: inserted.focusKeyword,
      canonicalUrl: inserted.canonicalUrl,
      videoUrl: inserted.videoUrl,
      youtubeVideoId: inserted.youtubeVideoId,
      bunnyVideoId: inserted.bunnyVideoId,
      videoDurationSeconds: inserted.videoDurationSeconds,
      isShort,
      videoChapters: inserted.videoChapters || [],
      transcript: inserted.transcript,
      publishedAt: inserted.publishedAt.toISOString(),
      projectUrl: inserted.projectUrl || null,
      projectStage: inserted.projectStage || null,
      lookingFor: inserted.lookingFor || null,
      mediaUrls: (inserted.mediaUrls as string[]) || [],
      readingTimeMinutes: inserted.readingTimeMinutes,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
      isLiked: false,
      isSaved: false,
      author: {
        id: author.id,
        name: author.name,
        handle: author.handle,
        role: author.role,
        avatarUrl: author.avatarUrl,
        verified: author.verified,
        intent: author.intent || "none",
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error creating post:", err);
    throw AppError.internal("Postni saqlashda xatolik yuz berdi");
  }
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("O‘chirilmoqchi bo‘lgan post topilmadi");
  }

  try {
    const [existing] = await db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!existing) {
      throw AppError.notFound("O‘chirilmoqchi bo‘lgan post topilmadi");
    }
    if (existing.authorId !== userId) {
      throw AppError.forbidden("Siz faqat o‘zingiz yozgan postlarni o‘chira olasiz");
    }

    await db.transaction(async (tx) => {
      await tx.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postId));
      await detachPostTagsOnDeleteTx(tx, postId);
    });

    invalidateFeedCaches();
    invalidateTagCaches();
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error deleting post:", err);
    throw AppError.internal("Postni o‘chirishda xatolik yuz berdi");
  }
}

export async function updatePost(
  postId: string,
  userId: string,
  data: Partial<PostEditorialInput> & { content: string }
): Promise<PostResponse> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Tahrirlanmoqchi bo‘lgan post topilmadi");
  }

  try {
    const [existing] = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        slug: posts.slug,
        contentKind: posts.contentKind,
        locale: posts.locale,
        status: posts.status,
      })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!existing) {
      throw AppError.notFound("Tahrirlanmoqchi bo‘lgan post topilmadi");
    }
    if (existing.authorId !== userId) {
      throw AppError.forbidden("Siz faqat o‘zingiz yozgan postlarni tahrirlashingiz mumkin");
    }

    const trimmedContent = typeof data.content === "string" ? data.content.trim() : "";
    if (!trimmedContent) {
      throw AppError.badRequest("Post matni bo‘sh bo‘lishi mumkin emas");
    }

    const sanitizedContent = sanitizeRichContent(trimmedContent);
    const plainText = stripHtmlToPlainText(sanitizedContent);
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

    const norm = normalizeEditorialFields(
      {
        ...data,
        contentKind: data.contentKind || existing.contentKind,
        status: data.status || existing.status,
        locale: data.locale || existing.locale,
      },
      plainText
    );

    let finalSlug = existing.slug;
    if (data.slug && data.slug.trim()) {
      const requested = generateSeoSlug(data.slug.trim());
      if (requested && requested !== existing.slug) {
        finalSlug = await resolveUniqueSlug(requested, postId);
        const redirectKind = getPublicRouteKind(norm.contentKind);
        if (existing.slug && redirectKind) {
          await db
            .insert(slugRedirects)
            .values({
              oldSlug: existing.slug,
              newSlug: finalSlug,
              contentKind: norm.contentKind,
            })
            .onConflictDoNothing();
        }
      }
    }

    // Tags are typed as hashtags inside the post content; extract valid ones here
    // so numbers like #1 or #2026 in normal prose never break editing.
    const inlineTags = (plainText.match(/#[a-zA-Z0-9_\u0400-\u04FF\u0100-\u024F'ʻʼ]+/g) ?? [])
      .filter((tag) => validateTagInput(tag).valid)
      .slice(0, 10);
    const explicitTagsProvided = data.tags !== undefined || data.tagIds !== undefined;
    const tagsProvided = explicitTagsProvided || inlineTags.length > 0;

    await db.transaction(async (tx) => {
      let updatedTagNames: string[] | undefined;
      if (tagsProvided) {
        try {
          const synced = await resolveAndSyncPostTagsTx(tx, {
            postId,
            userId,
            tagInputs: norm.tags.length > 0 ? norm.tags : inlineTags,
            tagIds: data.tagIds,
            isPostActive: norm.status === "published",
          });
          updatedTagNames = synced.tagNames;
        } catch (tagErr) {
          if (explicitTagsProvided) throw tagErr;
          console.warn("[POSTS] Skipping auto-extracted inline tags on update:", tagErr);
        }
      }

      await tx
        .update(posts)
        .set({
          slug: finalSlug,
          title: data.title !== undefined ? norm.sanitizedTitle : undefined,
          content: sanitizedContent,
          postType:
            data.postType !== undefined
              ? data.postType === "project"
                ? "project"
                : "thought"
              : undefined,
          contentKind: data.contentKind !== undefined ? norm.contentKind : undefined,
          status: data.status !== undefined ? norm.status : undefined,
          isIndexable:
            data.isIndexable !== undefined || data.contentKind !== undefined
              ? norm.isIndexable
              : undefined,
          locale: data.locale !== undefined ? norm.locale : undefined,
          category: data.category !== undefined ? norm.category : undefined,
          tags: updatedTagNames,
          coverImageUrl: data.coverImageUrl !== undefined ? norm.coverImageUrl : undefined,
          coverImageAlt: data.coverImageAlt !== undefined ? norm.coverImageAlt : undefined,
          seoTitle: data.seoTitle !== undefined ? norm.seoTitle : undefined,
          seoDescription: data.seoDescription !== undefined ? norm.seoDescription : undefined,
          focusKeyword: data.focusKeyword !== undefined ? norm.focusKeyword : undefined,
          canonicalUrl: data.canonicalUrl !== undefined ? norm.canonicalUrl : undefined,
          videoUrl: data.videoUrl !== undefined ? norm.videoUrl : undefined,
          youtubeVideoId:
            data.videoUrl !== undefined || data.youtubeVideoId !== undefined ? norm.youtubeVideoId : undefined,
          bunnyVideoId:
            data.videoUrl !== undefined || data.bunnyVideoId !== undefined ? norm.bunnyVideoId : undefined,
          videoDurationSeconds:
            data.videoDurationSeconds !== undefined ? norm.videoDurationSeconds : undefined,
          videoChapters: data.videoChapters !== undefined ? norm.videoChapters : undefined,
          transcript: data.transcript !== undefined ? norm.transcript : undefined,
          mediaUrls: data.mediaUrls !== undefined ? norm.sanitizedMediaUrls : undefined,
          readingTimeMinutes,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));
    });

    invalidateFeedCaches();
    invalidateTagCaches();

    if (norm.status === "published" && finalSlug) {
      triggerSeoRevalidationAndPing(norm.locale, norm.contentKind, finalSlug, norm.isIndexable);
    }

    return await getPostById(postId, userId);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error updating post:", err);
    throw AppError.internal("Postni tahrirlashda xatolik yuz berdi");
  }
}

export async function recordPostView(
  postId: string,
  viewerId: string
): Promise<{ incremented: boolean; viewsCount: number }> {
  if (!UUID_REGEX.test(postId)) {
    throw AppError.notFound("Post topilmadi");
  }

  try {
    const [post] = await db
      .select({ id: posts.id, authorId: posts.authorId, viewsCount: posts.viewsCount })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!post) throw AppError.notFound("Post topilmadi");

    const isSelfView = viewerId === post.authorId;
    const cutoffMs = isSelfView ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - cutoffMs);

    const [recentView] = await db
      .select({ id: postViews.id })
      .from(postViews)
      .where(
        and(
          eq(postViews.postId, postId),
          eq(postViews.viewerId, viewerId),
          sql`${postViews.viewedAt} >= ${cutoffDate}`
        )
      )
      .orderBy(desc(postViews.viewedAt))
      .limit(1);

    if (recentView) return { incremented: false, viewsCount: post.viewsCount };

    const updated = await db.transaction(async (tx) => {
      await tx.insert(postViews).values({ postId, viewerId });
      const [row] = await tx
        .update(posts)
        .set({ viewsCount: sql`${posts.viewsCount} + 1` })
        .where(eq(posts.id, postId))
        .returning({ viewsCount: posts.viewsCount });
      return row;
    });

    invalidatePostCaches(postId);
    return { incremented: true, viewsCount: updated?.viewsCount ?? post.viewsCount + 1 };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[POSTS] Error recording post view:", err);
    throw AppError.internal("Ko‘rishlar sonini yangilashda xatolik yuz berdi");
  }
}
