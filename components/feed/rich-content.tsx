"use client";

import React, { useMemo } from "react";
import { HighlightText, getSearchHighlightRegex } from "@/lib/highlight";

interface RichContentProps {
  content: string;
  className?: string;
  searchQuery?: string;
}

const HAS_HTML_REGEX = /<[a-z][\s\S]*>/i;

/**
 * Safely sanitize HTML string on the client before injecting into DOM
 * and optionally highlight search query matches
 */
function sanitizeClientHtml(html: string, searchQuery?: string): string {
  if (typeof window === "undefined") {
    // Basic server-side regex strip of dangerous tags (script, iframe, on* attributes)
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, "");
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Allowed tags
    const allowedTags = new Set([
      "h2",
      "p",
      "blockquote",
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
    ]);

    const cleanNode = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (!allowedTags.has(tagName)) {
            // Unwrap disallowed element: replace with its children
            while (el.firstChild) {
              node.insertBefore(el.firstChild, el);
            }
            node.removeChild(el);
            continue;
          }

          // Strip all attributes except href/target/rel on <a> and class on <mark>/<code>
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            if (tagName === "a" && (attrName === "href" || attrName === "title")) {
              // Ensure safe scheme
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

    // Apply search highlighting to text nodes if query is provided
    if (searchQuery && searchQuery.trim()) {
      const regex = getSearchHighlightRegex(searchQuery);
      if (regex) {
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
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

export function RichContent({
  content,
  className = "",
  searchQuery,
}: RichContentProps) {
  const isHtml = useMemo(() => HAS_HTML_REGEX.test(content), [content]);

  const sanitized = useMemo(() => {
    if (!isHtml) return "";
    return sanitizeClientHtml(content, searchQuery);
  }, [content, isHtml, searchQuery]);

  if (!isHtml) {
    return (
      <p
        className={`whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200 ${className}`}
      >
        <HighlightText text={content} query={searchQuery} />
      </p>
    );
  }

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
        [&_p]:my-1
        [&_a]:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80
        ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

