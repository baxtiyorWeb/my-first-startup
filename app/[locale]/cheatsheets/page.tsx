import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import { generateBreadcrumbSchema } from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { CHEATSHEETS_DATA } from "@/lib/seo/data/cheatsheets";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";

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
      ? "Dasturchilar Uchun Eng Zarur Cheat Sheetlar"
      : locale === "ru"
      ? "Шпаргалки по программированию: Git, Docker, SQL, Linux"
      : "Developer Cheat Sheets: Git, Docker, SQL, Linux";

  const description =
    locale === "uz"
      ? "Git, Docker, SQL va Linux buyruqlari bo'yicha professional tezkor qo'llanmalar va cheatsheetlar."
      : locale === "ru"
      ? "Полные шпаргалки по Git, Docker, SQL и Linux для разработчиков и DevOps."
      : "High-productivity cheat sheets for Git, Docker, SQL, and Linux commands.";

  const canonicalUrl = getCanonicalUrl("/cheatsheets", locale);
  const alternates = getLanguageAlternates("/cheatsheets");

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

export default async function CheatSheetsCatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const typedLocale = locale as Locale;

  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Asosiy", item: getCanonicalUrl("", typedLocale) },
    { name: "Cheat Sheets", item: getCanonicalUrl("/cheatsheets", typedLocale) },
  ]);

  const dictionary = {
    uz: {
      badge: "Tezkor Ma'lumotnoma",
      heading: "Dasturchilar Cheat Sheetlari",
      subheading:
        "Har kuni terminalda va kod yozishda eng ko'p ishlatiladigan buyruqlar, filtrlar va andozalarning jamlangan qo'llanmasi.",
      viewSheet: "Qo'llanmani ko'rish",
    },
    ru: {
      badge: "Быстрый справочник",
      heading: "Шпаргалки для разработчиков",
      subheading:
        "Сборники ключевых команд для терминала, баз данных и систем контроля версий для ежедневного использования.",
      viewSheet: "Открыть шпаргалку",
    },
    en: {
      badge: "Quick Reference",
      heading: "Developer Command Cheat Sheets",
      subheading:
        "Actionable CLI commands, database query patterns, and operational snippets engineered to boost daily development velocity.",
      viewSheet: "Open Cheat Sheet",
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
              {CHEATSHEETS_DATA.map((sheet) => (
                <Link
                  key={sheet.slug}
                  href={`/${locale}/cheatsheets/${sheet.slug}`}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 hover:shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Terminal className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {sheet.category}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {sheet.title[typedLocale]}
                    </h2>

                    <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
                      {sheet.shortDescription[typedLocale]}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>{dictionary.viewSheet}</span>
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
