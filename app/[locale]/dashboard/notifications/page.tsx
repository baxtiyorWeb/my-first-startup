"use client";

import React from "react";
import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export default function NotificationsPage() {
  const { t, localePath } = useI18n();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 space-y-4 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <Bell className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {t("notificationsPage.badge")}
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white tracking-tight">
            {t("notificationsPage.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t("notificationsPage.description")}
          </p>
        </div>

        <div className="pt-3">
          <Link
            href={localePath("/dashboard")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs font-semibold cursor-pointer transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("notificationsPage.backHome")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
