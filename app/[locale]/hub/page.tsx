import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import { generateBreadcrumbSchema } from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { TOPICS_DATA } from "@/lib/seo/data/topics";
import { ArrowRight, Layers, Sparkles, Terminal } from "lucide-react";

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const title =
    locale === "uz"
      ? "Dasturlash Texnologiyalari va Freymvorklar Katalogi"
      : locale === "ru"
      ? "Каталог технологий программирования и фреймворков"
      : "Developer Technologies & Frameworks Directory";

  const description =
    locale === "uz"
      ? "Next.js, React, Python, TypeScript, PostgreSQL, Docker va AI/LLM texnologiyalari bo'yicha arxitektura va amaliy bilimlar markazi."
      : locale === "ru"
      ? "Архитектура и практические руководства по Next.js, React, Python, TypeScript, PostgreSQL, Docker и AI/LLM."
      : "Authoritative architectural guides and best practices for Next.js, React, Python, TypeScript, PostgreSQL, Docker, and AI/LLMs.";

  const canonicalUrl = getCanonicalUrl("/hub", locale);
  const alternates = getLanguageAlternates("/hub");

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
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function HubCatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const typedLocale = locale as Locale;

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Texnologiyalar", item: getCanonicalUrl("/hub", typedLocale) },
  ]);

  const dictionary = {
    uz: {
      badge: "Dasturchilar Texnologiyalar Hubi",
      heading: "Zamonaviy Dasturlash Texnologiyalari",
      subheading:
        "Ishlab chiqarishda sinovdan o'tgan, yuqori yuklamalarga chidamli freymvorklar, dasturlash tillari va arxitektura tamoyillari.",
      readMore: "Arxitekturani o'rganish",
    },
    ru: {
      badge: "Хаб технологий разработки",
      heading: "Современные технологии программирования",
      subheading:
        "Проверенные в продакшене фреймворки, языки программирования и архитектурные паттерны для высоконагруженных систем.",
      readMore: "Изучить архитектуру",
    },
    en: {
      badge: "Developer Technology Hub",
      heading: "Modern Software Technologies & Toolchains",
      subheading:
        "Production-tested frameworks, modern languages, and architectural patterns engineered for high-scale resilient platforms.",
      readMore: "Explore Architecture",
    },
  }[typedLocale];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <PublicNavbar />

        <main className="flex-1 py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="max-w-3xl mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{dictionary.badge}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {dictionary.heading}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                {dictionary.subheading}
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {TOPICS_DATA.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/${locale}/hub/${topic.slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 hover:shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl">{topic.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                        {topic.category}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {topic.title[typedLocale]}
                    </h2>

                    <p className="text-xs text-muted-foreground mt-2.5 line-clamp-3 leading-relaxed">
                      {topic.shortDescription[typedLocale]}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>{dictionary.readMore}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>

        <PublicFooter locale={typedLocale} />
      </div>
    </>
  );
}
