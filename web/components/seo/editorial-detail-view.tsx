import Link from "next/link";
import {
  Calendar,
  Clock,
  Eye,
  Check,
  ChevronRight,
  ListTree,
  Layers,
  BookOpen,
  Tag,
  Edit3,
} from "lucide-react";
import type { PublicContentItem } from "@/server/modules/content/seo-content.service";
import type { Locale } from "@/lib/i18n/config";
import { getCanonicalUrl } from "@/lib/seo/config";
import {
  generateBreadcrumbSchema,
  generateTechArticleSchema,
  generateNewsArticleSchema,
  generateVideoObjectSchema,
} from "@/lib/seo/schema";
import {
  extractHeadingsAndInjectIds,
  formatIsoDuration,
  getCategoryMeta,
} from "@/lib/seo/slugify";
import type { TopicItem } from "@/lib/seo/data/topics";
import type { GlossaryItem } from "@/lib/seo/data/glossary";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";
import { VideoPlayerClient } from "./video-player-client";
import { ContentCard } from "./content-card";
import { DiscussionIsland } from "./discussion-island";
import { UserAvatar } from "@/components/ui/user-avatar";

interface EditorialDetailViewProps {
  item: PublicContentItem;
  locale: Locale;
  relatedItems: PublicContentItem[];
  matchedTopics: TopicItem[];
  matchedGlossary: GlossaryItem[];
}

export function EditorialDetailView({
  item,
  locale,
  relatedItems,
  matchedTopics,
  matchedGlossary,
}: EditorialDetailViewProps) {
  const sectionSeg =
    item.contentKind === "video"
      ? "videos"
      : item.contentKind === "news"
      ? "news"
      : "articles";

  const sectionLabel =
    item.contentKind === "video"
      ? locale === "uz"
        ? "Video Darsliklar"
        : locale === "ru"
        ? "Видеоуроки"
        : "Video Tutorials"
      : item.contentKind === "news"
      ? locale === "uz"
        ? "IT Yangiliklar"
        : locale === "ru"
        ? "IT-Новости"
        : "Tech News"
      : locale === "uz"
      ? "Maqolalar"
      : locale === "ru"
      ? "Статьи"
      : "Articles";

  const categoryMeta = getCategoryMeta(item.category);
  const canonicalLocale = (
    ["uz", "ru", "en"].includes(item.locale) ? item.locale : locale
  ) as Locale;
  const pageUrl =
    item.canonicalUrl || getCanonicalUrl(`/${sectionSeg}/${item.slug}`, canonicalLocale);

  const authorProfileUrl = getCanonicalUrl(
    `/authors/${encodeURIComponent(item.author.handle.replace(/^@/, ""))}`,
    canonicalLocale
  );

  const fallbackOgUrl = `${getCanonicalUrl("", locale).replace(/\/(uz|ru|en)$/, "")}/og?title=${encodeURIComponent(
    item.seoTitle || item.title
  )}&kind=${item.contentKind}&author=${encodeURIComponent(item.author.name)}&category=${encodeURIComponent(
    categoryMeta.label[locale]
  )}`;

  const imageUrl = item.coverImageUrl || fallbackOgUrl;

  const breadcrumbsSchema = generateBreadcrumbSchema([
    {
      name: locale === "uz" ? "Bosh sahifa" : locale === "ru" ? "Главная" : "Home",
      item: getCanonicalUrl("", locale),
    },
    { name: sectionLabel, item: getCanonicalUrl(`/${sectionSeg}`, locale) },
    { name: item.title, item: pageUrl },
  ]);

  const primarySchema =
    item.contentKind === "video"
      ? generateVideoObjectSchema({
          name: item.seoTitle || item.title,
          description: item.seoDescription || item.excerpt,
          thumbnailUrl: imageUrl,
          uploadDate: item.publishedAt,
          durationIso: formatIsoDuration(item.videoDurationSeconds),
          embedUrl: item.youtubeVideoId
            ? `https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}`
            : item.videoUrl || undefined,
          contentUrl: item.videoUrl || undefined,
          pageUrl,
          authorName: item.author.name,
          authorUrl: authorProfileUrl,
          interactionCount: item.viewsCount,
          clips: item.videoChapters.map((ch, idx, arr) => ({
            title: ch.title,
            startOffset: ch.seconds,
            endOffset: arr[idx + 1] ? arr[idx + 1].seconds : undefined,
          })),
          locale: canonicalLocale,
        })
      : item.contentKind === "news"
      ? generateNewsArticleSchema({
          headline: item.seoTitle || item.title,
          description: item.seoDescription || item.excerpt,
          url: pageUrl,
          imageUrl,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          authorName: item.author.name,
          authorUrl: authorProfileUrl,
          articleSection: categoryMeta.label[locale],
          wordCount: item.wordCount,
          keywords: [item.focusKeyword || "", ...item.tags].filter(Boolean),
          locale: canonicalLocale,
        })
      : generateTechArticleSchema({
          headline: item.seoTitle || item.title,
          description: item.seoDescription || item.excerpt,
          url: pageUrl,
          imageUrl,
          datePublished: item.publishedAt,
          dateModified: item.updatedAt,
          authorName: item.author.name,
          authorUrl: authorProfileUrl,
          articleSection: categoryMeta.label[locale],
          wordCount: item.wordCount,
          keywords: [item.focusKeyword || "", ...item.tags].filter(Boolean),
          locale: canonicalLocale,
        });

  const { htmlWithIds, headings } = extractHeadingsAndInjectIds(item.content);

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0c13] text-slate-900 dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(primarySchema) }}
      />

      <PublicNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6"
        >
          <Link href={`/${locale}`} className="hover:text-[#3995ff] transition-colors">
            {locale === "uz" ? "Bosh sahifa" : locale === "ru" ? "Главная" : "Home"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/${locale}/${sectionSeg}`} className="hover:text-[#3995ff] transition-colors">
            {sectionLabel}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href={`/${locale}/${sectionSeg}?category=${item.category}`}
            className="hover:text-[#3995ff] transition-colors font-medium text-[#3995ff]"
          >
            {categoryMeta.label[locale]}
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Primary Editorial Column */}
          <article className="lg:col-span-8 space-y-6 min-w-0">
            {/* Article / Video / News Header */}
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${locale}/${sectionSeg}?category=${item.category}`}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[#3995ff]/10 text-[#3995ff] border border-[#3995ff]/25"
                >
                  {categoryMeta.label[locale]}
                </Link>
                {item.focusKeyword && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-200/70 dark:bg-[#14151d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#24252f]">
                    #{item.focusKeyword}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
                {item.title}
              </h1>

              {/* Author & Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-200/80 dark:border-[#24252f]">
                <Link
                  href={`/${locale}/authors/${encodeURIComponent(item.author.handle.replace(/^@/, ""))}`}
                  className="flex items-center gap-3 group"
                >
                  <UserAvatar
                    name={item.author.name}
                    avatarUrl={item.author.avatarUrl || undefined}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-950 dark:text-white group-hover:text-[#3995ff] transition-colors">
                        {item.author.name}
                      </span>
                      {item.author.verified && (
                        <span className="size-4 rounded-full bg-[#3995ff] text-white flex items-center justify-center">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.author.role}
                    </p>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <time dateTime={item.publishedAt}>
                      {dateFormatter.format(new Date(item.publishedAt))}
                    </time>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {item.readingTimeMinutes} min o‘qish
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {item.viewsCount}
                  </span>
                  <Link
                    href={`/${locale}/dashboard/create?edit=${item.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-[#3995ff] transition-colors"
                    title="Muallif / Admin uchun tahrirlash"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </header>

            {/* Video Player OR Cover Image */}
            {item.contentKind === "video" ? (
              <VideoPlayerClient
                title={item.title}
                videoUrl={item.videoUrl}
                youtubeVideoId={item.youtubeVideoId}
                bunnyVideoId={item.bunnyVideoId}
                thumbnailUrl={item.coverImageUrl}
                chapters={item.videoChapters}
              />
            ) : item.coverImageUrl ? (
              <figure className="rounded-[16px] overflow-hidden border border-slate-200/90 dark:border-[#24252f] bg-slate-100 dark:bg-[#101117]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.coverImageUrl}
                  alt={item.coverImageAlt || item.title}
                  className="w-full max-h-[460px] object-cover"
                />
                {item.coverImageAlt && item.coverImageAlt !== item.title && (
                  <figcaption className="px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-[#24252f]">
                    {item.coverImageAlt}
                  </figcaption>
                )}
              </figure>
            ) : null}

            {/* Mobile Table of Contents */}
            {headings.length >= 2 && (
              <div className="lg:hidden rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  <ListTree className="w-4 h-4 text-[#3995ff]" />
                  <span>Mundarija</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                      <a
                        href={`#${h.id}`}
                        className="text-slate-600 dark:text-slate-300 hover:text-[#3995ff] transition-colors block py-0.5"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Rich Editorial Body */}
            <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-5 sm:p-8 shadow-xs">
              <div
                className="rich-content prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed text-slate-800 dark:text-slate-200
                  [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:text-slate-950 [&_h2]:dark:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-24
                  [&_h3]:text-lg [&_h3]:sm:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:dark:text-slate-100 [&_h3]:mt-6 [&_h3]:mb-2.5 [&_h3]:scroll-mt-24
                  [&_p]:my-3 [&_p]:leading-relaxed
                  [&_strong]:font-bold [&_strong]:text-slate-950 [&_strong]:dark:text-white
                  [&_b]:font-bold [&_b]:text-slate-950 [&_b]:dark:text-white
                  [&_blockquote]:border-l-4 [&_blockquote]:border-[#3995ff] [&_blockquote]:bg-slate-50 [&_blockquote]:dark:bg-[#14151d] [&_blockquote]:px-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:rounded-r-xl [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:dark:text-slate-300
                  [&_pre]:bg-[#0b0c13] [&_pre]:border [&_pre]:border-[#24252f] [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-xs [&_pre]:sm:text-sm [&_pre]:text-slate-100
                  [&_code]:font-mono [&_code]:text-[13px] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:dark:bg-[#181a24] [&_code]:text-blue-700 [&_code]:dark:text-[#3995ff]
                  [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1.5
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1.5
                  [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:dark:border-[#24252f] [&_img]:my-5
                  [&_a]:text-blue-600 [&_a]:dark:text-[#3995ff] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80
                  [&_table]:w-full [&_table]:border-collapse [&_table]:my-5 [&_th]:bg-slate-100 [&_th]:dark:bg-[#14151d] [&_th]:p-2.5 [&_th]:border [&_th]:border-slate-200 [&_th]:dark:border-[#24252f] [&_td]:p-2.5 [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-[#24252f]"
                dangerouslySetInnerHTML={{ __html: htmlWithIds }}
              />

              {/* Transcript / Key Notes for Video Tutorials */}
              {item.transcript && (
                <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-[#24252f] space-y-3">
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Darslik Konspekti &amp; Transkript
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {item.transcript}
                  </p>
                </div>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-[#24252f] flex flex-wrap items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {item.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/${locale}/${sectionSeg}?tag=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#14151d] border border-slate-200/80 dark:border-[#24252f] text-slate-700 dark:text-slate-300 hover:border-[#3995ff]/50 hover:text-[#3995ff] transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* E-E-A-T Author Bio Box */}
            <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <UserAvatar
                  name={item.author.name}
                  avatarUrl={item.author.avatarUrl || undefined}
                  size="lg"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wider font-bold text-[#3995ff]">
                      Muallif haqida
                    </span>
                  </div>
                  <Link
                    href={`/${locale}/authors/${encodeURIComponent(item.author.handle.replace(/^@/, ""))}`}
                    className="text-base font-bold text-slate-950 dark:text-white hover:text-[#3995ff] transition-colors flex items-center gap-1.5"
                  >
                    <span>{item.author.name}</span>
                    {item.author.verified && (
                      <span className="size-4 rounded-full bg-[#3995ff] text-white flex items-center justify-center">
                        <Check size={9} strokeWidth={3} />
                      </span>
                    )}
                  </Link>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    {item.author.bio || `${item.author.role} — Geters IT hamjamiyati muallifi va eksperti.`}
                  </p>
                </div>
              </div>
              <Link
                href={`/${locale}/authors/${encodeURIComponent(item.author.handle.replace(/^@/, ""))}`}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#14151d] border border-slate-200 dark:border-[#24252f] text-xs font-bold text-slate-800 dark:text-white hover:border-[#3995ff] transition-colors shrink-0"
              >
                Barcha materiallari
              </Link>
            </div>

            {/* Interactive Like / Bookmark / Share / Threaded Discussion */}
            <DiscussionIsland
              postId={item.id}
              canonicalUrl={pageUrl}
              title={item.title}
              initialLikesCount={item.likesCount}
              initialCommentsCount={item.commentsCount}
              initialViewsCount={item.viewsCount}
            />

            {/* Related Editorial Content */}
            {relatedItems.length > 0 && (
              <section className="pt-4 space-y-4">
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Mavzuga oid foydali materiallar
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedItems.map((rel) => (
                    <ContentCard key={rel.id} item={rel} locale={locale} />
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Right Sticky SEO & Internal Linking Sidebar */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* Desktop Table of Contents */}
            {headings.length >= 2 && (
              <div className="hidden lg:block rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  <ListTree className="w-4 h-4 text-[#3995ff]" />
                  <span>Mundarija</span>
                </div>
                <nav aria-label="Mundarija" className="space-y-1.5 text-xs">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block py-1 text-slate-600 dark:text-slate-300 hover:text-[#3995ff] transition-colors border-l-2 border-transparent hover:border-[#3995ff] ${
                        h.level === 3 ? "pl-5 text-[11px]" : "pl-3 font-medium"
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Topic Cluster Pillar Links (Hub Internal Linking) */}
            <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                <Layers className="w-4 h-4 text-[#3995ff]" />
                <span>Texnologiyalar Hubi</span>
              </div>
              <div className="space-y-2">
                {matchedTopics.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={`/${locale}/hub/${topic.slug}`}
                    className="block p-3 rounded-xl bg-slate-50 dark:bg-[#14151d] border border-slate-200/70 dark:border-[#24252f] hover:border-[#3995ff]/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span>{topic.icon}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#3995ff]">
                        {topic.title[locale]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {topic.shortDescription[locale]}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Glossary Internal Links */}
            <div className="rounded-[16px] bg-white dark:bg-[#101117] border border-slate-200/90 dark:border-[#24252f] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span>Asosiy IT Atamalar</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {matchedGlossary.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/${locale}/glossary/${g.slug}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#14151d] border border-slate-200/70 dark:border-[#24252f] text-slate-700 dark:text-slate-300 hover:border-[#3995ff]/50 hover:text-[#3995ff] transition-colors"
                  >
                    {g.term[locale]}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter locale={locale} />
    </div>
  );
}
