import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin, Globe, BookOpen } from "lucide-react";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl } from "@/lib/seo/config";
import { generateBreadcrumbSchema, generatePersonSchema } from "@/lib/seo/schema";
import { getPublicAuthorProfile } from "@/server/modules/content/seo-content.service";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { ContentCard } from "@/components/seo/content-card";
import { UserAvatar } from "@/components/ui/user-avatar";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isValidLocale(locale)) return {};
  const profileData = await getPublicAuthorProfile(handle);
  if (!profileData) {
    return {
      title: "Muallif topilmadi — Geters",
      robots: { index: false, follow: false },
    };
  }

  const { author } = profileData;
  const cleanHandle = author.handle.replace(/^@/, "");
  const canonical = getCanonicalUrl(`/authors/${cleanHandle}`, locale as Locale);
  const title = `${author.name} (@${cleanHandle}) — Geters Muallifi`;
  const description = author.bio || `${author.role} — Geters platformasidagi maqola va yangiliklar muallifi.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      type: "profile",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicAuthorPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  if (!isValidLocale(locale)) notFound();
  const typedLocale = locale as Locale;

  const data = await getPublicAuthorProfile(handle);
  if (!data) notFound();

  const { author, items } = data;
  const cleanHandle = author.handle.replace(/^@/, "");
  const authorUrl = getCanonicalUrl(`/authors/${cleanHandle}`, typedLocale);

  const sameAs = [
    author.socialLinks.github,
    author.socialLinks.linkedin,
    author.socialLinks.twitter,
    author.socialLinks.website,
    author.website,
  ].filter((v): v is string => Boolean(v && v.startsWith("http")));

  const personSchema = generatePersonSchema({
    name: author.name,
    handle: `@${cleanHandle}`,
    description: author.bio || author.role,
    url: authorUrl,
    imageUrl: author.avatarUrl || undefined,
    jobTitle: author.role,
    sameAs,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Bosh sahifa", item: getCanonicalUrl("", typedLocale) },
    { name: "Maqolalar", item: getCanonicalUrl("/articles", typedLocale) },
    { name: author.name, item: authorUrl },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNavbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Author Header Card */}
        <section className="rounded-[20px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <UserAvatar
              name={author.name}
              avatarUrl={author.avatarUrl || undefined}
              size="xl"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white">
                  {author.name}
                </h1>
                {author.verified && (
                  <span
                    className="size-5 rounded-full bg-[#1d9bf0] text-white flex items-center justify-center"
                    title="Tasdiqlangan muallif"
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  @{cleanHandle}
                </span>
              </div>

              <p className="text-sm font-semibold text-[#1d9bf0]">{author.role}</p>

              {author.bio && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  {author.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                {author.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {author.location}
                  </span>
                )}
                {author.website && (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#1d9bf0]"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {author.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {items.length} ta nashr
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/${typedLocale}/dashboard/profile?handle=${encodeURIComponent(cleanHandle)}`}
            className="px-4 py-2.5 rounded-xl bg-[#1d9bf0] hover:bg-blue-600 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Hamjamiyat profiliga o‘tish
          </Link>
        </section>

        {/* Authored Articles / Videos / News */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Muallifning maqola va nashrlari ({items.length})
          </h2>

          {items.length === 0 ? (
            <div className="rounded-[16px] bg-white dark:bg-[#000000] border border-slate-200/90 dark:border-[#2f3336] p-8 text-center text-sm text-slate-500">
              Muallif tomonidan hali ochiq maqolalar nashr qilinmagan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <ContentCard key={item.id} item={item} locale={typedLocale} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter locale={typedLocale} />
    </div>
  );
}
