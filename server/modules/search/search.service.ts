import { ilike, or, and, isNull, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { users, posts } from "@/server/db/schema";
import type { SearchItem, SearchCategory, SearchResponse } from "@/types/social";
import { stripHtmlToPlainText } from "@/server/common/sanitizer";

/**
 * Builds search patterns that match Uzbek apostrophe variations and Cyrillic equivalents
 * e.g. "o'zbek", "o‘zbek", "ozbek", "ўzbek" -> matched seamlessly
 */
function buildUzbekSearchPatterns(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const standardApostrophe = trimmed.replace(/[’‘'`]/g, "'");
  
  const latinFromCyrillic = standardApostrophe
    .replace(/ў/g, "o'")
    .replace(/ғ/g, "g'")
    .replace(/ш/g, "sh")
    .replace(/ч/g, "ch");

  const strippedApostrophe = latinFromCyrillic.replace(/'/g, "");
  const wildcardApostrophe = latinFromCyrillic.replace(/'/g, "%");

  const patternsSet = new Set([
    `%${trimmed}%`,
    `%${standardApostrophe}%`,
    `%${latinFromCyrillic}%`,
    `%${strippedApostrophe}%`,
    `%${wildcardApostrophe}%`
  ]);

  return Array.from(patternsSet);
}

export async function searchContent(
  query: string,
  limit = 20,
  category: SearchCategory = "all"
): Promise<SearchResponse> {
  const q = query.trim();

  if (!q) {
    return {
      items: [],
      counts: { all: 0, user: 0, post: 0 },
    };
  }

  const searchPatterns = buildUzbekSearchPatterns(q);

  try {
    const userItems: SearchItem[] = [];
    const postItems: SearchItem[] = [];

    // 1. Search Users
    if (category === "all" || category === "user") {
      const userConditions = searchPatterns.flatMap((pat) => [
        ilike(users.name, pat),
        ilike(users.handle, pat),
      ]);

      const matchedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          handle: users.handle,
          role: users.role,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(or(...userConditions))
        .limit(limit);

      for (const u of matchedUsers) {
        userItems.push({
          id: `user_${u.id}`,
          type: "user",
          title: u.name,
          subtitle: `@${u.handle} • ${u.role}`,
          href: `/dashboard/profile?user=${encodeURIComponent(u.handle)}`,
          badge: "Muallif",
          avatarUrl: u.avatarUrl || undefined,
        });
      }
    }

    // 2. Search Posts
    if (category === "all" || category === "post") {
      const postConditions = searchPatterns.flatMap((pat) => [
        ilike(posts.title, pat),
        ilike(posts.content, pat),
      ]);

      const matchedPosts = await db
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          createdAt: posts.createdAt,
          viewsCount: posts.viewsCount,
          commentsCount: posts.commentsCount,
        })
        .from(posts)
        .where(and(isNull(posts.deletedAt), or(...postConditions)))
        .orderBy(desc(posts.createdAt))
        .limit(limit);

      for (const p of matchedPosts) {
        const cleanSnippet = stripHtmlToPlainText(p.content);
        const formattedDate = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("uz-UZ", {
              month: "short",
              day: "numeric",
            })
          : undefined;

        const statsText = [
          p.viewsCount ? `${p.viewsCount} ko'rildi` : null,
          p.commentsCount ? `${p.commentsCount} izoh` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        postItems.push({
          id: `post_${p.id}`,
          type: "post",
          title: p.title || cleanSnippet.slice(0, 60),
          subtitle: cleanSnippet.slice(0, 110),
          href: `/dashboard/posts/${p.id}`,
          badge: "Fikr",
          createdAt: formattedDate,
          stats: statsText || undefined,
        });
      }
    }

    let finalItems: SearchItem[] = [];
    if (category === "user") {
      finalItems = userItems;
    } else if (category === "post") {
      finalItems = postItems;
    } else {
      finalItems = [...userItems, ...postItems].slice(0, limit);
    }

    const counts = {
      all: userItems.length + postItems.length,
      user: userItems.length,
      post: postItems.length,
    };

    return {
      items: finalItems,
      counts,
    };
  } catch (err) {
    console.error("[SEARCH] Error executing searchContent:", err);
    return {
      items: [],
      counts: { all: 0, user: 0, post: 0 },
    };
  }
}
