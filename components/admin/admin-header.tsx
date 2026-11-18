"use client";

import React from "react";
import Link from "next/link";
import { Menu, ExternalLink, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onOpenSidebar: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminHeader({
  title,
  subtitle,
  onOpenSidebar,
  onRefresh,
  isRefreshing,
}: AdminHeaderProps) {
  const { localePath, locale } = useI18n();

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md transition-colors flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Burger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="p-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span className="hidden sm:inline">
              {locale === "uz" ? "Yangilash" : locale === "ru" ? "Обновить" : "Refresh"}
            </span>
          </button>
        )}

        <Link
          href={localePath("/dashboard")}
          target="_blank"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <span>{locale === "uz" ? "Platforma" : locale === "ru" ? "Сайт" : "Site"}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}
