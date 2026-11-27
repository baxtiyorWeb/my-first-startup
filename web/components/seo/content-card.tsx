import Link from "next/link";
import { Play, Clock, Eye, MessageSquare, Check, BookOpen, Newspaper, Video } from "lucide-react";
import type { PublicContentItem } from "@/server/modules/content/seo-content.service";
import type { Locale } from "@/lib/i18n/config";
import { getCategoryMeta, formatSecondsToTime } from "@/lib/seo/slugify";
import { UserAvatar } from "@/components/ui/user-avatar";

function getHref(item: PublicContentItem, locale: Locale): string {
  const seg =
    item.contentKind === "video"
      ? "videos"
      : item.contentKind === "news"
      ? "news"
      : "articles";
  return `/${locale}/${seg}/${item.slug}`;
}

function getKindMeta(kind: PublicContentItem["contentKind"], locale: Locale) {
  if (kind === "video") {
    return {
      label: locale === "uz" ? "Video" : locale === "ru" ? "Видео" : "Video",
      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      Icon: Video,
    };
  }
  if (kind === "news") {
    return {
      label: locale === "uz" ? "Yangilik" : locale === "ru" ? "Новость" : "News",
      cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Icon: Newspaper,
    };
  }
  return {
    label: locale === "uz" ? "Maqola" : locale === "ru" ? "Статья" : "Article",
    cls: "bg-[#2dd4bf]/10 text-blue-600 dark:text-[#2dd4bf] border-[#2dd4bf]/25",
    Icon: BookOpen,
  };
}

export function ContentCard({
  item,
  locale,
}: {
  item: PublicContentItem;
  locale: Locale;
}) {
  const href = getHref(item, locale);
  const category = getCategoryMeta(item.category);
  const kindMeta = getKindMeta(item.contentKind, locale);
  const authorHref = `/${locale}/authors/${encodeURIComponent(item.author.handle.replace(/^@/, ""))}`;

  const formattedDate = new Intl.DateTimeFormat(
    locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
    { day: "numeric", month: "short", year: "numeric" }
  ).format(new Date(item.publishedAt));

  return (
    <article className="group flex flex-col justify-between rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] hover:border-[#2dd4bf]/50 transition-all overflow-hidden shadow-xs">
      {/* Media / Cover */}
      <Link href={href} className="relative block aspect-video w-full bg-slate-100 dark:bg-[#16181c] overflow-hidden">
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt={item.coverImageAlt || item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-slate-200/70 dark:from-[#16181c] dark:to-[#000000] text-center">
            <kindMeta.Icon className="w-8 h-8 text-[#2dd4bf]/70 mb-2" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 line-clamp-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md bg-white/90 dark:bg-[#000000]/85 ${kindMeta.cls}`}
          >
            <kindMeta.Icon className="w-3 h-3" />
            {kindMeta.label}
          </span>
        </div>

        {/* Video play overlay + duration */}
        {item.contentKind === "video" && (
          <>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors flex items-center justify-center">
              <div className="size-12 rounded-full bg-[#2dd4bf] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
            {item.videoDurationSeconds ? (
              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-white text-[11px] font-mono font-semibold">
                {formatSecondsToTime(item.videoDurationSeconds)}
              </span>
            ) : null}
          </>
        )}
      </Link>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[#2dd4bf]">{category.label[locale]}</span>
            <time dateTime={item.publishedAt}>{formattedDate}</time>
          </div>

          <Link href={href} className="block">
            <h3 className="text-base font-bold text-slate-950 dark:text-white group-hover:text-[#2dd4bf] transition-colors line-clamp-2 leading-snug">
              {item.title}
            </h3>
          </Link>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {item.excerpt}
          </p>
        </div>

        {/* Footer Author + Stats */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#202327] flex items-center justify-between gap-2">
          <Link href={authorHref} className="flex items-center gap-2 min-w-0 group/author">
            <UserAvatar
              name={item.author.name}
              avatarUrl={item.author.avatarUrl || undefined}
              size="sm"
            />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover/author:underline truncate">
              {item.author.name}
            </span>
            {item.author.verified && (
              <span className="size-3.5 rounded-full bg-[#2dd4bf] text-white flex items-center justify-center shrink-0">
                <Check size={8} strokeWidth={3} />
              </span>
            )}
          </Link>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.readingTimeMinutes} min
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {item.commentsCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {item.viewsCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
