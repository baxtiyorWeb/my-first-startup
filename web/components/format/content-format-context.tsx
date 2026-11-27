"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { HighlightText, getSearchHighlightRegex } from "@/lib/highlight";
import {
  decodeHtmlEntities,
  stripHtmlToCleanText,
  createExcerpt,
  toCompactNumber,
} from "./format-utils";

export {
  decodeHtmlEntities,
  stripHtmlToCleanText,
  createExcerpt,
  toCompactNumber,
};

/**
 * Configuration options for content formatting
 */
export interface FormatOptions {
  searchQuery?: string;
  className?: string;
  maxLength?: number;
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  preserveFormatting?: boolean;
}

export interface ContentFormatContextValue {
  /**
   * Safely render full rich content (HTML/Markdown) with styling, sanitized against XSS
   */
  format: (content: string, options?: FormatOptions) => React.ReactNode;

  /**
   * Strip all HTML tags and unescape entities, returning pure plain text
   */
  stripHtml: (content: string) => string;

  /**
   * Generate a clean preview/excerpt of text at word boundaries with ellipsis
   */
  getExcerpt: (content: string, maxLength?: number) => string;

  /**
   * Highlight search keywords inside plain text
   */
  highlight: (text: string, query?: string, className?: string) => React.ReactNode;

  /**
   * Format compact numbers (e.g. 1500 -> "1.5K", 2300000 -> "2.3M")
   */
  formatCompactNumber: (count: number) => string;
}

const HAS_HTML_REGEX = /<[a-z][\s\S]*>/i;

/**
 * Client-side DOM Sanitizer for rich HTML
 */
function sanitizeHtmlSafe(html: string, searchQuery?: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    // Robust server-side regex strip of dangerous tags, unquoted/quoted event handlers, and javascript: schemes
    return html
      .replace(
        /<\/?(script|iframe|object|embed|svg|style|link|meta|base|form|input|button)\b[^>]*>/gi,
        ""
      )
      .replace(/\s+on[a-z0-9_-]+(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, "")
      .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const allowedTags = new Set([
      "h2",
      "h3",
      "h4",
      "p",
      "div",
      "blockquote",
      "pre",
      "code",
      "mark",
      "strong",
      "b",
      "em",
      "i",
      "ul",
      "ol",
      "li",
      "a",
      "br",
      "span",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
    ]);

    const cleanNode = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (!allowedTags.has(tagName)) {
            while (el.firstChild) {
              node.insertBefore(el.firstChild, el);
            }
            node.removeChild(el);
            continue;
          }

          if (
            (tagName === "p" || tagName === "div") &&
            !el.textContent?.trim() &&
            !el.querySelector("br")
          ) {
            el.appendChild(doc.createElement("br"));
          }

          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            if (
              tagName === "a" &&
              (attrName === "href" || attrName === "title")
            ) {
              const val = attr.value.toLowerCase().trim();
              if (val.startsWith("javascript:") || val.startsWith("data:")) {
                el.removeAttribute(attr.name);
              } else {
                el.setAttribute("target", "_blank");
                el.setAttribute("rel", "noopener noreferrer nofollow");
              }
            } else if (attrName === "class") {
              // allow class
            } else {
              el.removeAttribute(attr.name);
            }
          }

          cleanNode(child);
        }
      }
    };

    cleanNode(doc.body);

    // Apply search query highlight if present
    if (searchQuery && searchQuery.trim()) {
      const regex = getSearchHighlightRegex(searchQuery);
      if (regex) {
        const walker = doc.createTreeWalker(
          doc.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
          textNodes.push(walker.currentNode as Text);
        }

        for (const textNode of textNodes) {
          if (!textNode.nodeValue) continue;
          regex.lastIndex = 0;
          if (!regex.test(textNode.nodeValue)) continue;

          regex.lastIndex = 0;
          const parts = textNode.nodeValue.split(regex);
          const fragment = doc.createDocumentFragment();

          for (const part of parts) {
            if (!part) continue;
            regex.lastIndex = 0;
            if (regex.test(part)) {
              const mark = doc.createElement("mark");
              mark.className =
                "bg-amber-300/40 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded ring-1 ring-amber-400/40 inline-block";
              mark.textContent = part;
              fragment.appendChild(mark);
            } else {
              fragment.appendChild(doc.createTextNode(part));
            }
          }

          textNode.parentNode?.replaceChild(fragment, textNode);
        }
      }
    }

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

/**
 * Universal content formatting utility instance (can be imported directly anywhere)
 */
export const contentFormat = {
  stripHtml: stripHtmlToCleanText,
  getExcerpt: createExcerpt,
  decodeEntities: decodeHtmlEntities,
  formatCompactNumber: toCompactNumber,
  sanitizeHtml: sanitizeHtmlSafe,
};

const ContentFormatContext = createContext<ContentFormatContextValue | null>(
  null
);

export function ContentFormatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const stripHtml = useCallback((content: string) => {
    return stripHtmlToCleanText(content);
  }, []);

  const getExcerpt = useCallback((content: string, maxLength?: number) => {
    return createExcerpt(content, maxLength);
  }, []);

  const highlight = useCallback(
    (text: string, query?: string, className?: string) => {
      return <HighlightText text={text} query={query} className={className} />;
    },
    []
  );

  const formatCompactNumber = useCallback((count: number) => {
    return toCompactNumber(count);
  }, []);

  const format = useCallback(
    (content: string, options?: FormatOptions) => {
      if (!content) return null;
      const isHtml = HAS_HTML_REGEX.test(content);

      if (!isHtml) {
        return (
          <p
            className={`whitespace-pre-wrap break-words leading-relaxed ${options?.className || ""}`}
          >
            <HighlightText text={content} query={options?.searchQuery} />
          </p>
        );
      }

      const sanitized = sanitizeHtmlSafe(content, options?.searchQuery);

      return (
        <div
          className={`rich-content prose prose-slate dark:prose-invert max-w-none leading-relaxed text-slate-800 dark:text-slate-200
            [&_b]:font-bold [&_b]:text-slate-900 [&_b]:dark:text-slate-100
            [&_strong]:font-bold [&_strong]:text-slate-900 [&_strong]:dark:text-slate-100
            [&_i]:italic [&_em]:italic
            [&_h2]:text-base [&_h2]:sm:text-lg [&_h2]:font-bold [&_h2]:text-slate-950 [&_h2]:dark:text-slate-50 [&_h2]:mt-2.5 [&_h2]:mb-1.5
            [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:dark:border-slate-700 [&_blockquote]:pl-3.5 [&_blockquote]:my-2 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:dark:text-slate-400 [&_blockquote]:bg-slate-50/60 [&_blockquote]:dark:bg-slate-800/30 [&_blockquote]:py-1 [&_blockquote]:rounded-r
            [&_code]:font-mono [&_code]:text-[12px] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:text-slate-800 [&_code]:dark:text-slate-200 [&_code]:border [&_code]:border-slate-200/80 [&_code]:dark:border-slate-700
            [&_mark]:bg-amber-100 [&_mark]:dark:bg-amber-950/60 [&_mark]:text-amber-950 [&_mark]:dark:text-amber-200 [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded
            [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-1.5 [&_ul]:space-y-0.5
            [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-1.5 [&_ol]:space-y-0.5
            [&_p]:my-1 [&_p]:min-h-[1.5em]
            [&_div]:min-h-[1.5em]
            [&_p:empty]:min-h-[1.5em]
            [&_div:empty]:min-h-[1.5em]
            [&_a]:text-blue-600 [&_a]:dark:text-[#2dd4bf] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80
            ${options?.className || ""}`}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    },
    []
  );

  const value = useMemo<ContentFormatContextValue>(
    () => ({
      format,
      stripHtml,
      getExcerpt,
      highlight,
      formatCompactNumber,
    }),
    [format, stripHtml, getExcerpt, highlight, formatCompactNumber]
  );

  return (
    <ContentFormatContext.Provider value={value}>
      {children}
    </ContentFormatContext.Provider>
  );
}

/**
 * Senior hook to access content formatting anywhere in the React tree.
 * Gracefully falls back to pure utility methods if used outside Provider!
 */
export function useContentFormat(): ContentFormatContextValue {
  const ctx = useContext(ContentFormatContext);
  if (ctx) return ctx;

  // Graceful standalone fallback (can be used anywhere without crashing)
  return {
    format: (content: string, options?: FormatOptions) => {
      const isHtml = HAS_HTML_REGEX.test(content);
      if (!isHtml) {
        return <HighlightText text={content} query={options?.searchQuery} />;
      }
      const sanitized = sanitizeHtmlSafe(content, options?.searchQuery);
      return (
        <div
          className={`rich-content ${options?.className || ""}`}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    },
    stripHtml: stripHtmlToCleanText,
    getExcerpt: createExcerpt,
    highlight: (text: string, query?: string, className?: string) => (
      <HighlightText text={text} query={query} className={className} />
    ),
    formatCompactNumber: toCompactNumber,
  };
}

/**
 * Reusable <FormattedContent /> Component
 * Safely renders rich HTML or plain text with styling and optional search highlights
 */
export function FormattedContent({
  content,
  className = "",
  searchQuery,
}: {
  content: string;
  className?: string;
  searchQuery?: string;
}) {
  const { format } = useContentFormat();
  return format(content, { className, searchQuery });
}

/**
 * Reusable <ContentPreview /> Component
 * Ideal for cards, explore feeds, search results, and notification items.
 * Guaranteed to NEVER leak raw HTML tags (e.g. <p><em>) to the UI!
 */
export function ContentPreview({
  content,
  lineClamp,
  maxLength,
  searchQuery,
  className = "",
}: {
  content: string;
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  maxLength?: number;
  searchQuery?: string;
  className?: string;
}) {
  const { stripHtml, getExcerpt, highlight } = useContentFormat();

  const cleanText = useMemo(() => {
    if (maxLength && maxLength > 0) {
      return getExcerpt(content, maxLength);
    }
    return stripHtml(content);
  }, [content, maxLength, getExcerpt, stripHtml]);

  const clampClass = lineClamp
    ? lineClamp === 1
      ? "line-clamp-1"
      : lineClamp === 2
      ? "line-clamp-2"
      : lineClamp === 3
      ? "line-clamp-3"
      : lineClamp === 4
      ? "line-clamp-4"
      : lineClamp === 5
      ? "line-clamp-5"
      : "line-clamp-6"
    : "";

  return (
    <p
      className={`break-words leading-relaxed text-slate-600 dark:text-slate-300 ${clampClass} ${className}`}
    >
      {highlight(cleanText, searchQuery)}
    </p>
  );
}
