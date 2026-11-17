import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import { TOPICS_DATA } from "@/lib/seo/data/topics";
import { GLOSSARY_DATA } from "@/lib/seo/data/glossary";
import { CHEATSHEETS_DATA } from "@/lib/seo/data/cheatsheets";
import { INTERVIEW_PREP_DATA } from "@/lib/seo/data/interviews";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];
  const currentDate = new Date();

  // 1. Asosiy sahifalar (Landing Pages)
  for (const locale of LOCALES) {
    routes.push({
      url: getCanonicalUrl("", locale),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: getLanguageAlternates(""),
      },
    });
  }

  // 2. Hub (Texnologiyalar) katalogi va detallari
  for (const locale of LOCALES) {
    routes.push({
      url: getCanonicalUrl("/hub", locale),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: getLanguageAlternates("/hub"),
      },
    });

    for (const topic of TOPICS_DATA) {
      routes.push({
        url: getCanonicalUrl(`/hub/${topic.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "weekly",
        priority: 0.85,
        alternates: {
          languages: getLanguageAlternates(`/hub/${topic.slug}`),
        },
      });
    }
  }

  // 3. Glossary (IT Lug'at) katalogi va detallari
  for (const locale of LOCALES) {
    routes.push({
      url: getCanonicalUrl("/glossary", locale),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: getLanguageAlternates("/glossary"),
      },
    });

    for (const item of GLOSSARY_DATA) {
      routes.push({
        url: getCanonicalUrl(`/glossary/${item.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: getLanguageAlternates(`/glossary/${item.slug}`),
        },
      });
    }
  }

  // 4. Cheatsheets katalogi va detallari
  for (const locale of LOCALES) {
    routes.push({
      url: getCanonicalUrl("/cheatsheets", locale),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: getLanguageAlternates("/cheatsheets"),
      },
    });

    for (const sheet of CHEATSHEETS_DATA) {
      routes.push({
        url: getCanonicalUrl(`/cheatsheets/${sheet.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.85,
        alternates: {
          languages: getLanguageAlternates(`/cheatsheets/${sheet.slug}`),
        },
      });
    }
  }

  // 5. Intervyu tayyorgarligi katalogi va detallari
  for (const locale of LOCALES) {
    routes.push({
      url: getCanonicalUrl("/interview-prep", locale),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.85,
      alternates: {
        languages: getLanguageAlternates("/interview-prep"),
      },
    });

    for (const prep of INTERVIEW_PREP_DATA) {
      routes.push({
        url: getCanonicalUrl(`/interview-prep/${prep.slug}`, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: getLanguageAlternates(`/interview-prep/${prep.slug}`),
        },
      });
    }
  }

  // 6. Yordam va Huquqiy sahifalar (Help, Privacy, Terms, Guidelines)
  const utilityPaths = ["/help", "/privacy", "/terms", "/guidelines"];
  for (const locale of LOCALES) {
    for (const path of utilityPaths) {
      routes.push({
        url: getCanonicalUrl(path, locale),
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.4,
        alternates: {
          languages: getLanguageAlternates(path),
        },
      });
    }
  }

  return routes;
}
