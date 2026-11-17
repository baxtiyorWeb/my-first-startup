import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateTechArticleSchema,
} from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import {
  INTERVIEW_PREP_DATA,
  getInterviewPrepBySlug,
} from "@/lib/seo/data/interviews";
import {
  ArrowRight,
  Code2,
  HelpCircle,
  Lightbulb,
  Sparkles,
} from "lucide-react";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of LOCALES) {
    for (const item of INTERVIEW_PREP_DATA) {
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

  const prep = getInterviewPrepBySlug(slug);
  if (!prep) return {};

  const title = `${prep.title[locale as Locale]} — Texnik Savol-Javoblar`;
  const description = prep.shortDescription[locale as Locale];
  const canonicalUrl = getCanonicalUrl(`/interview-prep/${slug}`, locale as Locale);
  const alternates = getLanguageAlternates(`/interview-prep/${slug}`);

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

export default async function InterviewPrepDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const prep = getInterviewPrepBySlug(slug);
  if (!prep) notFound();

  const typedLocale = locale as Locale;
  const canonicalUrl = getCanonicalUrl(`/interview-prep/${slug}`, typedLocale);

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Intervyu", item: getCanonicalUrl("/interview-prep", typedLocale) },
    { name: prep.title[typedLocale], item: canonicalUrl },
  ]);

  const faqs = prep.questions.map((q) => ({
    question: q.question[typedLocale],
    answer: q.answer[typedLocale],
  }));

  const faqSchema = generateFAQSchema(faqs);

  const relatedPreps = prep.relatedSlugs
    .map((s) => getInterviewPrepBySlug(s))
    .filter(Boolean);

  const difficultyColors = {
    junior: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    middle: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    senior: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
              <Link href={`/${locale}/interview-prep`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Intervyu
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {prep.title[typedLocale]}
              </span>
            </div>

            {/* Header */}
            <div className="space-y-4 mb-10 pb-8 border-b border-slate-200/80 dark:border-white/10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Code2 className="h-3.5 w-3.5" />
                <span>{prep.level}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {prep.title[typedLocale]}
              </h1>

              <p className="text-base text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                {prep.shortDescription[typedLocale]}
              </p>
            </div>

            {/* Questions List */}
            <article className="space-y-8">
              {prep.questions.map((q, idx) => (
                <section
                  key={idx}
                  className="p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <h2 className="flex-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question[typedLocale]}
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        difficultyColors[q.difficulty]
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-3">
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50/70 dark:bg-zinc-900/40 p-4 rounded-xl border border-slate-200/80 dark:border-white/5 font-normal">
                      <strong className="text-slate-900 dark:text-white block mb-1 font-semibold">
                        Mukammal Javob:
                      </strong>
                      {q.answer[typedLocale]}
                    </div>

                    {q.interviewerTips && (
                      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Intervyuyer siri: </strong>
                          {q.interviewerTips[typedLocale]}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              ))}

              {/* Related Preps */}
              {relatedPreps.length > 0 && (
                <section className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-white/10">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Boshqa Intervyu Qo'llanmalari
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedPreps.map((rel) => (
                      rel && (
                        <Link
                          key={rel.slug}
                          href={`/${locale}/interview-prep/${rel.slug}`}
                          className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {rel.title[typedLocale]}
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
