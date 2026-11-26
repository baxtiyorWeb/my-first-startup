import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import { TOPICS_DATA } from "@/lib/seo/data/topics";
import { GLOSSARY_DATA } from "@/lib/seo/data/glossary";
import { CHEATSHEETS_DATA } from "@/lib/seo/data/cheatsheets";
import { INTERVIEW_PREP_DATA } from "@/lib/seo/data/interviews";
import {
  getIndexableSitemapRecords,
  getPublicKindPathSegment,
} from "@/server/modules/content/seo-content.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];
  const currentDate = new Date();

  // 1. Asosiy Portal sahifalari va Kataloglar
  const sectionPaths: Array<{ path: string; priority: number; freq: "hourly" | "daily" | "weekly" }> = [
    { path: "", priority: 1.0, freq: "daily" },
    { path: "/articles", priority: 0.95, freq: "daily" },
    { path: "/videos", priority: 0.95, freq: "daily" },
    { path: "/news", priority: 0.95, freq: "hourly" },
    { path: "/hub", priority: 0.9, freq: "weekly" },
    { path: "/glossary", priority: 0.85, freq: "weekly" },
    { path: "/cheatsheets", priority: 0.85, freq: "weekly" },
    { path: "/interview-prep", priority: 0.85, freq: "weekly" },
  ];

  for (const locale of LOCALES) {
    for (const sec of sectionPaths) {
      routes.push({
        url: getCanonicalUrl(sec.path, locale),
        lastModified: currentDate,
        changeFrequency: sec.freq,
        priority: sec.priority,
        alternates: {
          languages: getLanguageAlternates(sec.path),
        },
      });
    }
  }

  // 2. Dinamik Bazadagi Maqolalar, Video Darsliklar va Yangiliklar (Canonical Locale)
  const { contentItems, authorHandles } = await getIndexableSitemapRecords();

  for (const item of contentItems) {
    const segment = getPublicKindPathSegment(item.kind);
    routes.push({
      url: getCanonicalUrl(`/${segment}/${item.slug}`, item.locale),
      lastModified: item.updatedAt || item.publishedAt,
      changeFrequency: item.kind === "news" ? "hourly" : "weekly",
      priority: item.kind === "news" ? 0.9 : 0.88,
    });
  }

  // 3. Ochiq Mualliflar (E-E-A-T Author Pages)
  for (const author of authorHandles) {
    routes.push({
      url: getCanonicalUrl(`/authors/${author.handle}`, "uz"),
      lastModified: author.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // 4. Statik Evergreen Hub, Glossary, Cheatsheets & Interview Prep
  for (const locale of LOCALES) {
    for (const topic of TOPICS_DATA) {
      routes.push({
        url: getCanonicalUrl(`/hub/${topic.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "weekly",
        priority: 0.82,
        alternates: { languages: getLanguageAlternates(`/hub/${topic.slug}`) },
      });
    }
    for (const item of GLOSSARY_DATA) {
      routes.push({
        url: getCanonicalUrl(`/glossary/${item.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.78,
        alternates: { languages: getLanguageAlternates(`/glossary/${item.slug}`) },
      });
    }
    for (const sheet of CHEATSHEETS_DATA) {
      routes.push({
        url: getCanonicalUrl(`/cheatsheets/${sheet.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: getLanguageAlternates(`/cheatsheets/${sheet.slug}`) },
      });
    }
    for (const prep of INTERVIEW_PREP_DATA) {
      routes.push({
        url: getCanonicalUrl(`/interview-prep/${prep.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.78,
        alternates: { languages: getLanguageAlternates(`/interview-prep/${prep.slug}`) },
      });
    }

    for (const utilityPath of ["/help", "/privacy", "/terms", "/guidelines"]) {
      routes.push({
        url: getCanonicalUrl(utilityPath, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.4,
        alternates: { languages: getLanguageAlternates(utilityPath) },
      });
    }
  }

  return routes;
}
