import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
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
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "title", "target", "rel"],
  mark: ["class"],
};

/**
 * Sanitize user-submitted HTML to prevent XSS attacks while preserving
 * rich text formatting created in the WYSIWYG editor.
 */
export function sanitizeRichContent(rawHtml: string): string {
  if (!rawHtml) return "";

  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => {
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
