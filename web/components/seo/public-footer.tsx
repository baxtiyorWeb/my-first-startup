import Link from "next/link";
import Image from "next/image";
import { type Locale } from "@/lib/i18n/config";

export function PublicFooter({ locale }: { locale: Locale }) {
  const dictionary = {
    uz: {
      slogan:
        "O'zbek tilidagi professional IT media, chuqur texnik maqolalar, video darsliklar, yangiliklar va dasturchilar bilim bazasi.",
      media: "Media & Ta'lim",
      articles: "Maqolalar",
      videos: "Video Darsliklar",
      news: "IT Yangiliklar",
      resources: "Bilimlar Bazasi",
      technologies: "Texnologiyalar Hubi",
      glossary: "Dasturlash Lug'ati",
      cheatsheets: "Cheat Sheets",
      interviews: "Intervyu Savollari",
      legal: "Platforma",
      privacy: "Maxfiylik siyosati",
      terms: "Foydalanish shartlari",
      guidelines: "Jamiyat qoidalari",
      help: "Yordam markazi",
      allRights: "Barcha huquqlar himoyalangan.",
    },
    ru: {
      slogan:
        "Профессиональное IT-медиа: технические статьи, видеоуроки, новости индустрии и база знаний для разработчиков.",
      media: "Медиа и Обучение",
      articles: "Статьи",
      videos: "Видеоуроки",
      news: "IT-Новости",
      resources: "База Знаний",
      technologies: "Технологии",
      glossary: "IT-Глоссарий",
      cheatsheets: "Шпаргалки",
      interviews: "Собеседование",
      legal: "Платформа",
      privacy: "Политика конфиденциальности",
      terms: "Условия использования",
      guidelines: "Правила сообщества",
      help: "Центр помощи",
      allRights: "Все права защищены.",
    },
    en: {
      slogan:
        "A premier IT media and developer knowledge platform featuring deep technical articles, video tutorials, industry news, and guides.",
      media: "Media & Tutorials",
      articles: "Articles",
      videos: "Video Tutorials",
      news: "Tech News",
      resources: "Knowledge Base",
      technologies: "Tech Hub",
      glossary: "Tech Glossary",
      cheatsheets: "Cheat Sheets",
      interviews: "Interview Prep",
      legal: "Platform",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      guidelines: "Community Guidelines",
      help: "Help Center",
      allRights: "All rights reserved.",
    },
  }[locale];

  return (
    <footer className="border-t border-slate-200/80 dark:border-[#2f3336] bg-white dark:bg-[#000000] mt-auto transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden border border-slate-200/80 dark:border-[#2f3336] bg-slate-950 shadow-xs shrink-0">
                <Image
                  src="/logo.png"
                  alt="Geters Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Geters
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              {dictionary.slogan}
            </p>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <a href="/rss.xml" className="hover:text-[#1d9bf0] transition-colors">
                RSS Feed
              </a>
              <span>•</span>
              <a href="/sitemap.xml" className="hover:text-[#1d9bf0] transition-colors">
                Sitemap
              </a>
              <span>•</span>
              <a href="/news-sitemap.xml" className="hover:text-[#1d9bf0] transition-colors">
                News XML
              </a>
            </div>
          </div>

          {/* Media & Tutorials */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {dictionary.media}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={`/${locale}/articles`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.articles}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/videos`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.videos}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/news`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.news}
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {dictionary.resources}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={`/${locale}/hub`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.technologies}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/glossary`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.glossary}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cheatsheets`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.cheatsheets}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/interview-prep`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.interviews}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {dictionary.legal}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.terms}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/guidelines`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.guidelines}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/help`}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1d9bf0] transition-colors"
                >
                  {dictionary.help}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200/80 dark:border-[#202327] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Geters. {dictionary.allRights}</p>
          <p>O‘zbekiston IT Hamjamiyati &amp; Ta‘lim Ekotizimi</p>
        </div>
      </div>
    </footer>
  );
}
