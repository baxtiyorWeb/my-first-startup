import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import {
  generateBreadcrumbSchema,
  generateTechArticleSchema,
  generateFAQSchema,
} from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { TOPICS_DATA, getTopicBySlug } from "@/lib/seo/data/topics";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  HelpCircle,
  Layers,
  Sparkles,
} from "lucide-react";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of LOCALES) {
    for (const topic of TOPICS_DATA) {
      params.push({ locale, slug: topic.slug });
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

  const topic = getTopicBySlug(slug);
  if (!topic) return {};

  const title = `${topic.title[locale as Locale]} — Arxitektura va Qo'llanma`;
  const description = topic.shortDescription[locale as Locale];
  const canonicalUrl = getCanonicalUrl(`/hub/${slug}`, locale as Locale);
  const alternates = getLanguageAlternates(`/hub/${slug}`);

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

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const typedLocale = locale as Locale;
  const canonicalUrl = getCanonicalUrl(`/hub/${slug}`, typedLocale);

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Texnologiyalar", item: getCanonicalUrl("/hub", typedLocale) },
    { name: topic.title[typedLocale], item: canonicalUrl },
  ]);

  const articleSchema = generateTechArticleSchema({
    headline: topic.title[typedLocale],
    description: topic.shortDescription[typedLocale],
    url: canonicalUrl,
    locale: typedLocale,
    articleBody: topic.fullOverview[typedLocale],
  });

  const faqSchema = generateFAQSchema(topic.faq[typedLocale]);

  const relatedTopics = topic.relatedSlugs
    .map((s) => getTopicBySlug(s))
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
              <Link href={`/${locale}/hub`} className="hover:text-foreground">
                Texnologiyalar
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">
                {topic.title[typedLocale]}
              </span>
            </div>

            {/* Header */}
            <div className="space-y-4 mb-10 pb-8 border-b border-border/60">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{topic.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {topic.category}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {topic.title[typedLocale]}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {topic.shortDescription[typedLocale]}
              </p>
            </div>

            {/* Main Overview */}
            <article className="space-y-10">
              <section className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Umumiy Tahlil va Arxitektura
                </h2>
                <div className="text-sm sm:text-base text-muted-foreground leading-relaxed bg-card/40 p-6 rounded-2xl border border-border/70">
                  {topic.fullOverview[typedLocale]}
                </div>
              </section>

              {/* Key Features */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Asosiy Afzalliklari va Imkoniyatlari
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {topic.keyFeatures[typedLocale].map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/50"
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Code Snippet */}
              {topic.codeSnippet && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-primary" />
                      <span>Amaliy Kod Namunasi</span>
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {topic.codeSnippet.language}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {topic.codeSnippet.description[typedLocale]}
                  </p>
                  <pre className="p-5 rounded-2xl bg-zinc-950 text-zinc-100 text-xs sm:text-sm font-mono overflow-x-auto border border-zinc-800 shadow-lg">
                    <code>{topic.codeSnippet.code}</code>
                  </pre>
                </section>
              )}

              {/* FAQ */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span>Tez-tez So'raladigan Savollar</span>
                </h2>
                <div className="space-y-3">
                  {topic.faq[typedLocale].map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-border/70 bg-card/60"
                    >
                      <h3 className="text-sm font-bold text-foreground">
                        {faq.question}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Related Topics (Internal Linking) */}
              {relatedTopics.length > 0 && (
                <section className="space-y-4 pt-6 border-t border-border/60">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Bog'liq Texnologiyalar
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedTopics.map((rel) => (
                      rel && (
                        <Link
                          key={rel.slug}
                          href={`/${locale}/hub/${rel.slug}`}
                          className="p-4 rounded-xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/40 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{rel.icon}</span>
                            <span className="text-xs font-bold text-foreground">
                              {rel.title[typedLocale].split(":")[0]}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-primary" />
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
