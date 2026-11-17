"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BookOpen, Code2, Compass, HelpCircle, Layers, Terminal, Sparkles } from "lucide-react";

export function PublicNavbar() {
  const { locale, localePath } = useI18n();
  const pathname = usePathname();

  const navLinks = [
    { href: localePath("/hub"), label: locale === "uz" ? "Texnologiyalar" : locale === "ru" ? "Технологии" : "Technologies", icon: Layers },
    { href: localePath("/glossary"), label: locale === "uz" ? "IT Lug'at" : locale === "ru" ? "Глоссарий" : "Glossary", icon: BookOpen },
    { href: localePath("/cheatsheets"), label: locale === "uz" ? "Cheat Sheets" : locale === "ru" ? "Шпаргалки" : "Cheat Sheets", icon: Terminal },
    { href: localePath("/interview-prep"), label: locale === "uz" ? "Intervyu" : locale === "ru" ? "Собеседование" : "Interviews", icon: Code2 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={localePath("/")} className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              The Go-getters
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Developer Hub
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions & Language Switcher */}
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />

          <Link
            href={localePath("/auth/login")}
            className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-foreground hover:bg-muted transition-colors"
          >
            {locale === "uz" ? "Kirish" : locale === "ru" ? "Войти" : "Sign In"}
          </Link>

          <Link
            href={localePath("/dashboard")}
            className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            {locale === "uz" ? "Hamjamiyatga o'tish" : locale === "ru" ? "В сообщество" : "Join Platform"}
          </Link>
        </div>
      </div>
    </header>
  );
}
