import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { SITE_CONFIG, getCanonicalUrl, getLanguageAlternates } from "@/lib/seo/config";
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateFAQSchema,
} from "@/lib/seo/schema";
import { PublicNavbar } from "@/components/seo/public-navbar";
import { PublicFooter } from "@/components/seo/public-footer";
import { TOPICS_DATA } from "@/lib/seo/data/topics";
import { GLOSSARY_DATA } from "@/lib/seo/data/glossary";
import { CHEATSHEETS_DATA } from "@/lib/seo/data/cheatsheets";
import { INTERVIEW_PREP_DATA } from "@/lib/seo/data/interviews";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Zap,
  CheckCircle2,
  Users,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const title =
    locale === "uz"
      ? "The Go-getters — Dasturchilar, Texnologiyalar va Startaplar Ekotizimi"
      : locale === "ru"
      ? "The Go-getters — Экосистема знаний для разработчиков и стартапов"
      : "The Go-getters — Premier Knowledge Ecosystem for Developers & Startups";

  const description = SITE_CONFIG.description[locale];
  const canonicalUrl = getCanonicalUrl("", locale);
  const alternates = getLanguageAlternates("");

  return {
    title,
    description,
    keywords: SITE_CONFIG.keywords[locale],
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
      images: [
        {
          url: "/logo.png",
          width: 512,
          height: 512,
          alt: "The Go-getters Platform",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/logo.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;

  const faqs = [
    {
      question:
        typedLocale === "uz"
          ? "The Go-getters platformasi kimlar uchun mo'ljallangan?"
          : typedLocale === "ru"
          ? "Для кого создана платформа The Go-getters?"
          : "Who is The Go-getters platform designed for?",
      answer:
        typedLocale === "uz"
          ? "Platforma dasturchilar, startap asoschilari, DevOps muhandislari va texnologiya sohasida yuqori natijalarga intiluvchi mutaxassislar uchun bilim almashish va professional o'sish maydonidir."
          : typedLocale === "ru"
          ? "Платформа объединяет разработчиков программного обеспечения, основателей IT-стартапов, архитекторов и инженеров для обмена практическим опытом и профессионального роста."
          : "The platform is engineered for software engineers, startup founders, DevOps specialists, and ambitious tech builders seeking authoritative knowledge and collaborative growth.",
    },
    {
      question:
        typedLocale === "uz"
          ? "Bilimlar bazasi (Knowledge Hub) bepulmi?"
          : typedLocale === "ru"
          ? "База знаний (Knowledge Hub) бесплатна?"
          : "Is the Developer Knowledge Hub free to access?",
      answer:
        typedLocale === "uz"
          ? "Ha, barcha texnologiya qo'llanmalari, IT-glossary, cheatsheetlar va intervyu tayyorgarlik materiallari mutlaqo bepul va barcha uchun ochiq."
          : typedLocale === "ru"
          ? "Да, все технические руководства, шпаргалки, статьи и глоссарий терминов полностью открыты для всех специалистов."
          : "Yes, all technology deep-dives, cheat sheets, developer glossaries, and interview guides are completely free and open to the global developer community.",
    },
    {
      question:
        typedLocale === "uz"
          ? "Platformada qanday texnologiyalar yoritilgan?"
          : typedLocale === "ru"
          ? "Какие технологии освещаются на платформе?"
          : "Which technologies are covered on the platform?",
      answer:
        typedLocale === "uz"
          ? "Next.js 16, React, Python, TypeScript, PostgreSQL, Docker, Git, Linux, Sun'iy intellekt (LLM/Gemini) va System Design yo'nalishlari chuqur tahlil qilingan."
          : typedLocale === "ru"
          ? "Next.js 16, React, TypeScript, Python, PostgreSQL, Docker, Linux, современные LLM/AI модели и системный дизайн распределенных систем."
          : "Next.js 16, React 19, TypeScript, Python, PostgreSQL, Docker, Linux, modern AI/LLMs, and scalable distributed system design.",
    },
  ];

  const websiteSchema = generateWebSiteSchema(typedLocale);
  const organizationSchema = generateOrganizationSchema();
  const faqSchema = generateFAQSchema(faqs);

  const heroTexts = {
    uz: {
      badge: "Dasturchilar va Texnologiya Yetakchilari Markazi",
      titleStart: "Dasturlash, Startaplar va",
      titleHighlight: "Zamonaviy Texnologiyalar",
      titleEnd: "Ekotizimi",
      description:
        "O'zbekiston va jahon dasturchilari uchun professional bilim markazi: eng so'nggi texnologiyalar, IT-lug'at, amaliy cheat sheetlar va texnik intervyu qo'llanmalari.",
      exploreHub: "Bilimlar Hubiga O'tish",
      joinCommunity: "Hamjamiyatga Qo'shilish",
      techHeading: "Zamonaviy Texnologiyalar Katalogi",
      techSub: "Har bir texnologiya bo'yicha chuqur arxitektura va amaliy misollar",
      glossaryHeading: "Dasturlash va IT Atamalar Lug'ati",
      glossarySub: "Murakkab dasturlash tushunchalarining sodda va aniq izohlari",
      cheatsheetsHeading: "Dasturchilar Cheat Sheetlari",
      cheatsheetsSub: "Ishingizni 10x tezlashtiruvchi buyruqlar va andozalar",
      interviewsHeading: "Texnik Intervyu Tayyorgarligi",
      interviewsSub: "Junior'dan Senior'gacha: real intervyu savollari va tahlillari",
      faqHeading: "Ko'p So'raladigan Savollar",
      ctaTitle: "O'z bilimlaringizni yangi bosqichga olib chiqing",
      ctaSub: "Go-getters platformasiga qo'shiling, tajriba almashing va loyihalaringizni kengaytiring.",
      ctaBtn: "Bepul Ro'yxatdan O'tish",
    },
    ru: {
      badge: "Центр знаний для разработчиков и основателей IT",
      titleStart: "Экосистема разработки,",
      titleHighlight: "современных технологий",
      titleEnd: "и стартапов",
      description:
        "Профессиональный центр знаний для инженеров: архитектурные гайды, IT-глоссарий, практические шпаргалки и подготовка к техническим собеседованиям.",
      exploreHub: "Перейти в Базу Знаний",
      joinCommunity: "Войти в Сообщество",
      techHeading: "Каталог современных технологий",
      techSub: "Глубокий разбор архитектуры и примеры внедрения",
      glossaryHeading: "IT-Глоссарий терминов",
      glossarySub: "Понятные объяснения ключевых концепций программирования",
      cheatsheetsHeading: "Шпаргалки для разработчиков",
      cheatsheetsSub: "Справочники команд и сниппетов для повседневной работы",
      interviewsHeading: "Подготовка к собеседованиям",
      interviewsSub: "От Junior до Senior: реальные технические вопросы с разбором",
      faqHeading: "Часто задаваемые вопросы",
      ctaTitle: "Выведите свои инженерные навыки на новый уровень",
      ctaSub: "Присоединяйтесь к Go-getters, делитесь идеями и масштабируйте стартапы.",
      ctaBtn: "Создать аккаунт бесплатно",
    },
    en: {
      badge: "Premier Developer Knowledge & Startup Hub",
      titleStart: "Architecting the Future of",
      titleHighlight: "Modern Software",
      titleEnd: "& Startups",
      description:
        "The authoritative knowledge platform for software engineers: deep technical guides, developer cheat sheets, comprehensive IT glossary, and interview prep.",
      exploreHub: "Explore Knowledge Hub",
      joinCommunity: "Join the Network",
      techHeading: "Modern Technology Directory",
      techSub: "In-depth architecture analysis, code examples, and best practices",
      glossaryHeading: "Developer & IT Glossary",
      glossarySub: "Crystal clear definitions and analogies for complex computer science topics",
      cheatsheetsHeading: "Developer Cheat Sheets",
      cheatsheetsSub: "Quick-reference command sheets to 10x your engineering velocity",
      interviewsHeading: "Technical Interview Preparation",
      interviewsSub: "From Junior to Staff: rigorous technical questions and architecture trade-offs",
      faqHeading: "Frequently Asked Questions",
      ctaTitle: "Elevate your software engineering craft today",
      ctaSub: "Join thousands of ambitious developers, showcase ideas, and scale products on Go-getters.",
      ctaBtn: "Get Started Free",
    },
  }[typedLocale];

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <PublicNavbar />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 border-b border-border/50">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
              <div className="text-center max-w-3xl mx-auto space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{heroTexts.badge}</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                  {heroTexts.titleStart}{" "}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {heroTexts.titleHighlight}
                  </span>{" "}
                  {heroTexts.titleEnd}
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  {heroTexts.description}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href={`/${locale}/hub`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition-all"
                  >
                    <Layers className="h-4 w-4" />
                    <span>{heroTexts.exploreHub}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href={`/${locale}/dashboard`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl border border-border bg-card/60 hover:bg-card text-foreground transition-all"
                  >
                    <Users className="h-4 w-4 text-primary" />
                    <span>{heroTexts.joinCommunity}</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: Technologies & Frameworks */}
          <section className="py-16 md:py-24 border-b border-border/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {heroTexts.techHeading}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {heroTexts.techSub}
                  </p>
                </div>
                <Link
                  href={`/${locale}/hub`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Barchasini ko‘rish</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {TOPICS_DATA.slice(0, 6).map((topic) => (
                  <Link
                    key={topic.slug}
                    href={`/${locale}/hub/${topic.slug}`}
                    className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/40 hover:shadow-lg transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">{topic.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {topic.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {topic.title[typedLocale]}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                        {topic.shortDescription[typedLocale]}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-primary">
                      <span>Batafsil o‘qish</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Developer Glossary */}
          <section className="py-16 md:py-24 bg-card/20 border-b border-border/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {heroTexts.glossaryHeading}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {heroTexts.glossarySub}
                  </p>
                </div>
                <Link
                  href={`/${locale}/glossary`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Lug‘atga o‘tish</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {GLOSSARY_DATA.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/${locale}/glossary/${item.slug}`}
                    className="p-5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {item.category}
                        </span>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">
                        {item.term[typedLocale]}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                        {item.shortDefinition[typedLocale]}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
                      <span>Ta'rif & Misol</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Cheatsheets & Interview */}
          <section className="py-16 md:py-24 border-b border-border/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Cheatsheets */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                        {heroTexts.cheatsheetsHeading}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {heroTexts.cheatsheetsSub}
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/cheatsheets`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Barchasi
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {CHEATSHEETS_DATA.map((sheet) => (
                      <Link
                        key={sheet.slug}
                        href={`/${locale}/cheatsheets/${sheet.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Terminal className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-foreground">
                              {sheet.title[typedLocale]}
                            </h3>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {sheet.shortDescription[typedLocale]}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Interviews */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                        {heroTexts.interviewsHeading}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {heroTexts.interviewsSub}
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/interview-prep`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Barchasi
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {INTERVIEW_PREP_DATA.map((interview) => (
                      <Link
                        key={interview.slug}
                        href={`/${locale}/interview-prep/${interview.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/50 hover:bg-card hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <Code2 className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-foreground">
                              {interview.title[typedLocale]}
                            </h3>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              Daraja: {interview.level} • {interview.questions.length} ta savol
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: FAQ */}
          <section className="py-16 md:py-24 border-b border-border/50 bg-card/10">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10">
                {heroTexts.faqHeading}
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-border/70 bg-card/60"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 5: CTA */}
          <section className="py-16 md:py-20 relative overflow-hidden">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-accent/10 p-8 sm:p-12 text-center shadow-xl">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">
                  {heroTexts.ctaTitle}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto mt-3">
                  {heroTexts.ctaSub}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={`/${locale}/auth/register`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold rounded-xl bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-all"
                  >
                    <span>{heroTexts.ctaBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/${locale}/dashboard`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all"
                  >
                    <span>Dasturchilar Lentasi</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <PublicFooter locale={typedLocale} />
      </div>
    </>
  );
}
