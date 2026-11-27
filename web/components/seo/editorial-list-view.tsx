import Link from "next/link";
import { Search, BookOpen, PlayCircle, Newspaper, PenTool, ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicContentItem, PublicContentKind } from "@/server/modules/content/seo-content.service";
import type { Locale } from "@/lib/i18n/config";
import { getCanonicalUrl } from "@/lib/seo/config";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/schema";
import { getCategoryMeta } from "@/lib/seo/slugify";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";
import { ContentCard } from "./content-card";

interface EditorialListViewProps {
  kind: PublicContentKind;
  locale: Locale;
  items: PublicContentItem[];
  categories: { slug: string; count: number }[];
  total: number;
  page: number;
  limit: number;
  activeCategory: string;
  activeSearch: string;
  activeTag: string;
}

export function EditorialListView({
  kind,
  locale,
  items,
  categories,
  total,
  page,
  limit,
  activeCategory,
  activeSearch,
  activeTag,
}: EditorialListViewProps) {
  const seg = kind === "video" ? "videos" : kind === "news" ? "news" : "articles";

  const categoryTabs = categories.map((cat) => ({
    ...cat,
    label: getCategoryMeta(cat.slug).label[locale],
  }));
  const activeCategoryLabel =
    activeCategory !== "all" ? getCategoryMeta(activeCategory).label[locale] : null;

  const copy = {
    article: {
      badge: "Maqolalar & Qo'llanmalar",
      title:
        locale === "uz"
          ? "Barcha Sohalar Uchun Maqolalar"
          : locale === "ru"
          ? "Статьи для всех сфер"
          : "Articles for Every Field",
      subtitle:
        locale === "uz"
          ? "Turli soha mutaxassislarining amaliy tajribasi, tahlillari va qo'llanmalari."
          : locale === "ru"
          ? "Практический опыт, разборы и руководства специалистов разных сфер."
          : "Hands-on experience, analysis, and guides from specialists across industries.",
      Icon: BookOpen,
    },
    video: {
      badge: "Videolar",
      title:
        locale === "uz"
          ? "Videolar"
          : locale === "ru"
          ? "Видео"
          : "Videos",
      subtitle:
        locale === "uz"
          ? "Platformadagi video materiallar."
          : locale === "ru"
          ? "Видеоматериалы платформы."
          : "Platform video content.",
      Icon: PlayCircle,
    },
    news: {
      badge: "IT & Startap Yangiliklari",
      title:
        locale === "uz"
          ? "Texnologiya va IT Bozor Yangiliklari"
          : locale === "ru"
          ? "Новости IT и технологий"
          : "Tech Industry & Startup News",
      subtitle:
        locale === "uz"
          ? "Dasturlash tillari relizlari, AI yangiliklari va O'zbekiston IT ekotizimi voqealari."
          : locale === "ru"
          ? "Свежие релизы фреймворков, новости ИИ и события IT-рынка."
          : "Latest framework releases, AI breakthroughs, and regional startup news.",
      Icon: Newspaper,
    },
  }[kind];

  const pageUrl = getCanonicalUrl(`/${seg}`, locale);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: locale === "uz" ? "Bosh sahifa" : "Home", item: getCanonicalUrl("", locale) },
    { name: copy.badge, item: pageUrl },
  ]);

  const listSchema = generateItemListSchema({
    name: copy.title,
    url: pageUrl,
    items: items.map((it) => ({
      name: it.title,
      url: getCanonicalUrl(`/${seg}/${it.slug}`, locale),
    })),
  });

  const buildFilterUrl = (cat: string, targetPage = 1) => {
    const sp = new URLSearchParams();
    if (cat && cat !== "all") sp.set("category", cat);
    if (activeSearch) sp.set("q", activeSearch);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return `/${locale}/${seg}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }}
      />

      <PublicNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Archive Hero */}
        <section className="rounded-[20px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1d9bf0]">
                <copy.Icon className="w-4 h-4" />
                <span>{copy.badge}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {activeCategoryLabel || copy.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {copy.subtitle}
              </p>
            </div>

            <Link
              href={`/${locale}/dashboard/create`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1d9bf0] hover:bg-blue-600 text-white text-xs font-bold shadow-xs shrink-0 self-start transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Yangi qo‘shish</span>
            </Link>
          </div>

          {/* Search Form + Crawlable Category Tabs */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#202327]">
            <form method="GET" action={`/${locale}/${seg}`} className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                name="q"
                defaultValue={activeSearch}
                placeholder="Kalit so'z yoki mavzu bo'yicha qidirish..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#16181c] border border-slate-200 dark:border-[#2f3336] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]"
              />
              {activeCategory !== "all" && (
                <input type="hidden" name="category" value={activeCategory} />
              )}
            </form>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Link
                href={buildFilterUrl("all", 1)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === "all" && !activeTag
                    ? "bg-[#1d9bf0] text-white"
                    : "bg-slate-100 dark:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] text-slate-600 dark:text-slate-300 hover:border-[#1d9bf0]/40"
                }`}
              >
                Barchasi ({total})
              </Link>
              {categoryTabs.map((cat) => (
                <Link
                  key={cat.slug}
                  href={buildFilterUrl(cat.slug, 1)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat.slug
                      ? "bg-[#1d9bf0] text-white"
                      : "bg-slate-100 dark:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] text-slate-600 dark:text-slate-300 hover:border-[#1d9bf0]/40"
                  }`}
                >
                  {cat.label} ({cat.count})
                </Link>
              ))}
            </div>

            {activeTag && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Tanlangan teg:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-[#1d9bf0]/10 text-[#1d9bf0] font-bold">
                  #{activeTag}
                </span>
                <Link href={`/${locale}/${seg}`} className="underline hover:text-[#1d9bf0]">
                  Tozalash
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Grid Results */}
        {items.length === 0 ? (
          <div className="rounded-[20px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] p-12 text-center space-y-3">
            <copy.Icon className="w-10 h-10 text-[#1d9bf0]/60 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Hozircha bu bo‘limda nashr qilingan kontent topilmadi
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Birinchi materialni joylab Google va Yandex indeksiga chiqaring.
            </p>
            <div className="pt-2">
              <Link
                href={kind === "video" ? `/${locale}/dashboard/create` : `/${locale}/dashboard/create?kind=${kind}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1d9bf0] hover:bg-blue-600 text-white text-xs font-bold transition-colors"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Birinchi materialni joylash</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        )}

        {/* Crawlable SSR Pagination */}
        {totalPages > 1 && (
          <nav
            aria-label="Sahifalash"
            className="flex items-center justify-center gap-2 pt-4"
          >
            {page > 1 && (
              <Link
                href={buildFilterUrl(activeCategory, page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#000000] border border-slate-200 dark:border-[#2f3336] text-xs font-semibold hover:border-[#1d9bf0]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Oldingi
              </Link>
            )}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-3">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildFilterUrl(activeCategory, page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#000000] border border-slate-200 dark:border-[#2f3336] text-xs font-semibold hover:border-[#1d9bf0]"
              >
                Keyingi
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </nav>
        )}
      </main>

      <PublicFooter locale={locale} />
    </div>
  );
}
