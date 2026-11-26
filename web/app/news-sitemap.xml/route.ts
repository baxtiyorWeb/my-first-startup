import { NextResponse } from "next/server";
import { SITE_CONFIG, getCanonicalUrl } from "@/lib/seo/config";
import { getPublishedContentList } from "@/server/modules/content/seo-content.service";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { items } = await getPublishedContentList({
    kind: "news",
    limit: 50,
    page: 1,
  });

  const urlEntries = items
    .map((item) => {
      const loc = (["uz", "ru", "en"].includes(item.locale) ? item.locale : "uz") as Locale;
      const url = getCanonicalUrl(`/news/${item.slug}`, loc);
      return `  <url>
    <loc>${escapeXml(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_CONFIG.name)}</news:name>
        <news:language>${escapeXml(loc)}</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(item.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(item.seoTitle || item.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
