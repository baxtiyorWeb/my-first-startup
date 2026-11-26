import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.geters.uz";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/uz",
          "/ru",
          "/en",
          "/uz/articles",
          "/uz/articles/*",
          "/ru/articles",
          "/ru/articles/*",
          "/en/articles",
          "/en/articles/*",
          "/uz/videos",
          "/uz/videos/*",
          "/ru/videos",
          "/ru/videos/*",
          "/en/videos",
          "/en/videos/*",
          "/uz/news",
          "/uz/news/*",
          "/ru/news",
          "/ru/news/*",
          "/en/news",
          "/en/news/*",
          "/uz/authors/*",
          "/ru/authors/*",
          "/en/authors/*",
          "/uz/hub",
          "/uz/hub/*",
          "/ru/hub",
          "/ru/hub/*",
          "/en/hub",
          "/en/hub/*",
          "/uz/glossary",
          "/uz/glossary/*",
          "/ru/glossary",
          "/ru/glossary/*",
          "/en/glossary",
          "/en/glossary/*",
          "/uz/cheatsheets",
          "/uz/cheatsheets/*",
          "/ru/cheatsheets",
          "/ru/cheatsheets/*",
          "/en/cheatsheets",
          "/en/cheatsheets/*",
          "/uz/interview-prep",
          "/uz/interview-prep/*",
          "/ru/interview-prep",
          "/ru/interview-prep/*",
          "/en/interview-prep",
          "/en/interview-prep/*",
          "/og",
          "/og*",
          "/rss.xml",
          "/news-sitemap.xml",
        ],
        disallow: [
          "/api/",
          "/api/*",
          "/*/dashboard",
          "/*/dashboard/*",
          "/*/auth/",
          "/*/auth/*",
          "/*/onboarding",
          "/*/onboarding/*",
          "/admin",
          "/admin/*",
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
    host: baseUrl,
  };
}
