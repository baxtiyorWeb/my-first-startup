import Link from "next/link";
import Image from "next/image";
import { type Locale } from "@/lib/i18n/config";

export function PublicFooter({ locale }: { locale: Locale }) {
  const dictionary = {
    uz: {
      slogan: "Dasturchilar, texnologiya yetakchilari va startap asoschilari uchun professional bilim va ekotizim platformasi.",
      resources: "Resurslar",
      technologies: "Texnologiyalar",
      glossary: "Dasturlash Lug'ati",
      cheatsheets: "Cheat Sheets",
      interviews: "Intervyu Savollari",
      legal: "Huquqiy",
      privacy: "Maxfiylik siyosati",
      terms: "Foydalanish shartlari",
      guidelines: "Jamiyat qoidalari",
      help: "Yordam markazi",
      allRights: "Barcha huquqlar himoyalangan.",
    },
    ru: {
      slogan: "Профессиональная платформа знаний и экосистема для разработчиков, тимлидов и основателей стартапов.",
      resources: "Ресурсы",
      technologies: "Технологии",
      glossary: "IT-Глоссарий",
      cheatsheets: "Шпаргалки",
      interviews: "Собеседование",
      legal: "Правовая информация",
      privacy: "Политика конфиденциальности",
      terms: "Условия использования",
      guidelines: "Правила сообщества",
      help: "Центр помощи",
      allRights: "Все права защищены.",
    },
    en: {
      slogan: "A premier knowledge ecosystem and social platform for software engineers, tech leads, and startup innovators.",
      resources: "Resources",
      technologies: "Technologies",
      glossary: "Tech Glossary",
      cheatsheets: "Cheat Sheets",
      interviews: "Interview Prep",
      legal: "Legal",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      guidelines: "Community Guidelines",
      help: "Help Center",
      allRights: "All rights reserved.",
    },
  }[locale];

  return (
    <footer className="border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-black/90 mt-auto transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs shrink-0">
                <Image
                  src="/logo.png"
                  alt="Geters Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Geters
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-w-sm font-normal">
              {dictionary.slogan}
            </p>
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
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.technologies}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/glossary`}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.glossary}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cheatsheets`}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.cheatsheets}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/interview-prep`}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.terms}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/guidelines`}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.guidelines}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/help`}
                  className="text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {dictionary.help}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-zinc-400 gap-4">
          <p>© 2026 Geters.uz. {dictionary.allRights}</p>
          <p className="flex items-center gap-1.5">
            Crafted for high-performance software engineering & SEO excellence.
          </p>
        </div>
      </div>
    </footer>
  );
}
