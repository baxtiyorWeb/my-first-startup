import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { posts, type VideoChapter } from "@/server/db/schema";
import { isShortVideoDuration } from "@/server/common/video-metadata";
import {
  generateSeoSlug,
  extractYouTubeVideoId,
  extractBunnyIds,
} from "@/lib/seo/slugify";
import { pingIndexNow } from "@/server/modules/seo/indexnow";
import type { TagSummary } from "@/server/modules/tags/tags.types";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PostResponse {
  id: string;
  slug?: string | null;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
    intent?: string;
    isFollowing?: boolean;
  };
  title?: string | null;
  content: string;
  postType: string;
  contentKind?: string;
  status?: string;
  isIndexable?: boolean;
  locale?: string;
  category?: string;
  tags?: string[];
  tagItems?: TagSummary[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  videoUrl?: string | null;
  youtubeVideoId?: string | null;
  bunnyVideoId?: string | null;
  videoDurationSeconds?: number | null;
  isShort?: boolean;
  videoChapters?: VideoChapter[];
  transcript?: string | null;
  publishedAt?: string;
  projectUrl?: string | null;
  projectStage?: string | null;
  lookingFor?: string | null;
  mediaUrls: string[];
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

export interface PostEditorialInput {
  title?: string | null;
  slug?: string | null;
  content: string;
  postType?: string;
  contentKind?: string;
  status?: string;
  isIndexable?: boolean;
  locale?: string;
  category?: string;
  tags?: string[];
  tagIds?: string[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  videoUrl?: string | null;
  youtubeVideoId?: string | null;
  bunnyVideoId?: string | null;
  videoDurationSeconds?: number | null;
  isShort?: boolean;
  videoChapters?: VideoChapter[];
  transcript?: string | null;
  projectUrl?: string | null;
  projectStage?: string | null;
  lookingFor?: string | null;
  mediaUrls?: string[];
}

export interface PostLikeResult {
  postId: string;
  isLiked: boolean;
  liked: boolean;
  likesCount: number;
}

export interface PostBookmarkResult {
  postId: string;
  isSaved: boolean;
  saved: boolean;
}

export interface PostShareResult {
  postId: string;
  sharesCount: number;
}

export interface SyncActionInput {
  idempotencyKey: string;
  postId: string;
  action: "like" | "bookmark" | "share";
  desiredState?: boolean;
  clientTimestamp?: string;
}

export interface SyncActionOutcome {
  idempotencyKey: string;
  postId: string;
  action: "like" | "bookmark" | "share";
  status: "synced" | "not_found" | "failed";
  isLiked?: boolean;
  likesCount?: number;
  isSaved?: boolean;
  sharesCount?: number;
  error?: string;
}

export interface RawPostFeedRow {
  id: string;
  slug: string | null;
  title: string | null;
  content: string;
  postType: string;
  contentKind: string;
  status: string;
  isIndexable: boolean;
  locale: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  canonicalUrl: string | null;
  videoUrl: string | null;
  youtubeVideoId: string | null;
  bunnyVideoId: string | null;
  videoDurationSeconds: number | null;
  videoChapters: VideoChapter[];
  transcript?: string | null;
  publishedAt: Date;
  projectUrl: string | null;
  projectStage: string | null;
  lookingFor: string | null;
  mediaUrls: string[];
  readingTimeMinutes: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorRole: string;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
  authorIntent: string;
  isFollowingAuthor: boolean;
  isLiked: boolean;
  isSaved: boolean;
}

export function mapPostRowToResponse(
  r: RawPostFeedRow,
  fallbackKind = "thought",
  tagItems: TagSummary[] = []
): PostResponse {
  const displayTags =
    tagItems.length > 0
      ? tagItems.map((t) => t.name)
      : Array.isArray(r.tags)
      ? r.tags
      : [];
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    content: r.content,
    postType: r.postType || "thought",
    contentKind: r.contentKind || fallbackKind,
    status: r.status || "published",
    isIndexable: Boolean(r.isIndexable),
    locale: r.locale || "uz",
    category: r.category || "umumiy",
    tags: displayTags,
    tagItems,
    coverImageUrl: r.coverImageUrl,
    coverImageAlt: r.coverImageAlt,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    focusKeyword: r.focusKeyword,
    canonicalUrl: r.canonicalUrl,
    videoUrl: r.videoUrl,
    youtubeVideoId: r.youtubeVideoId,
    bunnyVideoId: r.bunnyVideoId,
    videoDurationSeconds: r.videoDurationSeconds,
    isShort: Boolean(r.videoUrl) && isShortVideoDuration(r.videoDurationSeconds),
    videoChapters: Array.isArray(r.videoChapters) ? r.videoChapters : [],
    transcript: r.transcript ?? null,
    publishedAt: r.publishedAt.toISOString(),
    projectUrl: r.projectUrl || null,
    projectStage: r.projectStage || null,
    lookingFor: r.lookingFor || null,
    mediaUrls: (r.mediaUrls as string[]) || [],
    readingTimeMinutes: r.readingTimeMinutes,
    likesCount: r.likesCount,
    commentsCount: r.commentsCount,
    sharesCount: r.sharesCount,
    viewsCount: r.viewsCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    isLiked: Boolean(r.isLiked),
    isSaved: Boolean(r.isSaved),
    author: {
      id: r.authorId,
      name: r.authorName,
      handle: r.authorHandle,
      role: r.authorRole,
      avatarUrl: r.authorAvatarUrl,
      verified: r.authorVerified,
      intent: r.authorIntent || "none",
      isFollowing: Boolean(r.isFollowingAuthor),
    },
  };
}

export async function resolveUniqueSlug(
  rawSlugInput: string,
  excludePostId?: string
): Promise<string> {
  const base = generateSeoSlug(rawSlugInput) || `post-${Date.now().toString(36)}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const cond = excludePostId
      ? and(eq(posts.slug, candidate), ne(posts.id, excludePostId))
      : eq(posts.slug, candidate);
    const [existing] = await db.select({ id: posts.id }).from(posts).where(cond).limit(1);
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export function getPublicRouteKind(kind: string): "articles" | "videos" | "news" | null {
  if (kind === "article") return "articles";
  if (kind === "video") return "videos";
  if (kind === "news") return "news";
  return null;
}

export function triggerSeoRevalidationAndPing(
  locale: string,
  contentKind: string,
  slug: string,
  isIndexable: boolean
): void {
  try {
    revalidatePath("/");
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/articles`);
    revalidatePath(`/${locale}/videos`);
    revalidatePath(`/${locale}/news`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/news-sitemap.xml");
    revalidatePath("/rss.xml");

    const segment = getPublicRouteKind(contentKind);
    if (isIndexable && segment && slug) {
      const publicPath = `/${locale}/${segment}/${slug}`;
      revalidatePath(publicPath);
      pingIndexNow([publicPath, `/${locale}/${segment}`]).catch(() => null);
    }
  } catch {
    // Revalidation outside request lifecycle is safe to ignore
  }
}

export function normalizeEditorialFields(input: PostEditorialInput, plainText: string) {
  const validKinds = new Set(["article", "video", "news", "thought"]);
  const contentKind = validKinds.has(input.contentKind || "")
    ? (input.contentKind as string)
    : input.videoUrl
    ? "video"
    : "thought";

  const validStatuses = new Set(["draft", "published", "archived"]);
  const status = validStatuses.has(input.status || "") ? (input.status as string) : "published";

  const validLocales = new Set(["uz", "ru", "en"]);
  const locale = validLocales.has(input.locale || "") ? (input.locale as string) : "uz";

  const sanitizedTitle = input.title ? input.title.trim().slice(0, 300) : null;
  const sanitizedMediaUrls = Array.isArray(input.mediaUrls)
    ? input.mediaUrls
        .filter(
          (u) =>
            typeof u === "string" &&
            (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/"))
        )
        .slice(0, 3)
    : [];

  const sanitizedVideoUrl = input.videoUrl ? input.videoUrl.trim().slice(0, 1000) : null;
  const ytId = input.youtubeVideoId?.trim() || extractYouTubeVideoId(sanitizedVideoUrl) || null;
  const bunnyId = input.bunnyVideoId?.trim() || extractBunnyIds(sanitizedVideoUrl).videoId || null;

  let coverImageUrl = input.coverImageUrl ? input.coverImageUrl.trim().slice(0, 1000) : null;
  if (!coverImageUrl && sanitizedMediaUrls.length > 0) {
    coverImageUrl = sanitizedMediaUrls[0];
  } else if (!coverImageUrl && ytId) {
    coverImageUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  } else if (!coverImageUrl && bunnyId && process.env.BUNNY_CDN_HOSTNAME) {
    const cdnHost = process.env.BUNNY_CDN_HOSTNAME.replace(/\/$/, "");
    coverImageUrl = `https://${cdnHost}/${bunnyId}/thumbnail.jpg`;
  }

  const sanitizedChapters: VideoChapter[] = Array.isArray(input.videoChapters)
    ? input.videoChapters
        .filter((ch) => ch && typeof ch.title === "string" && ch.title.trim().length > 0)
        .map((ch) => ({
          time: String(ch.time || "0:00").slice(0, 16),
          seconds: Math.max(0, Number(ch.seconds) || 0),
          title: ch.title.trim().slice(0, 140),
        }))
        .sort((a, b) => a.seconds - b.seconds)
    : [];

  const sanitizedTags = Array.isArray(input.tags)
    ? Array.from(
        new Set(
          input.tags
            .map((t) => String(t).replace(/^#/, "").trim().slice(0, 40))
            .filter(Boolean)
        )
      ).slice(0, 10)
    : [];

  const isEditorial = contentKind === "article" || contentKind === "video" || contentKind === "news";
  const isIndexable =
    typeof input.isIndexable === "boolean"
      ? input.isIndexable
      : isEditorial &&
        status === "published" &&
        (Boolean(sanitizedTitle) || Boolean(sanitizedVideoUrl)) &&
        plainText.length >= 40;

  return {
    contentKind,
    status,
    locale,
    isIndexable,
    category: (input.category || "umumiy").trim().toLowerCase().slice(0, 64) || "umumiy",
    tags: sanitizedTags,
    sanitizedTitle,
    sanitizedMediaUrls,
    coverImageUrl,
    coverImageAlt: input.coverImageAlt ? input.coverImageAlt.trim().slice(0, 255) : null,
    seoTitle: input.seoTitle ? input.seoTitle.trim().slice(0, 180) : null,
    seoDescription: input.seoDescription ? input.seoDescription.trim().slice(0, 340) : null,
    focusKeyword: input.focusKeyword ? input.focusKeyword.trim().slice(0, 120) : null,
    canonicalUrl: input.canonicalUrl ? input.canonicalUrl.trim().slice(0, 500) : null,
    videoUrl: sanitizedVideoUrl,
    youtubeVideoId: ytId,
    bunnyVideoId: bunnyId,
    videoDurationSeconds:
      typeof input.videoDurationSeconds === "number" && input.videoDurationSeconds > 0
        ? Math.floor(input.videoDurationSeconds)
        : null,
    videoChapters: sanitizedChapters,
    transcript: input.transcript ? input.transcript.trim() : null,
  };
}
