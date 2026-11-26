import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import {
  getPublishedContentBySlugOrId,
  getPublishedContentCategories,
  getPublishedContentList,
  getRelatedContentAndPillars,
  getPublicKindPathSegment,
  type PublicContentKind,
} from "@/server/modules/content/seo-content.service";
import { getCategoryMeta } from "@/lib/seo/slugify";

export async function generateEditorialListMetadata(
  locale: string,
  kind: PublicContentKind
): Promise<Metadata> {
  if (!isValidLocale(locale)) return {};
  const typedLocale = locale as Locale;
  const seg = getPublicKindPathSegment(kind);

  const metaByKind: Record<PublicContentKind, { title: string; desc: string }> = {
    article: {
      title:
        typedLocale === "uz"
          ? "Maqolalar va Amaliy Qo'llanmalar — Geters"
          : typedLocale === "ru"
          ? "Статьи и практические руководства — Geters"
          : "Articles & Practical Guides — Geters",
      desc: "Turli sohalar bo'yicha chuqur tahliliy maqolalar, amaliy tajriba va qo'llanmalar.",
    },
    video: {
      title:
        typedLocale === "uz"
          ? "Video Darsliklar va Amaliy Kurslar — Geters"
          : typedLocale === "ru"
          ? "Видеоуроки по программированию — Geters"
          : "Programming Video Tutorials & Courses — Geters",
      desc: "Real loyihalar asosidagi bepul video darsliklar, bo'limlar va to'liq kod konspektlari.",
    },
    news: {
      title:
        typedLocale === "uz"
          ? "IT va Texnologiya Yangiliklari — Geters"
          : typedLocale === "ru"
          ? "Новости IT и технологий — Geters"
          : "Tech & Startup News — Geters",
      desc: "IT olami, AI relizlari, dasturlash tillari va O'zbekiston texnologiya bozorining tezkor yangiliklari.",
    },
  };

  const canonical = getCanonicalUrl(`/${seg}`, typedLocale);
  const { title, desc } = metaByKind[kind];

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: getLanguageAlternates(`/${seg}`),
    },
    openGraph: {
      title,
      description: desc,
      url: canonical,
      siteName: SITE_CONFIG.name,
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function generateEditorialDetailMetadata(
  locale: string,
  slug: string,
  kind: PublicContentKind
): Promise<Metadata> {
  if (!isValidLocale(locale)) return {};
  const typedLocale = locale as Locale;
  const { item } = await getPublishedContentBySlugOrId(slug, kind);

  if (!item) {
    return {
      title: "Material topilmadi — Geters",
      robots: { index: false, follow: false },
    };
  }

  const seg = getPublicKindPathSegment(item.contentKind);
  const canonicalLocale = (
    ["uz", "ru", "en"].includes(item.locale) ? item.locale : typedLocale
  ) as Locale;
  const canonical =
    item.canonicalUrl || getCanonicalUrl(`/${seg}/${item.slug}`, canonicalLocale);

  const title = item.seoTitle || `${item.title} — Geters`;
  const description = item.seoDescription || item.excerpt;
  const category = getCategoryMeta(item.category).label[typedLocale];

  const baseRoot = SITE_CONFIG.url.replace(/\/$/, "");
  const dynamicOg = `${baseRoot}/og?title=${encodeURIComponent(title)}&kind=${item.contentKind}&author=${encodeURIComponent(item.author.name)}&category=${encodeURIComponent(category)}`;
  const ogImage = item.coverImageUrl || dynamicOg;

  return {
    title,
    description,
    keywords: [item.focusKeyword || "", ...item.tags, category].filter(Boolean),
    authors: [{ name: item.author.name }],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      type: item.contentKind === "video" ? "video.other" : "article",
      publishedTime: item.publishedAt,
      modifiedTime: item.updatedAt,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: item.coverImageAlt || title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export async function resolveEditorialDetailPageData(
  locale: string,
  slug: string,
  expectedKind: PublicContentKind
) {
  if (!isValidLocale(locale)) notFound();
  const typedLocale = locale as Locale;

  const { item, redirectSlug, wrongKindSegment } = await getPublishedContentBySlugOrId(
    slug,
    expectedKind
  );

  if (!item && redirectSlug) {
    const seg = wrongKindSegment || getPublicKindPathSegment(expectedKind);
    permanentRedirect(`/${typedLocale}/${seg}/${redirectSlug}`);
  }

  if (!item) {
    notFound();
  }

  if (wrongKindSegment || (redirectSlug && redirectSlug !== slug)) {
    const targetSeg = wrongKindSegment || getPublicKindPathSegment(item.contentKind);
    const targetSlug = redirectSlug || item.slug;
    permanentRedirect(`/${typedLocale}/${targetSeg}/${targetSlug}`);
  }

  const related = await getRelatedContentAndPillars({
    excludeId: item.id,
    category: item.category,
    tags: item.tags,
    title: item.title,
    locale: typedLocale,
  });

  return {
    typedLocale,
    item,
    ...related,
  };
}

export async function resolveEditorialListPageData(
  locale: string,
  searchParams: { category?: string; q?: string; tag?: string; page?: string },
  kind: PublicContentKind
) {
  if (!isValidLocale(locale)) notFound();
  const typedLocale = locale as Locale;

  const activeCategory = searchParams.category || "all";
  const activeSearch = searchParams.q || "";
  const activeTag = searchParams.tag || "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const limit = 12;

  const [{ items, total }, categories] = await Promise.all([
    getPublishedContentList({
      kind,
      category: activeCategory,
      search: activeSearch,
      tag: activeTag,
      page,
      limit,
    }),
    getPublishedContentCategories(kind),
  ]);

  return {
    typedLocale,
    items,
    total,
    categories,
    page,
    limit,
    activeCategory,
    activeSearch,
    activeTag,
  };
}
