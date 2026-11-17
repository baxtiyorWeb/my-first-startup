"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BookOpen, Code2, Layers, Terminal } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={localePath("/")} className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs transition-transform group-hover:scale-105 shrink-0">
            <Image
              src="/logo.png"
              alt="Geters Logo"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Geters
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">
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
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60"
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
            className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {locale === "uz" ? "Kirish" : locale === "ru" ? "Войти" : "Sign In"}
          </Link>

          <Link
            href={localePath("/dashboard")}
            className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            {locale === "uz" ? "Hamjamiyatga o'tish" : locale === "ru" ? "В сообщество" : "Join Platform"}
          </Link>
        </div>
      </div>
    </header>
  );
}
