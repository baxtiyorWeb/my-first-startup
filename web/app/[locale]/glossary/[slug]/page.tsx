import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import {
  generateBreadcrumbSchema,
  generateDefinedTermSchema,
  generateTechArticleSchema,
} from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { GLOSSARY_DATA, getGlossaryBySlug } from "@/lib/seo/data/glossary";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Lightbulb,
  Sparkles,
} from "lucide-react";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of LOCALES) {
    for (const item of GLOSSARY_DATA) {
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

  const item = getGlossaryBySlug(slug);
  if (!item) return {};

  const termName = item.term[locale as Locale];
  const title =
    locale === "uz"
      ? `${termName} nima? To'liq tushuntirish va misollar`
      : locale === "ru"
      ? `Что такое ${termName}? Простое объяснение и примеры`
      : `What is ${termName}? In-Depth Guide & Examples`;

  const description = item.shortDefinition[locale as Locale];
  const canonicalUrl = getCanonicalUrl(`/glossary/${slug}`, locale as Locale);
  const alternates = getLanguageAlternates(`/glossary/${slug}`);

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

export default async function GlossaryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const item = getGlossaryBySlug(slug);
  if (!item) notFound();

  const typedLocale = locale as Locale;
  const canonicalUrl = getCanonicalUrl(`/glossary/${slug}`, typedLocale);

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Lug'at", item: getCanonicalUrl("/glossary", typedLocale) },
    { name: item.term[typedLocale], item: canonicalUrl },
  ]);

  const definedTermSchema = generateDefinedTermSchema({
    name: item.term[typedLocale],
    description: item.shortDefinition[typedLocale],
    url: canonicalUrl,
    inDefinedTermSetUrl: getCanonicalUrl("/glossary", typedLocale),
    termCode: item.slug,
  });

  const articleSchema = generateTechArticleSchema({
    headline: `${item.term[typedLocale]} nima?`,
    description: item.shortDefinition[typedLocale],
    url: canonicalUrl,
    locale: typedLocale,
    articleBody: item.detailedExplanation[typedLocale],
  });

  const relatedItems = item.relatedSlugs
    .map((s) => getGlossaryBySlug(s))
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors">
        <PublicNavbar />

        <main className="flex-1 py-10 md:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb nav */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mb-6 font-medium">
              <Link href={`/${locale}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Asosiy
              </Link>
              <span>/</span>
              <Link href={`/${locale}/glossary`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Lug'at
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {item.term[typedLocale]}
              </span>
            </div>

            {/* Header */}
            <div className="space-y-4 mb-10 pb-8 border-b border-slate-200/80 dark:border-white/10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{item.category}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {item.term[typedLocale]}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                {item.shortDefinition[typedLocale]}
              </p>
            </div>

            <article className="space-y-10">
              {/* Analogy Box */}
              <section className="p-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <Lightbulb className="h-5 w-5" />
                  <span>Sodda Hayotiy O'xshatish</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-zinc-200 leading-relaxed italic">
                  "{item.analogy[typedLocale]}"
                </p>
              </section>

              {/* Detailed Breakdown */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Qanday ishlaydi va Nega kerak?
                </h2>
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200/90 dark:border-white/10 text-sm sm:text-base text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                  {item.detailedExplanation[typedLocale]}
                </div>
              </section>

              {/* Code Snippet */}
              {item.codeSnippet && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span>Amaliy Kod Ko'rinishi</span>
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase">
                      {item.codeSnippet.language}
                    </span>
                  </div>
                  <pre className="p-5 rounded-2xl bg-zinc-950 text-zinc-100 text-xs sm:text-sm font-mono overflow-x-auto border border-zinc-800 shadow-lg">
                    <code>{item.codeSnippet.code}</code>
                  </pre>
                </section>
              )}

              {/* Key Takeaways */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Asosiy Xulosalar
                </h2>
                <div className="space-y-2.5">
                  {item.keyTakeaways[typedLocale].map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50"
                    >
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200 font-medium">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Related Terms */}
              {relatedItems.length > 0 && (
                <section className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-white/10">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Bog'liq Atamalar
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedItems.map((rel) => (
                      rel && (
                        <Link
                          key={rel.slug}
                          href={`/${locale}/glossary/${rel.slug}`}
                          className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {rel.term[typedLocale]}
                          </span>
                          <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
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
