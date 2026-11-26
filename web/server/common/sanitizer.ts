import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
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
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "title", "target", "rel"],
  mark: ["class"],
  pre: ["class"],
  code: ["class"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  h2: ["id"],
  h3: ["id"],
  h4: ["id"],
};

/**
 * Sanitize user-submitted HTML to prevent XSS attacks while preserving
 * rich text formatting and empty lines created in the WYSIWYG editor.
 */
export function sanitizeRichContent(rawHtml: string): string {
  if (!rawHtml) return "";

  // Normalize empty line breaks from various browsers
  const prepared = rawHtml
    .replace(/<div><br\s*\/?><\/div>/gi, "<p><br /></p>")
    .replace(/<p><\/p>/gi, "<p><br /></p>");

  return sanitizeHtml(prepared, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      div: "p",
      a: (_tagName, attribs) => {
        const href = (attribs.href || "").trim();
        const isInternal =
          href.startsWith("/") ||
          href.startsWith("#") ||
          href.includes("geters.uz");

        if (isInternal) {
          return {
            tagName: "a",
            attribs: {
              ...attribs,
            },
          };
        }

        return {
          tagName: "a",
          attribs: {
            ...attribs,
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        };
      },
    },
  }).trim();
}

/**
 * Strip all HTML tags to get pure plain text (e.g. for search indexing or word counts)
 */
export function stripHtmlToPlainText(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
}
