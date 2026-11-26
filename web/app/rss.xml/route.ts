import { NextResponse } from "next/server";
import { SITE_CONFIG, getCanonicalUrl } from "@/lib/seo/config";
import {
  getPublishedContentList,
  getPublicKindPathSegment,
} from "@/server/modules/content/seo-content.service";
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
    kind: "all",
    limit: 50,
    page: 1,
  });

  const baseUrl = SITE_CONFIG.url.replace(/\/$/, "");

  const channelItems = items
    .map((item) => {
      const loc = (["uz", "ru", "en"].includes(item.locale) ? item.locale : "uz") as Locale;
      const segment = getPublicKindPathSegment(item.contentKind);
      const link = getCanonicalUrl(`/${segment}/${item.slug}`, loc);
      return `    <item>
      <title>${escapeXml(item.seoTitle || item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(item.excerpt)}</description>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(item.category)}</category>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.name)} — Maqolalar, Video Darsliklar va IT Yangiliklar</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(SITE_CONFIG.description.uz)}</description>
    <language>uz</language>
    <atom:link href="${escapeXml(baseUrl)}/rss.xml" rel="self" type="application/rss+xml" />
${channelItems}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
