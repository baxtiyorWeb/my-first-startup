import { eq, and, or, desc, isNull, sql, ne, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { posts, users, slugRedirects, type VideoChapter } from "@/server/db/schema";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { TOPICS_DATA } from "@/lib/seo/data/topics";
import { GLOSSARY_DATA } from "@/lib/seo/data/glossary";
import { stripHtmlToPlainText } from "@/server/common/sanitizer";

export type PublicContentKind = "article" | "video" | "news";

export interface PublicContentItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  contentKind: PublicContentKind;
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
  transcript: string | null;
  readingTimeMinutes: number;
  wordCount: number;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  publishedAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    bio: string | null;
    avatarUrl: string | null;
    verified: boolean;
    socialLinks: { github?: string; linkedin?: string; twitter?: string; website?: string };
  };
}

function mapRowToPublicItem(r: {
  id: string;
  slug: string | null;
  title: string | null;
  content: string;
  contentKind: string;
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
  transcript: string | null;
  readingTimeMinutes: number;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  publishedAt: Date;
  updatedAt: Date;
  mediaUrls: string[];
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorRole: string;
  authorBio: string | null;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
  authorSocialLinks: { github?: string; linkedin?: string; twitter?: string; website?: string } | null;
}): PublicContentItem {
  const plain = stripHtmlToPlainText(r.content);
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  const excerpt =
    r.seoDescription?.trim() ||
    (plain.length > 190 ? `${plain.slice(0, 187).trim()}...` : plain);

  const fallbackCover =
    r.coverImageUrl ||
    (Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 ? r.mediaUrls[0] : null) ||
    (r.youtubeVideoId ? `https://i.ytimg.com/vi/${r.youtubeVideoId}/hqdefault.jpg` : null);

  return {
    id: r.id,
    slug: r.slug || r.id,
    title: r.title || "Geters Material",
    content: r.content,
    excerpt,
    contentKind:
      r.contentKind === "video" || r.contentKind === "news" ? r.contentKind : "article",
    locale: r.locale || "uz",
    category: r.category || "umumiy",
    tags: Array.isArray(r.tags) ? r.tags : [],
    coverImageUrl: fallbackCover,
    coverImageAlt: r.coverImageAlt || r.title || null,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    focusKeyword: r.focusKeyword,
    canonicalUrl: r.canonicalUrl,
    videoUrl: r.videoUrl,
    youtubeVideoId: r.youtubeVideoId,
    bunnyVideoId: r.bunnyVideoId,
    videoDurationSeconds: r.videoDurationSeconds,
    videoChapters: Array.isArray(r.videoChapters) ? r.videoChapters : [],
    transcript: r.transcript,
    readingTimeMinutes: r.readingTimeMinutes || 1,
    wordCount: words,
    likesCount: r.likesCount,
    commentsCount: r.commentsCount,
    viewsCount: r.viewsCount,
    publishedAt: r.publishedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    author: {
      id: r.authorId,
      name: r.authorName,
      handle: r.authorHandle,
      role: r.authorRole,
      bio: r.authorBio,
      avatarUrl: r.authorAvatarUrl,
      verified: r.authorVerified,
      socialLinks: r.authorSocialLinks || {},
    },
  };
}

const baseSelectFields = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  content: posts.content,
  contentKind: posts.contentKind,
  locale: posts.locale,
  category: posts.category,
  tags: posts.tags,
  coverImageUrl: posts.coverImageUrl,
  coverImageAlt: posts.coverImageAlt,
  seoTitle: posts.seoTitle,
  seoDescription: posts.seoDescription,
  focusKeyword: posts.focusKeyword,
  canonicalUrl: posts.canonicalUrl,
  videoUrl: posts.videoUrl,
  youtubeVideoId: posts.youtubeVideoId,
  bunnyVideoId: posts.bunnyVideoId,
  videoDurationSeconds: posts.videoDurationSeconds,
  videoChapters: posts.videoChapters,
  transcript: posts.transcript,
  readingTimeMinutes: posts.readingTimeMinutes,
  likesCount: posts.likesCount,
  commentsCount: posts.commentsCount,
  viewsCount: posts.viewsCount,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
  mediaUrls: posts.mediaUrls,
  authorId: users.id,
  authorName: users.name,
  authorHandle: users.handle,
  authorRole: users.role,
  authorBio: users.bio,
  authorAvatarUrl: users.avatarUrl,
  authorVerified: users.verified,
  authorSocialLinks: users.socialLinks,
};

export function getPublicKindPathSegment(kind: string): "articles" | "videos" | "news" {
  if (kind === "video") return "videos";
  if (kind === "news") return "news";
  return "articles";
}

export async function getPublishedContentList(options: {
  kind?: PublicContentKind | "all";
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: PublicContentItem[]; total: number }> {
  try {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 12));
    const offset = (page - 1) * limit;

    const conditions = [
      isNull(posts.deletedAt),
      eq(posts.status, "published"),
      eq(posts.isIndexable, true),
      eq(users.isPrivate, false),
      eq(users.isDeactivated, false),
    ];

    if (options.kind && options.kind !== "all") {
      conditions.push(eq(posts.contentKind, options.kind));
    } else {
      conditions.push(
        or(
          eq(posts.contentKind, "article"),
          eq(posts.contentKind, "video"),
          eq(posts.contentKind, "news")
        )!
      );
    }

    if (options.category && options.category !== "all") {
      conditions.push(eq(posts.category, options.category));
    }

    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim()}%`;
      conditions.push(
        or(ilike(posts.title, q), ilike(posts.content, q), ilike(posts.focusKeyword, q))!
      );
    }

    if (options.tag && options.tag.trim()) {
      const cleanTag = options.tag.trim().toLowerCase();
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${posts.tags}) t WHERE lower(t) = ${cleanTag}
      )`);
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      db
        .select(baseSelectFields)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(whereClause)
        .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(whereClause),
    ]);

    return {
      items: rows.map(mapRowToPublicItem),
      total: countRows[0]?.total || 0,
    };
  } catch (err) {
    console.error("[SEO_CONTENT] List fetch failed:", err);
    return { items: [], total: 0 };
  }
}

export interface PublicContentCategory {
  slug: string;
  count: number;
}

/**
 * Aggregates the categories actually used by published content of a given kind,
 * so every section shows its own dynamic topic list instead of a hardcoded one.
 */
export async function getPublishedContentCategories(
  kind?: PublicContentKind | "all"
): Promise<PublicContentCategory[]> {
  try {
    const conditions = [
      isNull(posts.deletedAt),
      eq(posts.status, "published"),
      eq(posts.isIndexable, true),
      eq(users.isPrivate, false),
      eq(users.isDeactivated, false),
    ];

    if (kind && kind !== "all") {
      conditions.push(eq(posts.contentKind, kind));
    } else {
      conditions.push(
        or(
          eq(posts.contentKind, "article"),
          eq(posts.contentKind, "video"),
          eq(posts.contentKind, "news")
        )!
      );
    }

    const rows = await db
      .select({ category: posts.category, count: sql<number>`count(*)::int` })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .groupBy(posts.category)
      .orderBy(desc(sql`count(*)`));

    return rows
      .map((row) => ({
        slug: (row.category || "").trim().toLowerCase(),
        count: Number(row.count) || 0,
      }))
      .filter((row) => row.slug.length > 0);
  } catch (err) {
    console.error("[SEO_CONTENT] Category aggregation failed:", err);
    return [];
  }
}

export async function getPublishedContentBySlugOrId(
  slugOrId: string,
  expectedKind?: PublicContentKind
): Promise<{
  item: PublicContentItem | null;
  redirectSlug: string | null;
  wrongKindSegment: "articles" | "videos" | "news" | null;
}> {
  try {
    const cleanSlug = slugOrId.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug);

    const matchCondition = isUuid
      ? or(eq(posts.slug, cleanSlug), eq(posts.id, cleanSlug))
      : eq(posts.slug, cleanSlug);

    const [row] = await db
      .select(baseSelectFields)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          matchCondition,
          isNull(posts.deletedAt),
          eq(posts.status, "published"),
          eq(users.isPrivate, false),
          eq(users.isDeactivated, false)
        )
      )
      .limit(1);

    if (row) {
      const mapped = mapRowToPublicItem(row);
      // If user accessed via UUID instead of canonical slug, ask caller to 301 redirect
      if (isUuid && row.slug && row.slug !== cleanSlug) {
        return {
          item: mapped,
          redirectSlug: row.slug,
          wrongKindSegment:
            expectedKind && mapped.contentKind !== expectedKind
              ? getPublicKindPathSegment(mapped.contentKind)
              : null,
        };
      }
      if (expectedKind && mapped.contentKind !== expectedKind) {
        return {
          item: mapped,
          redirectSlug: mapped.slug,
          wrongKindSegment: getPublicKindPathSegment(mapped.contentKind),
        };
      }
      return { item: mapped, redirectSlug: null, wrongKindSegment: null };
    }

    // Check slug_redirects table for 301 redirect preservation
    if (expectedKind) {
      const [redir] = await db
        .select({ newSlug: slugRedirects.newSlug })
        .from(slugRedirects)
        .where(
          and(
            eq(slugRedirects.oldSlug, cleanSlug),
            eq(slugRedirects.contentKind, expectedKind)
          )
        )
        .limit(1);
      if (redir?.newSlug) {
        return { item: null, redirectSlug: redir.newSlug, wrongKindSegment: null };
      }
    }

    return { item: null, redirectSlug: null, wrongKindSegment: null };
  } catch (err) {
    console.error("[SEO_CONTENT] Single lookup error:", err);
    return { item: null, redirectSlug: null, wrongKindSegment: null };
  }
}

export async function getRelatedContentAndPillars(options: {
  excludeId: string;
  category: string;
  tags: string[];
  title: string;
  locale: Locale;
}) {
  try {
    const relatedRows = await db
      .select(baseSelectFields)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          ne(posts.id, options.excludeId),
          isNull(posts.deletedAt),
          eq(posts.status, "published"),
          eq(posts.isIndexable, true),
          or(
            eq(posts.contentKind, "article"),
            eq(posts.contentKind, "video"),
            eq(posts.contentKind, "news")
          )
        )
      )
      .orderBy(desc(sql`(${posts.category} = ${options.category})::int`), desc(posts.publishedAt))
      .limit(4);

    // Match relevant evergreen Hub & Glossary internal links automatically
    const searchHaystack = `${options.title} ${options.category} ${options.tags.join(" ")}`.toLowerCase();

    const matchedTopics = TOPICS_DATA.filter((topic) => {
      const tLower = `${topic.slug} ${topic.title[options.locale]}`.toLowerCase();
      return (
        searchHaystack.includes(topic.slug) ||
        topic.category === options.category ||
        options.tags.some((tag) => tLower.includes(tag.toLowerCase()))
      );
    }).slice(0, 3);

    const matchedGlossary = GLOSSARY_DATA.filter((g) => {
      const term = g.term[options.locale].toLowerCase();
      return searchHaystack.includes(g.slug) || searchHaystack.includes(term.split(" ")[0]);
    }).slice(0, 3);

    return {
      relatedItems: relatedRows.map(mapRowToPublicItem),
      matchedTopics:
        matchedTopics.length > 0 ? matchedTopics : TOPICS_DATA.slice(0, 3),
      matchedGlossary:
        matchedGlossary.length > 0 ? matchedGlossary : GLOSSARY_DATA.slice(0, 3),
    };
  } catch {
    return {
      relatedItems: [],
      matchedTopics: TOPICS_DATA.slice(0, 3),
      matchedGlossary: GLOSSARY_DATA.slice(0, 3),
    };
  }
}

export async function getPublicAuthorProfile(handleParam: string) {
  try {
    const clean = handleParam.trim().replace(/^@/, "");
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          or(eq(users.handle, clean), eq(users.handle, `@${clean}`)),
          eq(users.isDeactivated, false),
          eq(users.isPrivate, false)
        )
      )
      .limit(1);

    if (!user) return null;

    const authoredRows = await db
      .select(baseSelectFields)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          eq(posts.authorId, user.id),
          isNull(posts.deletedAt),
          eq(posts.status, "published"),
          or(
            eq(posts.contentKind, "article"),
            eq(posts.contentKind, "video"),
            eq(posts.contentKind, "news"),
            eq(posts.isIndexable, true)
          )
        )
      )
      .orderBy(desc(posts.publishedAt));

    return {
      author: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        role: user.role,
        bio: user.bio,
        location: user.location,
        website: user.website,
        avatarUrl: user.avatarUrl,
        verified: user.verified,
        socialLinks: user.socialLinks || {},
        joinedAt: user.createdAt.toISOString(),
      },
      items: authoredRows.map(mapRowToPublicItem),
    };
  } catch (err) {
    console.error("[SEO_CONTENT] Author lookup failed:", err);
    return null;
  }
}

export async function getIndexableSitemapRecords() {
  try {
    const rows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        contentKind: posts.contentKind,
        locale: posts.locale,
        category: posts.category,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
        authorHandle: users.handle,
        authorName: users.name,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          isNull(posts.deletedAt),
          eq(posts.status, "published"),
          eq(posts.isIndexable, true),
          eq(users.isPrivate, false),
          eq(users.isDeactivated, false),
          or(
            eq(posts.contentKind, "article"),
            eq(posts.contentKind, "video"),
            eq(posts.contentKind, "news")
          )
        )
      )
      .orderBy(desc(posts.publishedAt));

    const authors = await db
      .select({
        handle: users.handle,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        and(
          eq(users.isBot, false),
          eq(users.isPrivate, false),
          eq(users.isDeactivated, false)
        )
      );

    return {
      contentItems: rows.map((r) => ({
        slug: r.slug || r.id,
        title: r.title || "Geters",
        kind: (r.contentKind === "video" || r.contentKind === "news"
          ? r.contentKind
          : "article") as PublicContentKind,
        locale: (LOCALES.includes(r.locale as Locale) ? r.locale : "uz") as Locale,
        category: r.category,
        updatedAt: r.updatedAt,
        publishedAt: r.publishedAt,
      })),
      authorHandles: authors.map((a) => ({
        handle: a.handle.replace(/^@/, ""),
        updatedAt: a.updatedAt,
      })),
    };
  } catch {
    return { contentItems: [], authorHandles: [] };
  }
}
