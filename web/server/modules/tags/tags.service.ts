import { eq, and, or, ilike, inArray, desc, asc, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { tags, postTags, posts } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import {
  tagCache,
  invalidateTagCaches,
} from "@/server/common/server-cache";
import {
  assertValidTagInput,
  foldTagKey,
  normalizeSearchQuery,
  validateTagInput,
} from "./tag-normalizer";
import type {
  TagCreateResult,
  TagItem,
  TagSearchResult,
  TagStatus,
  TagSuggestResult,
  TagSummary,
} from "./tags.types";

export type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete" | "execute">;

type RawTagRow = typeof tags.$inferSelect;

export const MAX_TAGS_PER_POST = 8;
const USER_DAILY_TAG_CREATE_LIMIT = 20;

export function mapTagRowToItem(r: RawTagRow): TagItem {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    status: (r.status as TagStatus) || "active",
    isOfficial: Boolean(r.isOfficial),
    usageCount: r.usageCount,
    recentUsageCount: r.recentUsageCount,
    engagementScore: r.engagementScore,
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

async function resolveMergedTarget(
  executor: DbExecutor,
  row: RawTagRow
): Promise<RawTagRow> {
  if (row.status !== "merged" || !row.mergedIntoId) {
    return row;
  }
  const [target] = await executor
    .select()
    .from(tags)
    .where(eq(tags.id, row.mergedIntoId))
    .limit(1);
  return target ?? row;
}

/**
 * Checks if any tag exists for this normalized key across ALL statuses
 * (including `restricted` / `hidden` / `merged`) so banned terms cannot be recreated.
 */
async function findAnyStatusByNorm(
  executor: DbExecutor,
  normalizedName: string,
  slug: string
): Promise<RawTagRow | null> {
  const [row] = await executor
    .select()
    .from(tags)
    .where(or(eq(tags.normalizedName, normalizedName), eq(tags.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function getTrendingTags(limit = 10): Promise<TagItem[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);
  const cacheKey = `trending:${safeLimit}`;
  const cached = tagCache.get(cacheKey) as TagItem[] | undefined;
  if (cached) return cached;

  const rows = await db
    .select()
    .from(tags)
    .where(eq(tags.status, "active"))
    .orderBy(
      desc(sql`(${tags.recentUsageCount} * 4 + ${tags.engagementScore} + ${tags.usageCount})`),
      desc(tags.isOfficial),
      sql`${tags.lastUsedAt} DESC NULLS LAST`,
      asc(tags.name)
    )
    .limit(safeLimit);

  const items = rows.map(mapTagRowToItem);
  tagCache.set(cacheKey, items, 60_000);
  return items;
}

export async function searchTags(params: {
  q?: string;
  sort?: "trending" | "popular" | "newest" | "alpha";
  limit?: number;
  offset?: number;
}): Promise<TagSearchResult> {
  const rawQ = (params.q || "").trim();
  const sort = params.sort || "trending";
  const safeLimit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const safeOffset = Math.max(params.offset ?? 0, 0);
  const folded = foldTagKey(rawQ);
  const normQ = folded.normalizedName;
  const slugQ = folded.slug;

  const cacheKey = `tags:${sort}:${normQ}:${safeLimit}:${safeOffset}`;
  const cached = tagCache.get(cacheKey) as TagSearchResult | undefined;
  if (cached) return cached;

  const conditions = [eq(tags.status, "active")];
  if (rawQ.length > 0) {
    const pattern = `%${normQ || rawQ.toLowerCase()}%`;
    const slugPattern = slugQ ? `%${slugQ}%` : pattern;
    conditions.push(
      or(
        ilike(tags.normalizedName, pattern),
        ilike(tags.slug, slugPattern),
        ilike(tags.name, `%${rawQ}%`)
      )!
    );
  }

  let orderExprs;
  if (normQ.length > 0) {
    orderExprs = [
      desc(sql`CASE WHEN ${tags.normalizedName} = ${normQ} OR ${tags.slug} = ${slugQ} THEN 3 WHEN ${tags.normalizedName} LIKE ${`${normQ}%`} THEN 2 ELSE 1 END`),
      desc(sql`(${tags.recentUsageCount} * 4 + ${tags.engagementScore} + ${tags.usageCount})`),
      asc(tags.name),
    ];
  } else if (sort === "popular") {
    orderExprs = [desc(tags.usageCount), desc(tags.engagementScore), asc(tags.name)];
  } else if (sort === "newest") {
    orderExprs = [desc(tags.createdAt)];
  } else if (sort === "alpha") {
    orderExprs = [asc(tags.name)];
  } else {
    orderExprs = [
      desc(sql`(${tags.recentUsageCount} * 4 + ${tags.engagementScore} + ${tags.usageCount})`),
      desc(tags.isOfficial),
      asc(tags.name),
    ];
  }

  const rows = await db
    .select()
    .from(tags)
    .where(and(...conditions))
    .orderBy(...orderExprs)
    .limit(safeLimit + 1)
    .offset(safeOffset);

  const hasMore = rows.length > safeLimit;
  const items = (hasMore ? rows.slice(0, safeLimit) : rows).map(mapTagRowToItem);

  let exactMatch = false;
  let canCreate = false;
  let normalizedCandidate: string | null = null;

  if (rawQ.length > 0) {
    const validation = validateTagInput(rawQ);
    if (validation.valid && validation.parts) {
      normalizedCandidate = validation.parts.name;
      const conflictRow = await findAnyStatusByNorm(
        db,
        validation.parts.normalizedName,
        validation.parts.slug
      );
      exactMatch = Boolean(conflictRow);
      canCreate = !conflictRow;
    }
  }

  const result: TagSearchResult = {
    items,
    nextOffset: hasMore ? safeOffset + safeLimit : null,
    exactMatch,
    canCreate,
    normalizedCandidate,
  };
  tagCache.set(cacheKey, result, 30_000);
  return result;
}

export async function suggestTags(query: string, limit = 8): Promise<TagSuggestResult> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const res = await searchTags({ q: query, sort: "trending", limit: safeLimit, offset: 0 });
  return {
    query: query.trim(),
    items: res.items,
    exactMatch: res.exactMatch,
    canCreate: res.canCreate,
    normalizedCandidate: res.normalizedCandidate,
  };
}

export async function getTagBySlugOrId(identifier: string): Promise<TagItem> {
  const clean = decodeURIComponent(identifier || "").trim();
  if (!clean) {
    throw AppError.notFound("Teg topilmadi");
  }

  const cacheKey = `tag:${clean.toLowerCase()}`;
  const cached = tagCache.get(cacheKey) as TagItem | undefined;
  if (cached) return cached;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const slugKey = foldTagKey(clean).slug || clean.toLowerCase();

  const [row] = await db
    .select()
    .from(tags)
    .where(isUuid ? eq(tags.id, clean) : or(eq(tags.slug, slugKey), eq(tags.slug, clean.toLowerCase())))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Teg topilmadi");
  }

  const resolved = await resolveMergedTarget(db, row);
  if (resolved.status !== "active") {
    throw AppError.notFound("Teg topilmadi");
  }

  const item = mapTagRowToItem(resolved);
  tagCache.set(cacheKey, item, 30_000);
  return item;
}

/**
 * Race-safe canonical tag lookup / creation:
 * - Normalizes Uzbek & Unicode scripts before lookup.
 * - Rejects restricted/abusive tags and honors merged canonical redirects.
 * - Enforces sliding-window rate limit + 24h DB creation quota for non-admin users.
 * - Uses `ON CONFLICT DO NOTHING` + re-select fallback to eliminate concurrent duplicate races.
 */
export async function findOrCreateTag(params: {
  name: string;
  userId: string;
  description?: string | null;
  isAdmin?: boolean;
  executor?: DbExecutor;
}): Promise<TagCreateResult> {
  const exec = params.executor ?? db;
  const parts = assertValidTagInput(params.name);

  let existing = await findAnyStatusByNorm(exec, parts.normalizedName, parts.slug);
  if (existing) {
    existing = await resolveMergedTarget(exec, existing);
    if (existing.status === "restricted") {
      throw AppError.forbidden("Ushbu teg cheklangan va undan foydalanib bo‘lmaydi");
    }
    if (existing.status === "hidden" || (existing.status === "pending" && !params.isAdmin)) {
      throw AppError.forbidden("Ushbu teg hozircha faol emas");
    }
    return { tag: mapTagRowToItem(existing), created: false };
  }

  if (!params.isAdmin) {
    enforceRateLimit(`tag_create:${params.userId}`, 10, 3600);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [quota] = await exec
      .select({ count: sql<number>`count(*)::int` })
      .from(tags)
      .where(and(eq(tags.createdBy, params.userId), sql`${tags.createdAt} >= ${cutoff}`));

    if ((quota?.count ?? 0) >= USER_DAILY_TAG_CREATE_LIMIT) {
      throw AppError.rateLimited(
        "Kunlik yangi teg yaratish limiti tugadi. Mavjud teglardan foydalaning."
      );
    }
  }

  const cleanDesc = params.description ? params.description.trim().slice(0, 300) : null;
  const [inserted] = await exec
    .insert(tags)
    .values({
      name: parts.name,
      slug: parts.slug,
      normalizedName: parts.normalizedName,
      description: cleanDesc,
      status: "active",
      isOfficial: Boolean(params.isAdmin),
      createdBy: params.userId,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    invalidateTagCaches();
    return { tag: mapTagRowToItem(inserted), created: true };
  }

  // Concurrent request won the unique constraint race — load canonical winner safely
  const winnerRaw = await findAnyStatusByNorm(exec, parts.normalizedName, parts.slug);
  if (!winnerRaw) {
    throw AppError.conflict("Tegni yaratishda raqobat xatoligi yuz berdi");
  }
  const winner = await resolveMergedTarget(exec, winnerRaw);
  if (winner.status === "restricted") {
    throw AppError.forbidden("Ushbu teg cheklangan va undan foydalanib bo‘lmaydi");
  }
  if (winner.status !== "active") {
    throw AppError.forbidden("Ushbu teg hozircha faol emas");
  }
  return { tag: mapTagRowToItem(winner), created: false };
}

/**
 * Resolves `tagIds` + raw `tagInputs` into deduplicated canonical active tags,
 * syncs `post_tags` inside the post write transaction, and maintains accurate counts.
 */
export async function resolveAndSyncPostTagsTx(
  tx: DbExecutor,
  params: {
    postId: string;
    userId: string;
    isAdmin?: boolean;
    tagInputs?: string[];
    tagIds?: string[];
    isPostActive?: boolean;
  }
): Promise<{ tagNames: string[]; tagItems: TagSummary[] }> {
  const orderedTags: TagItem[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(params.tagIds) && params.tagIds.length > 0) {
    const validIds = params.tagIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    if (validIds.length > 0) {
      const idRows = await tx.select().from(tags).where(inArray(tags.id, validIds));
      const byId = new Map<string, RawTagRow>(idRows.map((r) => [r.id, r]));
      for (const reqId of validIds) {
        if (orderedTags.length >= MAX_TAGS_PER_POST) break;
        const found = byId.get(reqId);
        if (!found) continue;
        const resolved = await resolveMergedTarget(tx, found);
        if (resolved.status === "restricted") {
          throw AppError.forbidden("Cheklangan tegdan foydalanish mumkin emas");
        }
        if (resolved.status !== "active" || seenIds.has(resolved.id)) continue;
        seenIds.add(resolved.id);
        orderedTags.push(mapTagRowToItem(resolved));
      }
    }
  }

  for (const rawName of params.tagInputs ?? []) {
    if (orderedTags.length >= MAX_TAGS_PER_POST) break;
    const trimmed = String(rawName || "").trim();
    if (!trimmed) continue;
    const { tag } = await findOrCreateTag({
      name: trimmed,
      userId: params.userId,
      isAdmin: params.isAdmin,
      executor: tx,
    });
    if (!seenIds.has(tag.id)) {
      seenIds.add(tag.id);
      orderedTags.push(tag);
    }
  }

  const prevRows = await tx
    .select({ tagId: postTags.tagId })
    .from(postTags)
    .where(eq(postTags.postId, params.postId));
  const prevSet = new Set(prevRows.map((r) => r.tagId));
  const nextSet = new Set(orderedTags.map((t) => t.id));

  const addedIds = orderedTags.map((t) => t.id).filter((id) => !prevSet.has(id));
  const removedIds = Array.from(prevSet).filter((id) => !nextSet.has(id));

  await tx.delete(postTags).where(eq(postTags.postId, params.postId));
  if (orderedTags.length > 0) {
    await tx.insert(postTags).values(
      orderedTags.map((tag, idx) => ({
        postId: params.postId,
        tagId: tag.id,
        position: idx,
      }))
    );
  }

  if (params.isPostActive !== false) {
    const now = new Date();
    if (addedIds.length > 0) {
      await tx
        .update(tags)
        .set({
          usageCount: sql`${tags.usageCount} + 1`,
          recentUsageCount: sql`${tags.recentUsageCount} + 1`,
          lastUsedAt: now,
          updatedAt: now,
        })
        .where(inArray(tags.id, addedIds));
    }
    if (removedIds.length > 0) {
      await tx
        .update(tags)
        .set({
          usageCount: sql`GREATEST(0, ${tags.usageCount} - 1)`,
          recentUsageCount: sql`GREATEST(0, ${tags.recentUsageCount} - 1)`,
          updatedAt: now,
        })
        .where(inArray(tags.id, removedIds));
    }
  }

  invalidateTagCaches();

  return {
    tagNames: orderedTags.map((t) => t.name),
    tagItems: orderedTags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  };
}

export async function detachPostTagsOnDeleteTx(tx: DbExecutor, postId: string): Promise<void> {
  const deleted = await tx
    .delete(postTags)
    .where(eq(postTags.postId, postId))
    .returning({ tagId: postTags.tagId });

  if (deleted.length > 0) {
    const tagIds = deleted.map((d) => d.tagId);
    const now = new Date();
    await tx
      .update(tags)
      .set({
        usageCount: sql`GREATEST(0, ${tags.usageCount} - 1)`,
        recentUsageCount: sql`GREATEST(0, ${tags.recentUsageCount} - 1)`,
        updatedAt: now,
      })
      .where(inArray(tags.id, tagIds));
    invalidateTagCaches();
  }
}

export async function bumpPostTagsEngagement(postId: string, delta: number): Promise<void> {
  if (!delta) return;
  const links = await db
    .select({ tagId: postTags.tagId })
    .from(postTags)
    .where(eq(postTags.postId, postId));
  if (links.length === 0) return;

  const tagIds = links.map((l) => l.tagId);
  await db
    .update(tags)
    .set({
      engagementScore:
        delta > 0
          ? sql`${tags.engagementScore} + ${delta}`
          : sql`GREATEST(0, ${tags.engagementScore} - ${Math.abs(delta)})`,
      updatedAt: new Date(),
    })
    .where(inArray(tags.id, tagIds));

  tagCache.invalidatePrefix("trending:");
}

export async function loadActiveTagsForPosts(
  postIds: string[]
): Promise<Map<string, TagSummary[]>> {
  const result = new Map<string, TagSummary[]>();
  if (postIds.length === 0) return result;

  const rows = await db
    .select({
      postId: postTags.postId,
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(and(inArray(postTags.postId, postIds), eq(tags.status, "active")))
    .orderBy(asc(postTags.position));

  for (const row of rows) {
    const list = result.get(row.postId) ?? [];
    list.push({ id: row.id, name: row.name, slug: row.slug });
    result.set(row.postId, list);
  }
  return result;
}

export function buildActivePostTagFilterCondition(tagParam: string) {
  const slugCandidate = foldTagKey(tagParam).slug || tagParam.trim().toLowerCase();
  const normCandidate = normalizeSearchQuery(tagParam);
  return sql`(
    EXISTS (
      SELECT 1 FROM ${postTags} pt
      INNER JOIN ${tags} t ON t.id = pt.tag_id
      WHERE pt.post_id = ${posts.id}
        AND t.status = 'active'
        AND (t.slug = ${slugCandidate} OR t.normalized_name = ${normCandidate || slugCandidate})
    )
    OR LOWER(${posts.category}) = ${slugCandidate}
  )`;
}

export function isNonDeletedPublishedPost(status?: string | null, deletedAt?: Date | null) {
  return !deletedAt && (status || "published") === "published";
}

export { isNull };
