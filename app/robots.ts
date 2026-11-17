import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://thegogetters.uz";

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
          "/uz/help",
          "/ru/help",
          "/en/help",
          "/uz/privacy",
          "/ru/privacy",
          "/en/privacy",
          "/uz/terms",
          "/ru/terms",
          "/en/terms",
          "/uz/guidelines",
          "/ru/guidelines",
          "/en/guidelines",
        ],
        disallow: [
          "/api/",
          "/api/*",
          "/*/dashboard",
          "/*/dashboard/*",
          "/*/dashboard/posts/*",
          "/*/dashboard/profile/*",
          "/*/dashboard/messages/*",
          "/*/dashboard/bookmarks/*",
          "/*/dashboard/search/*",
          "/*/dashboard/reels/*",
          "/*/dashboard/notifications/*",
          "/*/dashboard/settings/*",
          "/*/dashboard/admin/*",
          "/*/auth/",
          "/*/auth/*",
          "/*/onboarding",
          "/*/onboarding/*",
          "/admin",
          "/admin/*",
          "/*?*", // URL query parametrlarini indekslashdan himoyalash
        ],
      },
      // Maxsus Googlebot qoidalari
      {
        userAgent: "Googlebot",
        disallow: [
          "/api/",
          "/*/dashboard/*",
          "/*/dashboard/posts/*",
          "/*/dashboard/profile/*",
          "/*/dashboard/messages/*",
          "/*/auth/*",
          "/*/onboarding/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
