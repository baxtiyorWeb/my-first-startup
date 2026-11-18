"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Bot,
  ArrowLeft,
  Shield,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { localePath, locale } = useI18n();
  const router = useRouter();

  const navItems = [
    {
      title: locale === "uz" ? "Umumiy Ko'rinish" : locale === "ru" ? "Обзор" : "Overview",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "Media Engine",
      href: "/dashboard/admin/media",
      icon: ImageIcon,
    },
    {
      title: locale === "uz" ? "Foydalanuvchilar" : locale === "ru" ? "Пользователи" : "Users & Bots",
      href: "/dashboard/admin/users",
      icon: Users,
    },
    {
      title: locale === "uz" ? "Postlar Moderatsiyasi" : locale === "ru" ? "Модерация постов" : "Posts Moderation",
      href: "/dashboard/admin/posts",
      icon: FileText,
    },
    {
      title: locale === "uz" ? "AI Bot Dvigateli" : locale === "ru" ? "AI Bot Движок" : "AI Bot Engine",
      href: "/dashboard/admin/engine",
      icon: Bot,
    },
  ];

  const isActive = (itemHref: string, exact?: boolean) => {
    const fullHref = localePath(itemHref);
    if (exact) {
      return pathname === fullHref;
    }
    return pathname.startsWith(fullHref);
  };

  const handleLogout = () => {
    logout();
    router.push(localePath("/auth/login"));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-950 transition-transform duration-250 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200/80 dark:border-white/10 shrink-0">
          <Link
            href={localePath("/dashboard/admin")}
            className="flex items-center gap-2.5 group"
            onClick={onClose}
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs shrink-0">
              <Image
                src="/logo.png"
                alt="Geters Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Geters</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                  Admin
                </span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                Control Center
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Back to main platform */}
        <div className="p-3 border-b border-slate-200/60 dark:border-white/5">
          <Link
            href={localePath("/dashboard")}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>
              {locale === "uz"
                ? "Asosiy platformaga qaytish"
                : locale === "ru"
                ? "Вернуться в платформу"
                : "Back to Platform"}
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            {locale === "uz" ? "Boshqaruv Panellari" : locale === "ru" ? "Панели управления" : "Management"}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={localePath(item.href)}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/80"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-white" : "text-slate-500 dark:text-zinc-400"
                  }`}
                />
                <span className="flex-1">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User & Language Bar */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-zinc-900/50 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              {locale === "uz" ? "Til:" : "Язык:"}
            </span>
            <LanguageSwitcher />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5 px-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {session.user?.name || "Admin"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                  {session.user?.role || "ADMIN"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={locale === "uz" ? "Chiqish" : "Выйти"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
