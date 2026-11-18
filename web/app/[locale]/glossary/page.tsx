import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import { generateBreadcrumbSchema } from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { GLOSSARY_DATA } from "@/lib/seo/data/glossary";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

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
      ? "Dasturlash va IT Atamalar Lug'ati (Glossary)"
      : locale === "ru"
      ? "Глоссарий IT-терминов и концепций программирования"
      : "Software Engineering & IT Glossary";

  const description =
    locale === "uz"
      ? "REST API, CI/CD, JWT, Microservices, ORM, WebSockets va boshqa texnik tushunchalarning sodda, professional izohlari."
      : locale === "ru"
      ? "Понятные и профессиональные объяснения REST API, CI/CD, JWT, микросервисов, ORM и WebSockets."
      : "Authoritative, crystal-clear definitions and architectural breakdowns of REST, CI/CD, JWT, Microservices, and ORMs.";

  const canonicalUrl = getCanonicalUrl("/glossary", locale);
  const alternates = getLanguageAlternates("/glossary");

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

export default async function GlossaryCatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const typedLocale = locale as Locale;

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Lug'at", item: getCanonicalUrl("/glossary", typedLocale) },
  ]);

  const dictionary = {
    uz: {
      badge: "Dasturchilar Lug'ati",
      heading: "Dasturlash va IT Atamalari",
      subheading:
        "Dasturiy injiniringda eng ko'p uchraydigan tushunchalar, arxitektura tamoyillari va protokollarning sodda, hayotiy misollar bilan tushuntirilishi.",
      readMore: "Ta'rif va misollar",
    },
    ru: {
      badge: "IT-Глоссарий",
      heading: "Словарь терминов программирования",
      subheading:
        "Простые и практичные объяснения архитектурных паттернов, протоколов и инженерных концепций с жизненными аналогиями.",
      readMore: "Определение и примеры",
    },
    en: {
      badge: "Engineering Glossary",
      heading: "Computer Science & IT Terminology",
      subheading:
        "Rigorous, accessible definitions of fundamental architectural patterns, network protocols, and software paradigms.",
      readMore: "Definition & Code",
    },
  }[typedLocale];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors">
        <PublicNavbar />

        <main className="flex-1 py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="max-w-3xl mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-4 shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{dictionary.badge}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {dictionary.heading}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 mt-3 leading-relaxed font-normal">
                {dictionary.subheading}
              </p>
            </div>

            {/* Glossary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {GLOSSARY_DATA.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${locale}/glossary/${item.slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:shadow-lg dark:hover:bg-zinc-900/80 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        {item.category}
                      </span>
                      <BookOpen className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                    </div>

                    <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.term[typedLocale]}
                    </h2>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2 line-clamp-3 leading-relaxed font-normal">
                      {item.shortDefinition[typedLocale]}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
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
