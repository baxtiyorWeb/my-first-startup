import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import {
  generateBreadcrumbSchema,
  generateTechArticleSchema,
} from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { CHEATSHEETS_DATA, getCheatSheetBySlug } from "@/lib/seo/data/cheatsheets";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Lightbulb,
  Sparkles,
  Terminal,
} from "lucide-react";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of LOCALES) {
    for (const item of CHEATSHEETS_DATA) {
      params.push({ locale, slug: item.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) return {};

  const sheet = getCheatSheetBySlug(slug);
  if (!sheet) return {};

  const title = `${sheet.title[locale as Locale]} — To'liq Buyruqlar Qo'llanmasi`;
  const description = sheet.shortDescription[locale as Locale];
  const canonicalUrl = getCanonicalUrl(`/cheatsheets/${slug}`, locale as Locale);
  const alternates = getLanguageAlternates(`/cheatsheets/${slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      type: "article",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function CheatSheetDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const sheet = getCheatSheetBySlug(slug);
  if (!sheet) notFound();

  const typedLocale = locale as Locale;
  const canonicalUrl = getCanonicalUrl(`/cheatsheets/${slug}`, typedLocale);

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Cheat Sheets", item: getCanonicalUrl("/cheatsheets", typedLocale) },
    { name: sheet.title[typedLocale], item: canonicalUrl },
  ]);

  const articleSchema = generateTechArticleSchema({
    headline: sheet.title[typedLocale],
    description: sheet.shortDescription[typedLocale],
    url: canonicalUrl,
    locale: typedLocale,
    articleBody: sheet.overview[typedLocale],
  });

  const relatedSheets = sheet.relatedSlugs
    .map((s) => getCheatSheetBySlug(s))
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <PublicNavbar />

        <main className="flex-1 py-10 md:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb nav */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              <Link href={`/${locale}`} className="hover:text-foreground">
                Asosiy
              </Link>
              <span>/</span>
              <Link href={`/${locale}/cheatsheets`} className="hover:text-foreground">
                Cheat Sheets
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">
                {sheet.title[typedLocale]}
              </span>
            </div>

            {/* Header */}
            <div className="space-y-4 mb-10 pb-8 border-b border-border/60">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Terminal className="h-3.5 w-3.5" />
                <span>{sheet.category}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {sheet.title[typedLocale]}
              </h1>

              <p className="text-base text-muted-foreground leading-relaxed">
                {sheet.overview[typedLocale]}
              </p>
            </div>

            <article className="space-y-12">
              {/* Sections & Commands */}
              {sheet.sections.map((sec, idx) => (
                <section key={idx} className="space-y-4">
                  <h2 className="text-xl font-bold tracking-tight text-foreground pb-2 border-b border-border/50">
                    {sec.title[typedLocale]}
                  </h2>

                  <div className="space-y-4">
                    {sec.commands.map((cmd, cIdx) => (
                      <div
                        key={cIdx}
                        className="rounded-xl border border-border/70 bg-card/50 overflow-hidden"
                      >
                        <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                          <code className="text-xs sm:text-sm font-mono text-emerald-400 font-semibold break-all">
                            {cmd.command}
                          </code>
                        </div>
                        <div className="p-3.5 bg-card/30">
                          <p className="text-xs text-muted-foreground">
                            {cmd.description[typedLocale]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* Best Practice Tips */}
              <section className="p-6 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Lightbulb className="h-5 w-5" />
                  <span>Amaliy Maslahatlar va Xavfsizlik</span>
                </div>
                <div className="space-y-2.5">
                  {sheet.tips[typedLocale].map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-foreground/90">
                        {tip}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Related Cheatsheets */}
              {relatedSheets.length > 0 && (
                <section className="space-y-4 pt-6 border-t border-border/60">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Boshqa Cheat Sheetlar
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedSheets.map((rel) => (
                      rel && (
                        <Link
                          key={rel.slug}
                          href={`/${locale}/cheatsheets/${rel.slug}`}
                          className="p-4 rounded-xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/40 transition-all flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-foreground line-clamp-1">
                            {rel.title[typedLocale]}
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                        </Link>
                      )
                    ))}
                  </div>
                </section>
              )}
            </article>
          </div>
        </main>

        <PublicFooter locale={typedLocale} />
      </div>
    </>
  );
}
