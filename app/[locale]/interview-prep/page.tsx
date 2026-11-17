import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import { generateBreadcrumbSchema } from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { INTERVIEW_PREP_DATA } from "@/lib/seo/data/interviews";
import { ArrowRight, Code2, Sparkles } from "lucide-react";

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
      ? "Texnik Intervyu Savollari va Mukammal Javoblar (2026)"
      : locale === "ru"
      ? "Вопросы для технических собеседований: Frontend, Backend, System Design"
      : "Technical Interview Questions: Frontend, Backend & System Design";

  const description =
    locale === "uz"
      ? "Junior, Middle va Senior dasturchilar uchun React, Backend, System Design texnik intervyu savollari tahlili."
      : locale === "ru"
      ? "Разбор вопросов для собеседований по React, Backend и System Design от уровня Junior до Senior."
      : "Rigorous technical interview guides covering React, Backend systems, and System Design.";

  const canonicalUrl = getCanonicalUrl("/interview-prep", locale);
  const alternates = getLanguageAlternates("/interview-prep");

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

export default async function InterviewPrepCatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const typedLocale = locale as Locale;

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Intervyu", item: getCanonicalUrl("/interview-prep", typedLocale) },
  ]);

  const dictionary = {
    uz: {
      badge: "Karyera va Texnik Imtihon",
      heading: "Texnik Intervyu Tayyorgarligi",
      subheading:
        "Yetakchi IT kompaniyalar va startaplarda beriladigan real texnik savollar, arxitektura sirlari va intervyuyer kutadigan mukammal javoblar.",
      viewQuestions: "Savollarni ko'rish",
    },
    ru: {
      badge: "Карьера и собеседования",
      heading: "Подготовка к техническим интервью",
      subheading:
        "Реальные вопросы с собеседований в ведущих IT-компаниях: архитектурные нюансы, подводные камни и идеальные ответы.",
      viewQuestions: "Открыть вопросы",
    },
    en: {
      badge: "Career & Technical Rigor",
      heading: "Technical Interview Mastery",
      subheading:
        "Real interview problems from leading tech companies and high-growth startups with in-depth architectural reasoning.",
      viewQuestions: "Explore Questions",
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {INTERVIEW_PREP_DATA.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${locale}/interview-prep/${item.slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 hover:shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Code2 className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.level}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title[typedLocale]}
                    </h2>

                    <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
                      {item.shortDescription[typedLocale]}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>
                      {dictionary.viewQuestions} ({item.questions.length})
                    </span>
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
