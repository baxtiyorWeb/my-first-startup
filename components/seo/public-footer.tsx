import Link from "next/link";
import { type Locale } from "@/lib/i18n/config";
import { Sparkles } from "lucide-react";

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
    <footer className="border-t border-border/70 bg-card/40 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                The Go-getters
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {dictionary.slogan}
            </p>
          </div>

          {/* Developer Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {dictionary.resources}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={`/${locale}/hub`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.technologies}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/glossary`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.glossary}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cheatsheets`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.cheatsheets}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/interview-prep`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.interviews}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {dictionary.legal}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.terms}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/guidelines`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.guidelines}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/help`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {dictionary.help}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>© 2026 The Go-getters. {dictionary.allRights}</p>
          <p className="flex items-center gap-1.5">
            Crafted for high-performance software engineering & SEO excellence.
          </p>
        </div>
      </div>
    </footer>
  );
}
