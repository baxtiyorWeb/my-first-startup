"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/auth-context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BookOpen, Newspaper, Layers, PenTool, MessageCircle } from "lucide-react";

export function PublicNavbar() {
  const { locale, localePath } = useI18n();
  const { session } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    {
      href: localePath("/articles"),
      label: locale === "uz" ? "Maqolalar" : locale === "ru" ? "Статьи" : "Articles",
      icon: BookOpen,
    },
    {
      href: localePath("/news"),
      label: locale === "uz" ? "Yangiliklar" : locale === "ru" ? "Новости" : "News",
      icon: Newspaper,
    },
    {
      href: localePath("/hub"),
      label: locale === "uz" ? "Bilimlar Hubi" : locale === "ru" ? "База знаний" : "Knowledge Hub",
      icon: Layers,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-[#2f3336] bg-white/90 dark:bg-[#000000]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
        {/* Logo */}
        <Link href={localePath("/")} className="flex items-center gap-2.5 group shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-slate-200/80 dark:border-[#2f3336] bg-slate-950 shadow-xs transition-transform group-hover:scale-105 shrink-0">
            <Image
              src="/logo.png"
              alt="Geters Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-[#2dd4bf] transition-colors leading-tight">
              Geters
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
              IT Media
            </span>
          </div>
        </Link>

        {/* Primary Media Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href.endsWith("/hub") &&
                (pathname.includes("/glossary") ||
                  pathname.includes("/cheatsheets") ||
                  pathname.includes("/interview-prep")));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-[#0c272c] text-blue-600 dark:text-[#2dd4bf] border border-blue-200/80 dark:border-[#134e4a]"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#16181c]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {session.isAuthenticated && (
            <Link
              href={localePath("/dashboard/messages")}
              aria-label={locale === "uz" ? "Xabarlar" : locale === "ru" ? "Сообщения" : "Messages"}
              title={locale === "uz" ? "Xabarlar" : locale === "ru" ? "Сообщения" : "Messages"}
              className="inline-flex items-center justify-center size-8 sm:size-9 rounded-lg bg-slate-100 dark:bg-[#16181c] border border-slate-200/80 dark:border-[#2f3336] text-slate-700 dark:text-slate-200 hover:text-[#2dd4bf] hover:border-[#2dd4bf]/40 transition-colors shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
            </Link>
          )}

          <Link
            href={localePath("/dashboard")}
            className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#16181c] transition-colors"
          >
            {locale === "uz" ? "Lenta" : locale === "ru" ? "Лента" : "Feed"}
          </Link>

          <Link
            href={localePath("/dashboard/create")}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#2dd4bf] hover:bg-blue-600 text-white shadow-xs transition-colors"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>{locale === "uz" ? "Kontent yozish" : locale === "ru" ? "Написать" : "Publish"}</span>
          </Link>
        </div>
      </div>

      {/* Mobile horizontal scroll sub-nav for crawlability and UX */}
      <div className="lg:hidden border-t border-slate-100 dark:border-[#202327] px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#2dd4bf] text-white"
                  : "bg-slate-100 dark:bg-[#16181c] text-slate-600 dark:text-slate-300"
              }`}
            >
              <Icon className="h-3 w-3" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
