import { eq, and, or, ilike, desc, asc, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { tags, postTags, posts } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import {
  invalidateFeedCaches,
  invalidateTagCaches,
} from "@/server/common/server-cache";
import { assertValidTagInput, foldTagKey } from "./tag-normalizer";
import { mapTagRowToItem } from "./tags.service";
import type { AdminTagUpdateInput, TagItem, TagStatus } from "./tags.types";

const ALLOWED_STATUSES = new Set<TagStatus>([
  "active",
  "pending",
  "restricted",
  "hidden",
  "merged",
]);

export async function adminListTags(params: {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: TagItem[]; nextOffset: number | null }> {
  const safeLimit = Math.min(Math.max(params.limit ?? 30, 1), 100);
  const safeOffset = Math.max(params.offset ?? 0, 0);
  const conditions = [];

  if (params.status && ALLOWED_STATUSES.has(params.status as TagStatus)) {
    conditions.push(eq(tags.status, params.status));
  }
  const rawQ = (params.q || "").trim();
  if (rawQ) {
    const norm = foldTagKey(rawQ).normalizedName || rawQ.toLowerCase();
    conditions.push(
      or(
        ilike(tags.normalizedName, `%${norm}%`),
        ilike(tags.slug, `%${norm}%`),
        ilike(tags.name, `%${rawQ}%`)
      )!
    );
  }

  const rows = await db
    .select()
    .from(tags)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tags.updatedAt), desc(tags.usageCount), asc(tags.name))
    .limit(safeLimit + 1)
    .offset(safeOffset);

  const hasMore = rows.length > safeLimit;
  const items = (hasMore ? rows.slice(0, safeLimit) : rows).map(mapTagRowToItem);
  return {
    items,
    nextOffset: hasMore ? safeOffset + safeLimit : null,
  };
}

export async function adminUpdateTag(
  tagId: string,
  input: AdminTagUpdateInput
): Promise<TagItem> {
  const [existing] = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
  if (!existing) {
    throw AppError.notFound("Teg topilmadi");
  }

  const updates: Partial<typeof tags.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const parts = assertValidTagInput(input.name);
    const [conflict] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(or(eq(tags.normalizedName, parts.normalizedName), eq(tags.slug, parts.slug)))
      .limit(1);
    if (conflict && conflict.id !== tagId) {
      throw AppError.conflict("Bunday nomdagi teg allaqachon mavjud. Birlashtirishdan foydalaning.");
    }
    updates.name = parts.name;
    updates.normalizedName = parts.normalizedName;
    updates.slug = parts.slug;
  }

  if (input.description !== undefined) {
    updates.description = input.description ? input.description.trim().slice(0, 300) : null;
  }
  if (input.status !== undefined) {
    if (!ALLOWED_STATUSES.has(input.status)) {
      throw AppError.validation("Noto‘g‘ri teg holati");
    }
    updates.status = input.status;
  }
  if (input.isOfficial !== undefined) {
    updates.isOfficial = Boolean(input.isOfficial);
  }

  const [updated] = await db
    .update(tags)
    .set(updates)
    .where(eq(tags.id, tagId))
    .returning();

  invalidateTagCaches();
  invalidateFeedCaches();
  return mapTagRowToItem(updated);
}

/**
 * Atomically merges `sourceTagId` into `targetTagId`, reassigning all post links,
 * syncing `posts.tags` JSONB snapshots, recalculating usage stats, and marking source merged.
 */
export async function adminMergeTags(
  sourceTagId: string,
  targetTagId: string
): Promise<TagItem> {
  if (sourceTagId === targetTagId) {
    throw AppError.badRequest("Manba va maqsad teg bir xil bo‘lishi mumkin emas");
  }

  const mergedTarget = await db.transaction(async (tx) => {
    const [source] = await tx.select().from(tags).where(eq(tags.id, sourceTagId)).limit(1);
    const [target] = await tx.select().from(tags).where(eq(tags.id, targetTagId)).limit(1);

    if (!source || !target) {
      throw AppError.notFound("Teg topilmadi");
    }
    if (target.status === "merged" || target.status === "restricted") {
      throw AppError.badRequest("Faol bo‘lmagan tegga birlashtirib bo‘lmaydi");
    }

    const sourceLinks = await tx
      .select({ postId: postTags.postId, position: postTags.position, createdAt: postTags.createdAt })
      .from(postTags)
      .where(eq(postTags.tagId, sourceTagId));

    const affectedPostIds = sourceLinks.map((l) => l.postId);

    for (const link of sourceLinks) {
      await tx
        .insert(postTags)
        .values({
          postId: link.postId,
          tagId: targetTagId,
          position: link.position,
          createdAt: link.createdAt,
        })
        .onConflictDoNothing({ target: [postTags.postId, postTags.tagId] });
    }

    await tx.delete(postTags).where(eq(postTags.tagId, sourceTagId));

    await tx
      .update(tags)
      .set({
        status: "merged",
        mergedIntoId: targetTagId,
        usageCount: 0,
        recentUsageCount: 0,
        engagementScore: 0,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, sourceTagId));

    const [stats] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        recent: sql<number>`count(*) filter (where ${posts.createdAt} >= now() - interval '14 days')::int`,
        eng: sql<number>`coalesce(sum(${posts.likesCount} * 2 + ${posts.sharesCount} * 3 + ${posts.commentsCount}), 0)::int`,
      })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(and(eq(postTags.tagId, targetTagId), isNull(posts.deletedAt), eq(posts.status, "published")));

    const [updatedTarget] = await tx
      .update(tags)
      .set({
        usageCount: stats?.total ?? 0,
        recentUsageCount: stats?.recent ?? 0,
        engagementScore: stats?.eng ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, targetTagId))
      .returning();

    if (affectedPostIds.length > 0) {
      const rebuilt = await tx
        .select({ postId: postTags.postId, tagName: tags.name })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(and(inArray(postTags.postId, affectedPostIds), eq(tags.status, "active")))
        .orderBy(asc(postTags.position));

      const namesByPost = new Map<string, string[]>();
      for (const row of rebuilt) {
        const list = namesByPost.get(row.postId) ?? [];
        list.push(row.tagName);
        namesByPost.set(row.postId, list);
      }
      for (const pid of affectedPostIds) {
        await tx
          .update(posts)
          .set({ tags: namesByPost.get(pid) ?? [] })
          .where(eq(posts.id, pid));
      }
    }

    return updatedTarget;
  });

  invalidateTagCaches();
  invalidateFeedCaches();
  return mapTagRowToItem(mergedTarget);
}
