/**
 * Pure isomorphic formatting helpers (safe for Server Components, Route Handlers, and Client Components).
 */

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&bull;": "•",
  "&laquo;": "«",
  "&raquo;": "»",
};

const ENTITY_REGEX = /&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/gi;
const HAS_HTML_REGEX = /<[a-z][\s\S]*>/i;
const ALL_TAGS_REGEX = /<\/?[a-z][a-z0-9_-]*(?:\s+[^>]*?)?\/?>/gi;

/**
 * Pure isomorphic entity decoder
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes("&")) return str;

  return str.replace(ENTITY_REGEX, (match) => {
    const lower = match.toLowerCase();
    if (HTML_ENTITIES[lower]) {
      return HTML_ENTITIES[lower];
    }
    // Handle numeric decimal entities (&#123;)
    if (match.startsWith("&#") && !match.startsWith("&#x")) {
      const num = parseInt(match.slice(2, -1), 10);
      if (!isNaN(num) && num > 0 && num < 65536) {
        return String.fromCharCode(num);
      }
    }
    // Handle numeric hex entities (&#x1f600;)
    if (match.startsWith("&#x") || match.startsWith("&#X")) {
      const num = parseInt(match.slice(3, -1), 16);
      if (!isNaN(num) && num > 0 && num < 65536) {
        return String.fromCharCode(num);
      }
    }
    return match;
  });
}

/**
 * Strips all HTML tags and returns clean, unescaped plain text
 */
export function stripHtmlToCleanText(html: string): string {
  if (!html) return "";
  if (!HAS_HTML_REGEX.test(html) && !html.includes("&")) {
    return html.trim();
  }

  // 1. Replace block tag endings with space so adjacent blocks don't smash together
  const separated = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");

  // 2. Strip all remaining tags
  const withoutTags = separated.replace(ALL_TAGS_REGEX, "");

  // 3. Decode HTML entities
  const decoded = decodeHtmlEntities(withoutTags);

  // 4. Normalize multiple whitespaces into a single clean space
  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * Generates an excerpt cleanly truncated at word boundaries
 */
export function createExcerpt(content: string, maxLength = 160): string {
  const clean = stripHtmlToCleanText(content);
  if (!clean || clean.length <= maxLength) return clean;

  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  // If there's a space reasonably close to the end, cut at the space
  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

/**
 * Compact number formatter (1.2K, 3.4M)
 */
export function toCompactNumber(count: number): string {
  if (typeof count !== "number" || isNaN(count)) return "0";
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}
