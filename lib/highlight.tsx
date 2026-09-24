import React from "react";

/**
 * Escapes special characters for regular expression matching,
 * and allows matching any Uzbek apostrophe variation interchangeably.
 */
export function escapeRegExp(str: string): string {
  const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match any apostrophe variant (' , ‘ , ’ , `)
  return escaped.replace(/[''‘’`]/g, "[''‘’`]");
}

/**
 * Extracts search tokens: full trimmed query and any words with length >= 2
 */
export function getSearchTokens(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
  return Array.from(new Set([trimmed, ...words]));
}

/**
 * Creates a case-insensitive regular expression matching all search tokens
 */
export function getSearchHighlightRegex(query: string): RegExp | null {
  const tokens = getSearchTokens(query);
  if (tokens.length === 0) return null;
  const pattern = tokens.map(escapeRegExp).join("|");
  return new RegExp(`(${pattern})`, "gi");
}

interface HighlightTextProps {
  text: string;
  query?: string;
  className?: string;
}

/**
 * Renders text with search keyword matches highlighted in a modern amber badge
 */
export function HighlightText({
  text,
  query,
  className = "",
}: HighlightTextProps) {
  if (!query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = getSearchHighlightRegex(query);
  if (!regex) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        regex.lastIndex = 0;
        const isMatch = regex.test(part);
        if (isMatch) {
          return (
            <mark
              key={i}
              className="bg-amber-300/40 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded ring-1 ring-amber-400/30 inline-block"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
